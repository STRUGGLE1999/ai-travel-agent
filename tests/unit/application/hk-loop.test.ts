import { beforeEach, describe, expect, it } from "vitest";
import {
  createMemoryRepositories,
  resetMemoryStore,
} from "@/server/repositories/memory";
import {
  applyChange,
  confirmConstraintsAndPlan,
  createDemoTrip,
  getLatestVersion,
  previewChange,
  selectTicket,
  updateConstraint,
} from "@/application/use-cases";
import type { ActorContext } from "@/application/use-cases";

describe("hong kong demo full loop (use-case level)", () => {
  let ctx: ActorContext;

  beforeEach(() => {
    resetMemoryStore();
    ctx = {
      repos: createMemoryRepositories(),
      sessionId: "sess-usecase",
      ipHash: null,
    };
  });

  async function confirmAll(tripId: string) {
    const constraints = await ctx.repos.constraints.listByTrip(tripId);
    for (const constraint of constraints) {
      if (constraint.needsConfirmation) {
        await updateConstraint(ctx, {
          tripId,
          constraintId: constraint.id,
          patch: { needsConfirmation: false, locked: true },
        });
      }
    }
  }

  it("runs create → confirm → plan → ticket fix → change → new version", async () => {
    const trip = await createDemoTrip(ctx, "hong-kong");
    expect(trip.status).toBe("DRAFT");
    const afterImport = await ctx.repos.trips.getById(trip.id);
    expect(afterImport?.status).toBe("NEEDS_CONFIRMATION");

    await confirmAll(trip.id);
    const { planVersionId, status } = await confirmConstraintsAndPlan(
      ctx,
      trip.id,
    );
    // Default round-trip tram ticket vs taxi descent → BLOCKED.
    expect(status).toBe("BLOCKED");
    const tripAfterPlan = await ctx.repos.trips.getById(trip.id);
    expect(tripAfterPlan?.status).toBe("BLOCKED");

    const conflicts = await ctx.repos.conflicts.listByVersion(planVersionId);
    expect(
      conflicts.some((conflict) => conflict.code === "TICKET_PLAN_MISMATCH"),
    ).toBe(true);

    // Fix the ticket → READY_WITH_WARNINGS (MOCK evidence, never READY).
    const fixed = await selectTicket(ctx, {
      tripId: trip.id,
      planVersionId,
      ticketId: "tram-single",
    });
    expect(fixed).toBe("READY_WITH_WARNINGS");
    const tripAfterFix = await ctx.repos.trips.getById(trip.id);
    expect(tripAfterFix?.status).toBe("READY_WITH_WARNINGS");

    // Natural-language change → preview → apply → v2.
    const preview = await previewChange(ctx, {
      tripId: trip.id,
      text: "加入香港历史博物馆，如果暴雨就不要去山顶",
    });
    expect(preview.impact.additions.length).toBeGreaterThan(0);
    expect(preview.impact.preservedLockedItemIds.length).toBeGreaterThan(0);

    const applied = await applyChange(ctx, {
      tripId: trip.id,
      changeRequestId: preview.changeRequestId,
    });
    const latest = await getLatestVersion(ctx, trip.id);
    expect(latest?.versionNumber).toBe(2);
    expect(latest?.id).toBe(applied.planVersionId);

    const items = await ctx.repos.planItems.listByVersion(
      applied.planVersionId,
    );
    expect(items.some((item) => item.placeId === "hk-history-museum")).toBe(
      true,
    );

    const { getFixture } = await import("@/fixtures");
    const { calculateTripBudget } = await import("@/domain/budget/calculator");
    const budget = calculateTripBudget({
      items,
      fixture: getFixture("hong-kong")!,
      selectedTicketId: "tram-single",
    });
    expect(budget.items.some((i) => i.id === "ticket-hk-museum")).toBe(true);
    expect(budget.totalAmount).toBeGreaterThan(0);
    expect(budget.totalConfirmed).toBe(76 * 3);
  });
});
