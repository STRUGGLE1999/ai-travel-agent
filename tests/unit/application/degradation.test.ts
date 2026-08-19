import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createMemoryRepositories,
  resetMemoryStore,
} from "@/server/repositories/memory";
import {
  createTrip,
  importTextAndExtract,
  previewChange,
  confirmConstraintsAndPlan,
  createDemoTrip,
  updateConstraint,
} from "@/application/use-cases";
import type { ActorContext } from "@/application/use-cases";

const FULL_LIVE_ENV = {
  ANTHROPIC_API_KEY: "test-key-not-real",
  ANTHROPIC_BASE_URL: "https://gateway.invalid",
  ANTHROPIC_MODEL: "claude-opus-5",
  DATABASE_URL: "postgres://user:pass@db.invalid/test",
  RATE_LIMIT_SALT: "test-salt-not-real",
};

describe("P1-2: degradation is surfaced to callers of the use-cases", () => {
  let ctx: ActorContext;

  beforeEach(() => {
    resetMemoryStore();
    // Use-cases receive injected memory repositories, so the fake
    // DATABASE_URL is never dialed.
    ctx = {
      repos: createMemoryRepositories(),
      sessionId: "sess-degraded",
      ipHash: "iphash-degraded",
    };
    for (const [key, value] of Object.entries(FULL_LIVE_ENV)) {
      vi.stubEnv(key, value);
    }
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("importTextAndExtract reports degraded + reason when the live call fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("gateway down");
      }),
    );
    const trip = await createTrip(ctx, {
      title: "测试行程",
      destination: "香港",
    });
    const summary = await importTextAndExtract(ctx, {
      tripId: trip.id,
      text: "带老人去香港，少走路，不坐摩天轮",
    });
    expect(summary.degraded).toBe(true);
    expect(summary.provider).toBe("degraded-fake");
    expect(summary.degradeReason).toContain("降级");
    // Reason text never leaks configuration values.
    expect(summary.degradeReason).not.toContain("gateway.invalid");
    expect(summary.degradeReason).not.toContain("test-key");
    // Constraints were still stored via the fake path.
    const constraints = await ctx.repos.constraints.listByTrip(trip.id);
    expect(constraints.length).toBeGreaterThan(0);
  });

  it("previewChange reports degraded + reason when the live call fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("gateway down");
      }),
    );
    const trip = await createDemoTrip(ctx, "hong-kong");
    const constraints = await ctx.repos.constraints.listByTrip(trip.id);
    for (const constraint of constraints) {
      if (constraint.needsConfirmation) {
        await updateConstraint(ctx, {
          tripId: trip.id,
          constraintId: constraint.id,
          patch: { needsConfirmation: false, locked: true },
        });
      }
    }
    await confirmConstraintsAndPlan(ctx, trip.id);

    const preview = await previewChange(ctx, {
      tripId: trip.id,
      text: "加入香港历史博物馆",
    });
    expect(preview.degraded).toBe(true);
    expect(preview.degradeReason).toContain("降级");
    // The deterministic change engine still produced a valid preview.
    expect(preview.impact.additions.length).toBeGreaterThan(0);
  });
});
