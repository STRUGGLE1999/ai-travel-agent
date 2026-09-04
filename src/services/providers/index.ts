export * from "./types";
export * from "./amap-client";
export * from "./provider-cache";
export * from "./amap-map-provider";
export * from "./amap-weather-provider";

import { AmapClient } from "./amap-client";
import { AmapMapProvider, type AmapMapProviderOptions } from "./amap-map-provider";
import { AmapWeatherProvider, type AmapWeatherProviderOptions } from "./amap-weather-provider";
import { globalProviderCache } from "./provider-cache";
import type { MapProvider, WeatherProvider } from "./types";

export function createMapProvider(options: AmapMapProviderOptions = {}): MapProvider {
  const client = options.client ?? new AmapClient();
  const cache = options.cache ?? globalProviderCache;
  return new AmapMapProvider({
    client,
    cache,
    placeResolver: options.placeResolver,
  });
}

export function createWeatherProvider(options: AmapWeatherProviderOptions = {}): WeatherProvider {
  const client = options.client ?? new AmapClient();
  const cache = options.cache ?? globalProviderCache;
  return new AmapWeatherProvider({
    client,
    cache,
  });
}
