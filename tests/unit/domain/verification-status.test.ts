import { describe, expect, it } from "vitest";
import type { Conflict, Evidence } from "@/domain";
import {
  assertFixtureNotVerified,
  derivePlanStatus,
  isFullyVerified,
} from "@/domain/rules/verification-status";

function evidence(
  status: Evidence["status"],
  dataMode: Evidence["dataMode"] = "DEMO",
): Evidence {
  return {
    id: `ev_${status}`,
    tripId: "trip_1",
    planVersionId: "ver_1",
    factKey: "openingHours",
    value: "09:00-18:00",
    sourceName: "fixture",
    sourceUrl: null,
    provider: "fixture",
    checkedAt: "2026-04-12T00:00:00.000Z",
    status,
    confidence: 1,
    expiresAt: null,
    dataMode,
  };
}

function blockingConflict(): Conflict {
  return {
    id: "c1",
    tripId: "trip_1",
    planVersionId: "ver_1",
    severity: "BLOCKING",
    code: "TICKET_PLAN_MISMATCH",
    title: "票种与下山方式不一致",
    description: "计划出租车下山但选择缆车往返票。",
    affectedItemIds: ["item_1"],
    violatedConstraintIds: [],
    suggestedActions: ["改为单程票或改用缆车下山"],
    resolved: false,
  };
}

describe("verification status rules", () => {
  it("blocks READY when a blocking conflict exists", () => {
    expect(
      derivePlanStatus({
        conflicts: [blockingConflict()],
        evidence: [evidence("MOCK")],
      }),
    ).toBe("BLOCKED");
  });

  it("does not treat MOCK facts as fully verified", () => {
    const items = [evidence("MOCK")];
    expect(isFullyVerified(items)).toBe(false);
    expect(derivePlanStatus({ conflicts: [], evidence: items })).toBe(
      "READY_WITH_WARNINGS",
    );
  });

  it("rejects DEMO evidence marked VERIFIED", () => {
    expect(() =>
      assertFixtureNotVerified([evidence("VERIFIED", "DEMO")]),
    ).toThrow(/must not be marked VERIFIED/);
  });
});
