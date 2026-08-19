import { beforeEach, describe, expect, it } from "vitest";
import {
  createMemoryRepositories,
  resetMemoryStore,
} from "@/server/repositories/memory";
import {
  applyChange,
  confirmConstraintsAndPlan,
  confirmVersion,
  createDemoTrip,
  deleteConstraint,
  mustGetTrip,
  previewChange,
  selectTicket,
  TripAccessDeniedError,
  updateBookingTaskStatus,
  updateConstraint,
} from "@/application/use-cases";
import type { ActorContext } from "@/application/use-cases";

describe("P1-1: trip ownership guard between anonymous sessions", () => {
  let sessionA: ActorContext;
  let sessionB: ActorContext;

  beforeEach(() => {
    resetMemoryStore();
    const repos = createMemoryRepositories();
    sessionA = { repos, sessionId: "session-A", ipHash: null };
    sessionB = { repos, sessionId: "session-B", ipHash: null };
  });

  async function setupOwnedTrip() {
    const trip = await createDemoTrip(sessionA, "hong-kong");
    const constraints = await sessionA.repos.constraints.listByTrip(trip.id);
    for (const constraint of constraints) {
      if (constraint.needsConfirmation) {
        await updateConstraint(sessionA, {
          tripId: trip.id,
          constraintId: constraint.id,
          patch: { needsConfirmation: false, locked: true },
        });
      }
    }
    const { planVersionId } = await confirmConstraintsAndPlan(
      sessionA,
      trip.id,
    );
    return { trip, planVersionId };
  }

  it("session B cannot read session A's trip", async () => {
    const { trip } = await setupOwnedTrip();
    await expect(mustGetTrip(sessionB, trip.id)).rejects.toBeInstanceOf(
      TripAccessDeniedError,
    );
    // The owner still can.
    await expect(mustGetTrip(sessionA, trip.id)).resolves.toMatchObject({
      id: trip.id,
    });
  });

  it("session B cannot update or delete session A's constraints", async () => {
    const { trip } = await setupOwnedTrip();
    const constraints = await sessionA.repos.constraints.listByTrip(trip.id);
    const target = constraints[0];

    await expect(
      updateConstraint(sessionB, {
        tripId: trip.id,
        constraintId: target.id,
        patch: { locked: false },
      }),
    ).rejects.toBeInstanceOf(TripAccessDeniedError);
    await expect(
      deleteConstraint(sessionB, {
        tripId: trip.id,
        constraintId: target.id,
      }),
    ).rejects.toBeInstanceOf(TripAccessDeniedError);

    const untouched = await sessionA.repos.constraints.listByTrip(trip.id);
    expect(untouched).toHaveLength(constraints.length);
  });

  it("session B cannot plan, pick tickets, confirm versions or change plans", async () => {
    const { trip, planVersionId } = await setupOwnedTrip();

    await expect(
      confirmConstraintsAndPlan(sessionB, trip.id),
    ).rejects.toBeInstanceOf(TripAccessDeniedError);
    await expect(
      selectTicket(sessionB, {
        tripId: trip.id,
        planVersionId,
        ticketId: "tram-single",
      }),
    ).rejects.toBeInstanceOf(TripAccessDeniedError);
    await expect(
      confirmVersion(sessionB, { tripId: trip.id, planVersionId }),
    ).rejects.toBeInstanceOf(TripAccessDeniedError);
    await expect(
      previewChange(sessionB, { tripId: trip.id, text: "加入博物馆" }),
    ).rejects.toBeInstanceOf(TripAccessDeniedError);
  });

  it("session B cannot apply session A's change request or booking tasks", async () => {
    const { trip, planVersionId } = await setupOwnedTrip();
    const preview = await previewChange(sessionA, {
      tripId: trip.id,
      text: "加入香港历史博物馆",
    });
    await expect(
      applyChange(sessionB, {
        tripId: trip.id,
        changeRequestId: preview.changeRequestId,
      }),
    ).rejects.toBeInstanceOf(TripAccessDeniedError);

    const tasks = await sessionA.repos.bookingTasks.listByVersion(
      planVersionId,
    );
    await expect(
      updateBookingTaskStatus(sessionB, {
        tripId: trip.id,
        taskId: tasks[0].id,
        planVersionId,
        status: "BOOKED",
      }),
    ).rejects.toBeInstanceOf(TripAccessDeniedError);
    const fresh = await sessionA.repos.bookingTasks.listByVersion(
      planVersionId,
    );
    expect(fresh[0].status).toBe("UNVERIFIED");
  });

  it("a version from another trip cannot be confirmed via one's own tripId", async () => {
    const { planVersionId } = await setupOwnedTrip();
    const tripB = await createDemoTrip(sessionB, "beijing");
    await expect(
      confirmVersion(sessionB, { tripId: tripB.id, planVersionId }),
    ).rejects.toBeInstanceOf(TripAccessDeniedError);
  });
});
