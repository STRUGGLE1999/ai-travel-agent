import { describe, expect, it } from "vitest";
import type { PlanVersion } from "@/domain";
import {
  ImmutableVersionError,
  assertPlanVersionMutable,
  isPlanVersionConfirmed,
} from "@/domain/rules/version-immutability";

function version(confirmedAt: string | null): PlanVersion {
  return {
    id: "ver_1",
    tripId: "trip_1",
    versionNumber: 1,
    parentVersionId: null,
    changeRequestId: null,
    status: "READY_WITH_WARNINGS",
    confirmedAt,
    createdAt: "2026-04-12T00:00:00.000Z",
  };
}

describe("plan version immutability", () => {
  it("treats confirmed versions as immutable", () => {
    const confirmed = version("2026-04-12T01:00:00.000Z");
    expect(isPlanVersionConfirmed(confirmed)).toBe(true);
    expect(() => assertPlanVersionMutable(confirmed)).toThrow(
      ImmutableVersionError,
    );
  });

  it("allows mutating unconfirmed drafts", () => {
    expect(() => assertPlanVersionMutable(version(null))).not.toThrow();
  });
});
