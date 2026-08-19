import { HONG_KONG_FIXTURE } from "@/fixtures/hong-kong/data";
import { BEIJING_FIXTURE } from "@/fixtures/beijing/data";
import type { TripFixture } from "@/fixtures/types";

export const FIXTURES: Record<string, TripFixture> = {
  "hong-kong": HONG_KONG_FIXTURE,
  beijing: BEIJING_FIXTURE,
};

export function getFixture(fixtureId: string | null): TripFixture | null {
  if (!fixtureId) {
    return null;
  }
  return FIXTURES[fixtureId] ?? null;
}

export { HONG_KONG_FIXTURE, BEIJING_FIXTURE };
export * from "@/fixtures/types";
