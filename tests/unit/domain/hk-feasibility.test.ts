import { describe, expect, it } from "vitest";
import { HONG_KONG_FIXTURE } from "@/fixtures/hong-kong/data";
import { buildCandidatePlanItems } from "@/domain/planner/candidate";
import { runFeasibilityChecks } from "@/domain/rules/feasibility";
import { derivePlanStatus } from "@/domain/rules/verification-status";
import type { Constraint } from "@/domain";

const NOW = "2026-04-18T00:00:00.000Z";

function hkConstraints(): Constraint[] {
  return HONG_KONG_FIXTURE.extraction.constraints.map((extracted, index) => ({
    id: `c${index}`,
    tripId: "trip_hk",
    sourceInputId: null,
    category: extracted.category,
    kind: extracted.kind,
    value: extracted.value ?? {},
    summary: extracted.summary,
    locked: true,
    confidence: extracted.confidence,
    sourceQuote: extracted.sourceQuote,
    needsConfirmation: false,
    createdAt: NOW,
    updatedAt: NOW,
  }));
}

function buildContext(selectedTicketId: string | null) {
  const constraints = hkConstraints();
  const items = buildCandidatePlanItems({
    fixture: HONG_KONG_FIXTURE,
    planVersionId: "ver_1",
    constraints,
  });
  return {
    tripId: "trip_hk",
    planVersionId: "ver_1",
    fixture: HONG_KONG_FIXTURE,
    constraints,
    items,
    selectedTicketId,
    checkedAtIso: NOW,
  };
}

describe("hong kong feasibility (HKG-03 / HKG-08)", () => {
  it("blocks READY when round-trip tram ticket meets taxi descent", () => {
    const result = runFeasibilityChecks(buildContext("tram-return"));
    const mismatch = result.conflicts.find(
      (conflict) => conflict.code === "TICKET_PLAN_MISMATCH",
    );
    expect(mismatch).toBeDefined();
    expect(mismatch?.severity).toBe("BLOCKING");
    expect(
      derivePlanStatus({ conflicts: result.conflicts, evidence: result.evidence }),
    ).toBe("BLOCKED");
  });

  it("clears the mismatch with a single ticket but stays READY_WITH_WARNINGS on MOCK data", () => {
    const result = runFeasibilityChecks(buildContext("tram-single"));
    expect(
      result.conflicts.some(
        (conflict) => conflict.code === "TICKET_PLAN_MISMATCH",
      ),
    ).toBe(false);
    const status = derivePlanStatus({
      conflicts: result.conflicts,
      evidence: result.evidence,
    });
    expect(status).toBe("READY_WITH_WARNINGS");
    expect(result.evidence.length).toBeGreaterThan(0);
    expect(
      result.evidence.every((evidence) => evidence.status === "MOCK"),
    ).toBe(true);
  });

  it("also flags the sky pass combo against a taxi descent", () => {
    const result = runFeasibilityChecks(buildContext("tram-sky-pass"));
    expect(
      result.conflicts.some(
        (conflict) => conflict.code === "TICKET_PLAN_MISMATCH",
      ),
    ).toBe(true);
  });

  it("detects opening-window violations", () => {
    const ctx = buildContext(null);
    const peak = ctx.items.find((item) => item.placeId === "hk-victoria-peak");
    expect(peak).toBeDefined();
    peak!.startAt = "08:00";
    peak!.endAt = "09:00";
    const result = runFeasibilityChecks(ctx);
    expect(
      result.conflicts.some(
        (conflict) => conflict.code === "OUTSIDE_OPENING_HOURS",
      ),
    ).toBe(true);
  });

  it("detects time overlaps", () => {
    const ctx = buildContext(null);
    const lunch = ctx.items.find((item) => item.type === "MEAL");
    expect(lunch).toBeDefined();
    lunch!.startAt = "10:30";
    lunch!.endAt = "12:00";
    const result = runFeasibilityChecks(ctx);
    expect(
      result.conflicts.some((conflict) => conflict.code === "TIME_OVERLAP"),
    ).toBe(true);
  });
});
