import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  AmapClient,
  AmapMapProvider,
  AmapWeatherProvider,
  ProviderCache,
} from "@/services/providers";

describe("Amap Providers Unit Tests", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("ProviderCache", () => {
    it("stores, retrieves, and expires entries by TTL", async () => {
      const cache = new ProviderCache(50); // 50ms TTL
      cache.set("test-key", { value: 42 });

      expect(cache.get<{ value: number }>("test-key")?.value).toBe(42);

      await new Promise((resolve) => setTimeout(resolve, 60));
      expect(cache.get("test-key")).toBeNull();
    });

    it("clears all entries", () => {
      const cache = new ProviderCache();
      cache.set("k1", 1);
      cache.set("k2", 2);
      expect(cache.size()).toBe(2);

      cache.clear();
      expect(cache.size()).toBe(0);
    });
  });

  describe("AmapClient", () => {
    it("throws when AMAP_WEB_SERVICE_KEY is missing", async () => {
      const client = new AmapClient({ apiKey: "" });
      expect(client.hasKey()).toBe(false);
      await expect(client.get("direction/walking", {})).rejects.toThrow(
        "AMAP_WEB_SERVICE_KEY is missing or empty",
      );
    });

    it("calls fetch with key and endpoint and returns JSON", async () => {
      const fetchMock = vi.fn(async (input: string | URL | Request) => {
        const url = String(input);
        expect(url).toContain("https://restapi.amap.com/v3/direction/walking");
        expect(url).toContain("key=mock-key");
        expect(decodeURIComponent(url)).toContain("origin=114.1,22.2");
        return {
          ok: true,
          json: async () => ({
            status: "1",
            info: "OK",
            infocode: "10000",
            route: { paths: [{ distance: "1000", duration: "600" }] },
          }),
        } as unknown as Response;
      });

      const client = new AmapClient({ apiKey: "mock-key", fetchFn: fetchMock });
      const res = await client.get<{
        status: string;
        info: string;
        infocode: string;
        route: { paths: Array<{ distance: string; duration: string }> };
      }>("direction/walking", { origin: "114.1,22.2" });

      expect(res.infocode).toBe("10000");
      expect(res.route.paths[0].distance).toBe("1000");
    });

    it("throws when AMap returns error infocode without leaking key", async () => {
      const fetchMock = vi.fn(async () => {
        return {
          ok: true,
          json: async () => ({
            status: "0",
            info: "INVALID_USER_KEY",
            infocode: "10001",
          }),
        } as unknown as Response;
      });

      const client = new AmapClient({ apiKey: "mock-key-secret", fetchFn: fetchMock });
      await expect(client.get("direction/walking", {})).rejects.toThrow(
        "AMap API Error: INVALID_USER_KEY (code: 10001)",
      );
    });
  });

  describe("AmapMapProvider", () => {
    const places = new Map([
      ["p-1", { lat: 22.5155, lng: 114.0673, name: "福田口岸" }],
      ["p-2", { lat: 22.2774, lng: 114.1595, name: "花园道总站" }],
    ]);

    it("gracefully falls back to MOCK estimate when client has no key", async () => {
      const provider = new AmapMapProvider({
        client: new AmapClient({ apiKey: "" }),
        placeResolver: (id) => places.get(id),
      });

      const result = await provider.route({
        fromPlaceId: "p-1",
        toPlaceId: "p-2",
        mode: "TRANSIT",
      });

      expect(result.status).toBe("MOCK");
      expect(result.dataMode).toBe("DEMO");
      expect(result.distanceMeters).toBeGreaterThan(0);
      expect(result.durationMinutes).toBeGreaterThan(0);
    });

    it("parses walking response into VERIFIED RouteResult", async () => {
      const fetchMock = vi.fn(async () => {
        return {
          ok: true,
          json: async () => ({
            status: "1",
            info: "OK",
            infocode: "10000",
            route: {
              paths: [{ distance: "850", duration: "680" }],
            },
          }),
        } as unknown as Response;
      });

      const client = new AmapClient({ apiKey: "mock-key", fetchFn: fetchMock });
      const provider = new AmapMapProvider({
        client,
        cache: new ProviderCache(),
        placeResolver: (id) => places.get(id),
      });

      const result = await provider.route({
        fromPlaceId: "p-1",
        toPlaceId: "p-2",
        mode: "WALK",
      });

      expect(result.status).toBe("VERIFIED");
      expect(result.dataMode).toBe("LIVE_PARTIAL");
      expect(result.distanceMeters).toBe(850);
      expect(result.durationMinutes).toBe(12); // ceil(680/60)
      expect(result.walkMeters).toBe(850);
    });

    it("parses transit response into VERIFIED RouteResult with transfers", async () => {
      const fetchMock = vi.fn(async () => {
        return {
          ok: true,
          json: async () => ({
            status: "1",
            info: "OK",
            infocode: "10000",
            route: {
              transits: [
                {
                  duration: "2400",
                  distance: "32000",
                  walking_distance: "450",
                  segments: [
                    { bus: { buslines: [{ name: "港铁东铁线" }] } },
                    { bus: { buslines: [{ name: "港铁港岛线" }] } },
                  ],
                },
              ],
            },
          }),
        } as unknown as Response;
      });

      const client = new AmapClient({ apiKey: "mock-key", fetchFn: fetchMock });
      const provider = new AmapMapProvider({
        client,
        cache: new ProviderCache(),
        placeResolver: (id) => places.get(id),
      });

      const result = await provider.route({
        fromPlaceId: "p-1",
        toPlaceId: "p-2",
        mode: "TRANSIT",
      });

      expect(result.status).toBe("VERIFIED");
      expect(result.dataMode).toBe("LIVE_PARTIAL");
      expect(result.distanceMeters).toBe(32000);
      expect(result.durationMinutes).toBe(40);
      expect(result.walkMeters).toBe(450);
      expect(result.transfers).toBe(1); // 2 buslines -> 1 transfer
    });
  });

  describe("AmapWeatherProvider", () => {
    it("gracefully falls back to MOCK when client has no key", async () => {
      const provider = new AmapWeatherProvider({
        client: new AmapClient({ apiKey: "" }),
      });

      const result = await provider.getForecast({
        placeId: "hk-victoria-peak",
        date: "2026-09-04",
      });

      expect(result.status).toBe("MOCK");
      expect(result.dataMode).toBe("DEMO");
      expect(result.summary).toContain("离线天气备选");
    });

    it("parses live weather into VERIFIED ForecastResult and detects rain/storm", async () => {
      const fetchMock = vi.fn(async () => {
        return {
          ok: true,
          json: async () => ({
            status: "1",
            info: "OK",
            infocode: "10000",
            forecasts: [
              {
                city: "香港",
                adcode: "810000",
                casts: [
                  {
                    date: "2026-09-04",
                    dayweather: "雷暴",
                    nightweather: "大雨",
                    daytemp: "30",
                    nighttemp: "25",
                  },
                ],
              },
            ],
          }),
        } as unknown as Response;
      });

      const client = new AmapClient({ apiKey: "mock-key", fetchFn: fetchMock });
      const provider = new AmapWeatherProvider({
        client,
        cache: new ProviderCache(),
      });

      const result = await provider.getForecast({
        placeId: "hk-victoria-peak",
        date: "2026-09-04",
      });

      expect(result.status).toBe("VERIFIED");
      expect(result.dataMode).toBe("LIVE_PARTIAL");
      expect(result.condition).toBe("STORM");
      expect(result.summary).toContain("雷暴转大雨");
    });
  });
});
