import type { DataMode, VerificationStatus } from "@/domain/enums";

export interface PlaceResult {
  placeId: string;
  name: string;
  lat: number;
  lng: number;
  sourceName: string;
  checkedAt: string;
  dataMode: DataMode;
  status: VerificationStatus;
}

export interface RouteInput {
  fromPlaceId: string;
  toPlaceId: string;
  mode: "WALK" | "TRANSIT" | "TAXI" | "FERRY" | "TRAM" | "CAR";
}

export interface RouteResult {
  durationMinutes: number;
  distanceMeters: number;
  transfers: number;
  walkMeters: number;
  sourceName: string;
  checkedAt: string;
  dataMode: DataMode;
  status: VerificationStatus;
}

export interface MapProvider {
  geocode(query: string): Promise<PlaceResult>;
  route(input: RouteInput): Promise<RouteResult>;
}

export interface PlaceFacts {
  placeId: string;
  openingHours: string | null;
  address: string | null;
  accessibility: string | null;
  sourceName: string;
  sourceUrl: string | null;
  checkedAt: string;
  dataMode: DataMode;
  status: VerificationStatus;
}

export interface PlaceInfoProvider {
  getPlaceFacts(placeId: string, date: string): Promise<PlaceFacts>;
}

export interface ForecastInput {
  placeId: string;
  date: string;
}

export interface ForecastResult {
  condition: "SUNNY" | "RAIN" | "STORM" | "UNKNOWN";
  summary: string;
  sourceName: string;
  checkedAt: string;
  dataMode: DataMode;
  status: VerificationStatus;
}

export interface WeatherProvider {
  getForecast(input: ForecastInput): Promise<ForecastResult>;
}

export interface InventoryQuery {
  placeId: string;
  date: string;
  productType: string;
}

export interface InventoryOption {
  id: string;
  name: string;
  price: number | null;
  currency: string;
  includes: string[];
  inStock: boolean | null;
}

export interface InventoryResult {
  options: InventoryOption[];
  sourceName: string;
  checkedAt: string;
  dataMode: DataMode;
  status: VerificationStatus;
}

export interface InventoryProvider {
  getOptions(input: InventoryQuery): Promise<InventoryResult>;
}

export interface OfficialSourceResult {
  title: string;
  url: string;
  reservationRule: string | null;
  sourceName: string;
  checkedAt: string;
  dataMode: DataMode;
  status: VerificationStatus;
}

export interface OfficialSourceProvider {
  getReservationRule(placeId: string): Promise<OfficialSourceResult>;
}

export interface ProviderResultMeta {
  sourceName: string;
  checkedAt: string;
  dataMode: DataMode;
  status: VerificationStatus;
}
