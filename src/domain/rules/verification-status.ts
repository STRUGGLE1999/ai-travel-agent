import type { Evidence } from "@/domain/verification";
import type { Conflict } from "@/domain/verification";
import type { TripStatus } from "@/domain/enums";

export function isFullyVerified(evidence: Evidence[]): boolean {
  if (evidence.length === 0) {
    return false;
  }

  return evidence.every(
    (item) => item.status === "VERIFIED" || item.status === "NOT_REQUIRED",
  );
}

export function derivePlanStatus(input: {
  conflicts: Conflict[];
  evidence: Evidence[];
}): TripStatus {
  const blocking = input.conflicts.some(
    (conflict) => conflict.severity === "BLOCKING" && !conflict.resolved,
  );
  if (blocking) {
    return "BLOCKED";
  }

  const hasUnknown = input.evidence.some((item) => item.status === "UNKNOWN");
  const hasStale = input.evidence.some((item) => item.status === "STALE");
  const hasMock = input.evidence.some((item) => item.status === "MOCK");

  if (hasUnknown || hasStale || hasMock || !isFullyVerified(input.evidence)) {
    return "READY_WITH_WARNINGS";
  }

  return "READY";
}

export function assertFixtureNotVerified(evidence: Evidence[]): void {
  const fakeVerified = evidence.filter(
    (item) => item.dataMode === "DEMO" && item.status === "VERIFIED",
  );
  if (fakeVerified.length > 0) {
    throw new Error(
      "Fixture/DEMO evidence must not be marked VERIFIED",
    );
  }
}
