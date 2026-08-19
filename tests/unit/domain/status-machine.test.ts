import { describe, expect, it } from "vitest";
import {
  assertCanEnterPlanning,
  assertStatusTransition,
  canTransitionStatus,
} from "@/domain/rules/status-machine";
import { InvalidStatusTransitionError } from "@/domain/rules/status-machine";

describe("trip status machine", () => {
  it("allows draft to confirmation, then planning", () => {
    expect(canTransitionStatus("DRAFT", "NEEDS_CONFIRMATION")).toBe(true);
    expect(canTransitionStatus("NEEDS_CONFIRMATION", "PLANNING")).toBe(true);
  });

  it("rejects skipping confirmation into READY", () => {
    expect(canTransitionStatus("DRAFT", "READY")).toBe(false);
    expect(() => assertStatusTransition("DRAFT", "READY")).toThrow(
      InvalidStatusTransitionError,
    );
  });

  it("blocks planning when hard constraints still need confirmation", () => {
    expect(() =>
      assertCanEnterPlanning([
        { kind: "HARD", needsConfirmation: true },
        { kind: "SOFT", needsConfirmation: false },
      ]),
    ).toThrow(/hard constraints/i);
  });
});
