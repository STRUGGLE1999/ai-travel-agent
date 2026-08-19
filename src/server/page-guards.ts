import type { Trip } from "@/domain";
import type { Repositories } from "@/server/repositories/types";
import { getSessionIdReadOnly } from "@/server/session";

/**
 * Page-level ownership guard: a trip is only readable by the anonymous
 * session that created it. Returns null (callers render notFound) for
 * missing trips, missing sessions or foreign sessions alike, so the
 * response does not reveal whether a trip ID exists.
 */
export async function getOwnedTrip(
  repos: Repositories,
  tripId: string,
): Promise<Trip | null> {
  const sessionId = await getSessionIdReadOnly();
  if (!sessionId) {
    return null;
  }
  const trip = await repos.trips.getById(tripId);
  if (!trip || trip.sessionId !== sessionId) {
    return null;
  }
  return trip;
}
