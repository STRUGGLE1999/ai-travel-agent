import type { PlanVersion } from "@/domain/itinerary";

export class ImmutableVersionError extends Error {
  constructor(readonly versionId: string) {
    super(
      `PlanVersion ${versionId} is confirmed and cannot be mutated in place`,
    );
    this.name = "ImmutableVersionError";
  }
}

export function isPlanVersionConfirmed(version: PlanVersion): boolean {
  return version.confirmedAt !== null;
}

export function assertPlanVersionMutable(version: PlanVersion): void {
  if (isPlanVersionConfirmed(version)) {
    throw new ImmutableVersionError(version.id);
  }
}

export function nextVersionNumber(currentMax: number): number {
  return currentMax + 1;
}
