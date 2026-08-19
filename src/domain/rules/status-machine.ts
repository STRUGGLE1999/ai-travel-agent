import type { TripStatus } from "@/domain/enums";

export class InvalidStatusTransitionError extends Error {
  constructor(
    readonly from: TripStatus,
    readonly to: TripStatus,
  ) {
    super(`Cannot transition trip/plan status from ${from} to ${to}`);
    this.name = "InvalidStatusTransitionError";
  }
}

const ALLOWED_TRANSITIONS: Record<TripStatus, readonly TripStatus[]> = {
  DRAFT: ["DRAFT", "NEEDS_CONFIRMATION"],
  NEEDS_CONFIRMATION: ["NEEDS_CONFIRMATION", "PLANNING", "DRAFT"],
  PLANNING: ["PLANNING", "VERIFYING", "NEEDS_CONFIRMATION"],
  VERIFYING: [
    "VERIFYING",
    "BLOCKED",
    "READY_WITH_WARNINGS",
    "READY",
    "PLANNING",
  ],
  BLOCKED: ["BLOCKED", "PLANNING", "NEEDS_CONFIRMATION"],
  READY_WITH_WARNINGS: [
    "READY_WITH_WARNINGS",
    "READY",
    "PLANNING",
    "VERIFYING",
  ],
  READY: ["READY", "PLANNING", "VERIFYING"],
};

export function canTransitionStatus(
  from: TripStatus,
  to: TripStatus,
): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function assertStatusTransition(
  from: TripStatus,
  to: TripStatus,
): void {
  if (!canTransitionStatus(from, to)) {
    throw new InvalidStatusTransitionError(from, to);
  }
}

export function hasUnresolvedHardConstraints(
  constraints: Array<{ kind: string; needsConfirmation: boolean }>,
): boolean {
  return constraints.some(
    (constraint) => constraint.kind === "HARD" && constraint.needsConfirmation,
  );
}

export function assertCanEnterPlanning(
  constraints: Array<{ kind: string; needsConfirmation: boolean }>,
): void {
  if (hasUnresolvedHardConstraints(constraints)) {
    throw new Error(
      "Cannot generate a final plan while hard constraints still need confirmation",
    );
  }
}
