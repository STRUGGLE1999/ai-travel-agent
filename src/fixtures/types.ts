import type {
  ExtractConstraintsOutput,
  PlanItemType,
  TransportMode,
} from "@/domain";

export interface FixturePlace {
  placeId: string;
  name: string;
  lat: number;
  lng: number;
  /** 0-100 normalized coordinates for the schematic SVG map. */
  mapX: number;
  mapY: number;
  category: string;
  indoor: boolean;
  openingHours: { open: string; close: string } | null;
  address: string | null;
  accessibility: string | null;
  sourceName: string;
  sourceUrl: string;
}

export interface FixtureRoute {
  from: string;
  to: string;
  mode: TransportMode;
  durationMinutes: number;
  distanceMeters: number;
  transfers: number;
  walkMeters: number;
}

export interface FixtureTicketOption {
  id: string;
  name: string;
  placeId: string;
  price: number | null;
  currency: string;
  includes: string[];
  /** true if the ticket covers the descent leg (e.g. tram return). */
  coversDescent: boolean;
  notes: string;
}

export interface FixturePlanTemplateItem {
  key: string;
  day: number;
  start: string;
  end: string;
  type: PlanItemType;
  title: string;
  placeId?: string;
  transportMode?: TransportMode;
  notes?: string;
  locked?: boolean;
  outdoor?: boolean;
  /** role markers used by the deterministic change engine. */
  role?:
    | "ENTRY_PORT"
    | "EXIT_PORT"
    | "DESCENT"
    | "RETURN_FLIGHT"
    | "LUGGAGE"
    | "TO_AIRPORT"
    | "DAY5_SIGHT";
}

export interface FixtureBookingTaskTemplate {
  key: string;
  title: string;
  placeId: string | null;
  usageDay: number;
  suggestedTimeWindow: string | null;
  ticketType: string | null;
  partySize: number | null;
  reservationRule: string | null;
  sourceName: string;
  sourceUrl: string;
}

export interface FixtureWeather {
  date: string;
  condition: "SUNNY" | "RAIN" | "STORM";
  summary: string;
}

export interface TripFixture {
  fixtureId: "hong-kong" | "beijing";
  title: string;
  destination: string;
  timezone: string;
  /** Base calendar date of day 1 (YYYY-MM-DD). */
  startDate: string;
  days: number;
  demoSourceText: string;
  extraction: ExtractConstraintsOutput;
  places: FixturePlace[];
  routes: FixtureRoute[];
  tickets: FixtureTicketOption[];
  planTemplate: FixturePlanTemplateItem[];
  bookingTasks: FixtureBookingTaskTemplate[];
  rainyAlternatives: Record<string, string>;
  weather: FixtureWeather[];
}

export function findRoute(
  fixture: TripFixture,
  from: string,
  to: string,
  mode?: TransportMode,
): FixtureRoute | null {
  return (
    fixture.routes.find(
      (route) =>
        ((route.from === from && route.to === to) ||
          (route.from === to && route.to === from)) &&
        (mode === undefined || route.mode === mode),
    ) ?? null
  );
}

export function findPlace(
  fixture: TripFixture,
  placeId: string,
): FixturePlace | null {
  return fixture.places.find((place) => place.placeId === placeId) ?? null;
}

export function dateForDay(fixture: TripFixture, day: number): string {
  const base = new Date(`${fixture.startDate}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() + (day - 1));
  return base.toISOString().slice(0, 10);
}
