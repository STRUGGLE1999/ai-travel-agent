import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createMemoryRepositories,
  resetMemoryStore,
} from "@/server/repositories/memory";
import { createGatedAiProvider } from "@/services/ai/gate";
import { createFixedClock } from "@/lib/clock";
import { getDataMode, getDemoReason, hasLiveAiConfig } from "@/lib/env";

const FULL_LIVE_ENV = {
  ANTHROPIC_API_KEY: "test-key-not-real",
  ANTHROPIC_BASE_URL: "https://gateway.invalid",
  ANTHROPIC_MODEL: "claude-opus-5",
  DATABASE_URL: "postgres://user:pass@db.invalid/test",
  RATE_LIMIT_SALT: "test-salt-not-real",
};

function stubEnv(overrides: Record<string, string | undefined>) {
  for (const key of Object.keys(FULL_LIVE_ENV)) {
    vi.stubEnv(key, "");
  }
  for (const [key, value] of Object.entries(overrides)) {
    if (value !== undefined) {
      vi.stubEnv(key, value);
    }
  }
}

function gate() {
  return createGatedAiProvider({
    repos: createMemoryRepositories(),
    sessionId: "sess-live-config",
    ipHash: "iphash-1",
    clock: createFixedClock("2026-04-18T08:00:00.000Z"),
  });
}

describe("P0-2: LIVE_PARTIAL requires the full five-variable config", () => {
  beforeEach(() => {
    resetMemoryStore();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("missing DATABASE_URL → DEMO, fake AI, and no fetch at all", async () => {
    stubEnv({ ...FULL_LIVE_ENV, DATABASE_URL: undefined });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    expect(hasLiveAiConfig()).toBe(false);
    expect(getDataMode()).toBe("DEMO");
    expect(getDemoReason()).toContain("PostgreSQL / RATE_LIMIT_SALT");

    const result = await gate().extractConstraints({
      text: "带老人去香港，少走路",
    });
    expect(result.provider).toBe("fake");
    expect(result.data.constraints.length).toBeGreaterThan(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("missing RATE_LIMIT_SALT → DEMO, fake AI, and no fetch at all", async () => {
    stubEnv({ ...FULL_LIVE_ENV, RATE_LIMIT_SALT: undefined });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    expect(hasLiveAiConfig()).toBe(false);
    expect(getDataMode()).toBe("DEMO");

    const result = await gate().parseChangeRequest({ text: "加入博物馆" });
    expect(result.provider).toBe("fake");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("missing model credentials → DEMO with '真实模型未启用'", () => {
    stubEnv({
      DATABASE_URL: FULL_LIVE_ENV.DATABASE_URL,
      RATE_LIMIT_SALT: FULL_LIVE_ENV.RATE_LIMIT_SALT,
    });
    expect(getDataMode()).toBe("DEMO");
    expect(getDemoReason()).toBe("真实模型未启用");
  });

  it("full config → LIVE_PARTIAL and the gate attempts the model call", async () => {
    stubEnv(FULL_LIVE_ENV);
    const fetchMock = vi.fn(async () => {
      throw new Error("dialed (expected in this test)");
    });
    vi.stubGlobal("fetch", fetchMock);

    expect(hasLiveAiConfig()).toBe(true);
    expect(getDataMode()).toBe("LIVE_PARTIAL");
    expect(getDemoReason()).toBeNull();

    const result = await gate().parseChangeRequest({ text: "加入博物馆" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // Call failed → explicit degradation, never fabricated live output.
    expect(result.degraded).toBe(true);
    expect(result.provider).toBe("degraded-fake");
  });
});

describe("P0-1: production smoke route never reaches the model", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("returns 404 in production without any fetch, even with full live config", async () => {
    stubEnv(FULL_LIVE_ENV);
    vi.stubEnv("NODE_ENV", "production");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await import("@/app/api/ai/smoke/route");
    const response = await GET();
    expect(response.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("in development without full config it reports DEMO and does not fetch", async () => {
    stubEnv({});
    vi.stubEnv("NODE_ENV", "development");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await import("@/app/api/ai/smoke/route");
    const response = await GET();
    expect(response.status).toBe(200);
    const body = (await response.json()) as { ok: boolean; mode: string };
    expect(body.ok).toBe(false);
    expect(body.mode).toBe("DEMO");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("P1-3: LLM cache TTL", () => {
  beforeEach(() => {
    resetMemoryStore();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  function successFetch() {
    return vi.fn(async () => ({
      ok: true,
      json: async () => ({
        content: [
          {
            type: "text",
            text: JSON.stringify({
              operations: [{ type: "SET_WEATHER", condition: "STORM" }],
            }),
          },
        ],
        stop_reason: "end_turn",
      }),
    }));
  }

  it("writes expiresAt from LLM_CACHE_TTL_SECONDS and ignores expired entries", async () => {
    stubEnv({ ...FULL_LIVE_ENV, LLM_CACHE_TTL_SECONDS: "3600" });
    const fetchMock = successFetch();
    vi.stubGlobal("fetch", fetchMock);
    const repos = createMemoryRepositories();

    const at = (iso: string) =>
      createGatedAiProvider({
        repos,
        sessionId: "sess-ttl",
        ipHash: "iphash-ttl",
        clock: createFixedClock(iso),
      });

    // First call populates the cache with a 1h TTL.
    const first = await at("2026-04-18T08:00:00.000Z").parseChangeRequest({
      text: "暴雨怎么办",
    });
    expect(first.cached).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Within TTL: cache hit, no new model call.
    const within = await at("2026-04-18T08:30:00.000Z").parseChangeRequest({
      text: "暴雨怎么办",
    });
    expect(within.cached).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Past TTL: entry ignored, model called again.
    const after = await at("2026-04-18T10:00:00.000Z").parseChangeRequest({
      text: "暴雨怎么办",
    });
    expect(after.cached).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
