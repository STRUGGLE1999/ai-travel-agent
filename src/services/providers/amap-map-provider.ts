import type {
  MapProvider,
  PlaceResult,
  RouteInput,
  RouteResult,
} from "./types";
import { AmapClient } from "./amap-client";
import { ProviderCache, globalProviderCache } from "./provider-cache";

export interface AmapMapProviderOptions {
  client?: AmapClient;
  cache?: ProviderCache;
  placeResolver?: (placeId: string) => { lat: number; lng: number; name?: string } | undefined;
}

interface WalkingResponse {
  status: string;
  info: string;
  infocode: string;
  route?: {
    paths?: Array<{
      distance?: string;
      duration?: string;
    }>;
  };
}

interface TransitResponse {
  status: string;
  info: string;
  infocode: string;
  route?: {
    distance?: string;
    transits?: Array<{
      duration?: string;
      distance?: string;
      walking_distance?: string;
      segments?: Array<{
        bus?: {
          buslines?: Array<unknown>;
        };
      }>;
    }>;
  };
}

interface DrivingResponse {
  status: string;
  info: string;
  infocode: string;
  route?: {
    paths?: Array<{
      distance?: string;
      duration?: string;
    }>;
  };
}

interface GeocodeResponse {
  status: string;
  info: string;
  infocode: string;
  geocodes?: Array<{
    location?: string;
    formatted_address?: string;
  }>;
}

/** Haversine formula to compute great-circle distance in meters */
function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000; // meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export class AmapMapProvider implements MapProvider {
  private readonly client: AmapClient;
  private readonly cache: ProviderCache;
  private readonly placeResolver?: (placeId: string) => { lat: number; lng: number; name?: string } | undefined;

  constructor(options: AmapMapProviderOptions = {}) {
    this.client = options.client ?? new AmapClient();
    this.cache = options.cache ?? globalProviderCache;
    this.placeResolver = options.placeResolver;
  }

  public async route(input: RouteInput): Promise<RouteResult> {
    const cacheKey = `route:${input.mode}:${input.fromPlaceId}:${input.toPlaceId}`;
    const cached = this.cache.get<RouteResult>(cacheKey);
    if (cached) {
      return cached;
    }

    // Resolve coordinates
    const fromCoord =
      input.fromCoord ?? (this.placeResolver ? this.placeResolver(input.fromPlaceId) : undefined);
    const toCoord =
      input.toCoord ?? (this.placeResolver ? this.placeResolver(input.toPlaceId) : undefined);

    if (!fromCoord || !toCoord) {
      // Cannot calculate without coordinates; return fallback
      return this.createFallbackResult(input, 1500, 20);
    }

    if (!this.client.hasKey()) {
      return this.createEstimatedResult(input, fromCoord, toCoord);
    }

    const origin = `${fromCoord.lng.toFixed(6)},${fromCoord.lat.toFixed(6)}`;
    const destination = `${toCoord.lng.toFixed(6)},${toCoord.lat.toFixed(6)}`;
    const nowIso = new Date().toISOString();

    try {
      if (input.mode === "WALK") {
        const data = await this.client.get<WalkingResponse>("direction/walking", {
          origin,
          destination,
        });

        const path = data.route?.paths?.[0];
        const distanceMeters = path?.distance ? parseInt(path.distance, 10) : 0;
        const durationSec = path?.duration ? parseInt(path.duration, 10) : 0;
        const durationMinutes = Math.max(1, Math.ceil(durationSec / 60));

        const result: RouteResult = {
          durationMinutes,
          distanceMeters,
          transfers: 0,
          walkMeters: distanceMeters,
          sourceName: "高德地图 Web 服务 API (步行路线规划)",
          checkedAt: nowIso,
          dataMode: "LIVE_PARTIAL",
          status: "VERIFIED",
        };

        this.cache.set(cacheKey, result);
        return result;
      }

      if (input.mode === "TRANSIT" || input.mode === "TRAM" || input.mode === "FERRY") {
        const city = input.city || "香港";
        const data = await this.client.get<TransitResponse>("direction/transit/integrated", {
          origin,
          destination,
          city,
        });

        const transit = data.route?.transits?.[0];
        if (transit) {
          const durationSec = transit.duration ? parseInt(transit.duration, 10) : 0;
          const durationMinutes = Math.max(1, Math.ceil(durationSec / 60));
          const distanceMeters = transit.distance ? parseInt(transit.distance, 10) : 0;
          const walkMeters = transit.walking_distance
            ? parseInt(transit.walking_distance, 10)
            : 0;

          const busLegs =
            transit.segments?.filter((s) => s.bus?.buslines && s.bus.buslines.length > 0) ?? [];
          const transfers = Math.max(0, busLegs.length - 1);

          const result: RouteResult = {
            durationMinutes,
            distanceMeters,
            transfers,
            walkMeters,
            sourceName: "高德地图 Web 服务 API (公交地铁综合规划)",
            checkedAt: nowIso,
            dataMode: "LIVE_PARTIAL",
            status: "VERIFIED",
          };

          this.cache.set(cacheKey, result);
          return result;
        }
      }

      // TAXI / CAR / Driving
      const drivingData = await this.client.get<DrivingResponse>("direction/driving", {
        origin,
        destination,
      });

      const path = drivingData.route?.paths?.[0];
      const distanceMeters = path?.distance ? parseInt(path.distance, 10) : 0;
      const durationSec = path?.duration ? parseInt(path.duration, 10) : 0;
      const durationMinutes = Math.max(1, Math.ceil(durationSec / 60));

      const result: RouteResult = {
        durationMinutes,
        distanceMeters,
        transfers: 0,
        walkMeters: 0,
        sourceName: "高德地图 Web 服务 API (驾车路线规划)",
        checkedAt: nowIso,
        dataMode: "LIVE_PARTIAL",
        status: "VERIFIED",
      };

      this.cache.set(cacheKey, result);
      return result;
    } catch {
      // Graceful degradation on network timeout / failure
      return this.createEstimatedResult(input, fromCoord, toCoord);
    }
  }

  public async geocode(query: string): Promise<PlaceResult> {
    const cacheKey = `geocode:${query}`;
    const cached = this.cache.get<PlaceResult>(cacheKey);
    if (cached) return cached;

    const nowIso = new Date().toISOString();

    if (!this.client.hasKey()) {
      return {
        placeId: `geo-${query}`,
        name: query,
        lat: 22.3,
        lng: 114.17,
        sourceName: "确定性地理估算 (降级备选)",
        checkedAt: nowIso,
        dataMode: "DEMO",
        status: "MOCK",
      };
    }

    try {
      const data = await this.client.get<GeocodeResponse>("geocode/geo", {
        address: query,
      });

      const first = data.geocodes?.[0];
      if (first && first.location) {
        const [lngStr, latStr] = first.location.split(",");
        const result: PlaceResult = {
          placeId: `amap-geo-${query}`,
          name: first.formatted_address || query,
          lat: parseFloat(latStr),
          lng: parseFloat(lngStr),
          sourceName: "高德地图 Web 服务 API (地理编码)",
          checkedAt: nowIso,
          dataMode: "LIVE_PARTIAL",
          status: "VERIFIED",
        };
        this.cache.set(cacheKey, result);
        return result;
      }
    } catch {
      // Fallback
    }

    return {
      placeId: `geo-${query}`,
      name: query,
      lat: 22.3,
      lng: 114.17,
      sourceName: "确定性地理估算 (降级备选)",
      checkedAt: nowIso,
      dataMode: "DEMO",
      status: "MOCK",
    };
  }

  private createEstimatedResult(
    input: RouteInput,
    from: { lat: number; lng: number },
    to: { lat: number; lng: number },
  ): RouteResult {
    const straightDistance = calculateHaversineDistance(from.lat, from.lng, to.lat, to.lng);
    // Real travel distance is typically ~1.3x Euclidean distance due to street grid
    const roadDistance = Math.round(straightDistance * 1.35);

    let durationMinutes = 15;
    let walkMeters = 0;
    let transfers = 0;

    if (input.mode === "WALK") {
      // Walking speed ~ 4.5 km/h (75 m/min)
      durationMinutes = Math.max(1, Math.ceil(roadDistance / 75));
      walkMeters = roadDistance;
    } else if (input.mode === "TRANSIT" || input.mode === "TRAM" || input.mode === "FERRY") {
      // Transit speed ~ 25 km/h + 8 min waiting/transfer
      durationMinutes = Math.max(5, Math.ceil(roadDistance / 400) + 8);
      walkMeters = Math.min(800, Math.round(roadDistance * 0.15));
      transfers = roadDistance > 10000 ? 2 : roadDistance > 4000 ? 1 : 0;
    } else {
      // Taxi / Car: speed ~ 30 km/h + 3 min boarding
      durationMinutes = Math.max(5, Math.ceil(roadDistance / 500) + 3);
      walkMeters = 0;
    }

    return {
      durationMinutes,
      distanceMeters: roadDistance,
      transfers,
      walkMeters,
      sourceName: "确定性测距引擎 (离线基准测算)",
      checkedAt: new Date().toISOString(),
      dataMode: "DEMO",
      status: "MOCK",
    };
  }

  private createFallbackResult(
    input: RouteInput,
    dist: number,
    dur: number,
  ): RouteResult {
    return {
      durationMinutes: dur,
      distanceMeters: dist,
      transfers: 0,
      walkMeters: input.mode === "WALK" ? dist : 0,
      sourceName: "默认路线基准 (降级备选)",
      checkedAt: new Date().toISOString(),
      dataMode: "DEMO",
      status: "MOCK",
    };
  }
}
