import type {
  ForecastInput,
  ForecastResult,
  WeatherProvider,
} from "./types";
import { AmapClient } from "./amap-client";
import { ProviderCache, globalProviderCache } from "./provider-cache";

export interface AmapWeatherProviderOptions {
  client?: AmapClient;
  cache?: ProviderCache;
}

interface WeatherCast {
  date?: string;
  dayweather?: string;
  nightweather?: string;
  daytemp?: string;
  nighttemp?: string;
  daywind?: string;
  daypower?: string;
}

interface WeatherResponse {
  status: string;
  info: string;
  infocode: string;
  forecasts?: Array<{
    city?: string;
    adcode?: string;
    province?: string;
    reporttime?: string;
    casts?: WeatherCast[];
  }>;
}

const CITY_ADCODES: Record<string, string> = {
  香港: "810000",
  HongKong: "810000",
  HK: "810000",
  北京: "110000",
  Beijing: "110000",
  深圳: "440300",
  Shenzhen: "440300",
  上海: "310000",
  Shanghai: "310000",
  广州: "440100",
  Guangzhou: "440100",
};

export class AmapWeatherProvider implements WeatherProvider {
  private readonly client: AmapClient;
  private readonly cache: ProviderCache;

  constructor(options: AmapWeatherProviderOptions = {}) {
    this.client = options.client ?? new AmapClient();
    this.cache = options.cache ?? globalProviderCache;
  }

  public async getForecast(input: ForecastInput): Promise<ForecastResult> {
    const city = input.city || (input.placeId.startsWith("hk-") ? "香港" : "北京");
    const adcode = input.adcode || CITY_ADCODES[city] || "810000";
    const cacheKey = `weather:${adcode}:${input.date}`;

    const cached = this.cache.get<ForecastResult>(cacheKey);
    if (cached) {
      return cached;
    }

    const nowIso = new Date().toISOString();

    if (!this.client.hasKey()) {
      return this.createFallbackForecast(input, city);
    }

    try {
      const data = await this.client.get<WeatherResponse>("weather/weatherInfo", {
        city: adcode,
        extensions: "all",
      });

      const forecast = data.forecasts?.[0];
      const casts = forecast?.casts ?? [];

      // Find cast for target date, or use first day as fallback
      const targetCast =
        casts.find((c) => c.date === input.date) ?? casts[0];

      if (targetCast && targetCast.dayweather) {
        const weatherDesc = `${targetCast.dayweather}转${targetCast.nightweather || targetCast.dayweather}，气温 ${targetCast.nighttemp || "?"}~${targetCast.daytemp || "?"}℃`;
        const condition = this.parseCondition(
          targetCast.dayweather,
          targetCast.nightweather,
        );

        const result: ForecastResult = {
          condition,
          summary: `${city} ${targetCast.date || input.date}：${weatherDesc}`,
          sourceName: "高德地图 Web 服务 API (气象预报)",
          checkedAt: nowIso,
          dataMode: "LIVE_PARTIAL",
          status: "VERIFIED",
        };

        this.cache.set(cacheKey, result);
        return result;
      }
    } catch {
      // Degrade gracefully on network failure
    }

    return this.createFallbackForecast(input, city);
  }

  private parseCondition(
    dayWeather: string = "",
    nightWeather: string = "",
  ): "SUNNY" | "RAIN" | "STORM" {
    const combined = `${dayWeather}${nightWeather}`;
    if (
      combined.includes("暴雨") ||
      combined.includes("大暴雨") ||
      combined.includes("特大暴雨") ||
      combined.includes("雷暴") ||
      combined.includes("强对流")
    ) {
      return "STORM";
    }
    if (
      combined.includes("雨") ||
      combined.includes("阵雨") ||
      combined.includes("小雨") ||
      combined.includes("中雨")
    ) {
      return "RAIN";
    }
    return "SUNNY";
  }

  private createFallbackForecast(
    input: ForecastInput,
    city: string,
  ): ForecastResult {
    // Deterministic fallback based on placeId or date
    const placeIdStr = String(input.placeId || "");
    const dateStr = String(input.date || "");
    const isStormSimulation = placeIdStr.includes("storm") || dateStr.includes("storm");
    return {
      condition: isStormSimulation ? "STORM" : "SUNNY",
      summary: `${city} ${dateStr || "今日"}：多云转晴，气温 22~28℃ (离线天气备选)`,
      sourceName: "确定性气象引擎 (离线基准)",
      checkedAt: new Date().toISOString(),
      dataMode: "DEMO",
      status: "MOCK",
    };
  }
}
