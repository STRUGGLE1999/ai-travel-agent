import { beforeEach, describe, expect, it } from "vitest";
import {
  createMemoryRepositories,
  resetMemoryStore,
} from "@/server/repositories/memory";
import {
  confirmAllHardConstraints,
  createDemoTrip,
  updateConstraint,
} from "@/application/use-cases";
import type { ActorContext } from "@/application/use-cases";

describe("confirmAllHardConstraints (use-case level)", () => {
  let ctx: ActorContext;

  beforeEach(() => {
    resetMemoryStore();
    ctx = {
      repos: createMemoryRepositories(),
      sessionId: "sess-confirm-all",
      ipHash: null,
    };
  });

  it("locks and clears every pending hard constraint, ignoring soft ones", async () => {
    const trip = await createDemoTrip(ctx, "hong-kong");
    const constraints = await ctx.repos.constraints.listByTrip(trip.id);

    const pendingHard = constraints.filter(
      (c) => c.kind === "HARD" && c.needsConfirmation,
    );
    expect(pendingHard.length).toBeGreaterThan(0);

    const count = await confirmAllHardConstraints(ctx, trip.id);
    expect(count).toBe(pendingHard.length);

    const after = await ctx.repos.constraints.listByTrip(trip.id);
    const confirmedIds = new Set(pendingHard.map((c) => c.id));
    for (const c of after) {
      if (confirmedIds.has(c.id)) {
        expect(c.needsConfirmation).toBe(false);
        expect(c.locked).toBe(true);
      }
    }
  });

  it("is a no-op when nothing is pending", async () => {
    const trip = await createDemoTrip(ctx, "hong-kong");
    const constraints = await ctx.repos.constraints.listByTrip(trip.id);
    for (const c of constraints) {
      await updateConstraint(ctx, {
        tripId: trip.id,
        constraintId: c.id,
        patch: { needsConfirmation: false, locked: true },
      });
    }

    const count = await confirmAllHardConstraints(ctx, trip.id);
    expect(count).toBe(0);
  });
});
