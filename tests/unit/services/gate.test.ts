import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createMemoryRepositories,
  resetMemoryStore,
} from "@/server/repositories/memory";
import { createGatedAiProvider } from "@/services/ai/gate";
import { createFixedClock } from "@/lib/clock";

const LIVE_ENV = {
  ANTHROPIC_API_KEY: "test-key-not-real",
  ANTHROPIC_BASE_URL: "https://gateway.invalid",
  ANTHROPIC_MODEL: "claude-opus-5",
  // LIVE_PARTIAL additionally requires reliable quota infrastructure.
  // The gate itself uses injected repositories, so this fake URL is
  // never dialed by these tests.
  DATABASE_URL: "postgres://user:pass@db.invalid/test",
  RATE_LIMIT_SALT: "test-salt-not-real",
  MAX_LLM_CALLS_PER_SESSION_PER_DAY: "2",
  MAX_LLM_CALLS_GLOBAL_PER_DAY: "3",
};

describe("LLM cost-protection gate (SYS-07 / SYS-08)", () => {
  beforeEach(() => {
    resetMemoryStore();
    for (const [key, value] of Object.entries(LIVE_ENV)) {
      vi.stubEnv(key, value);
    }
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  function gate(sessionId = "sess-1") {
    return createGatedAiProvider({
      repos: createMemoryRepositories(),
      sessionId,
      ipHash: "iphash-1",
      clock: createFixedClock("2026-04-18T08:00:00.000Z"),
    });
  }

  it("degrades to fake AI when the live call fails, without faking live results", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network unreachable");
      }),
    );
    const result = await gate().extractConstraints({
      text: "带老人去香港，少走路",
    });
    expect(result.degraded).toBe(true);
    expect(result.provider).toBe("degraded-fake");
    expect(result.degradeReason).toContain("降级");
    expect(result.data.constraints.length).toBeGreaterThan(0);
  });

  it("stops calling the model once the session quota is exhausted", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("boom");
    });
    vi.stubGlobal("fetch", fetchMock);
    const provider = gate();

    await provider.parseChangeRequest({ text: "第一次 加入博物馆" });
    await provider.parseChangeRequest({ text: "第二次 加入商场" });
    const third = await provider.parseChangeRequest({ text: "第三次 加入公园" });

    expect(third.degraded).toBe(true);
    expect(third.degradeReason).toContain("会话");
    // Quota was exceeded before the third call, so fetch was only
    // attempted for the first two.
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("serves repeated identical input from cache without extra model calls", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        content: [
          {
            type: "text",
            text: JSON.stringify({
              operations: [
                { type: "SET_WEATHER", condition: "STORM" },
              ],
            }),
          },
        ],
        stop_reason: "end_turn",
      }),
    }));
    vi.stubGlobal("fetch", fetchMock);
    const provider = gate();

    const first = await provider.parseChangeRequest({ text: "暴雨怎么办" });
    const second = await provider.parseChangeRequest({ text: "暴雨怎么办" });

    expect(first.cached).toBe(false);
    expect(second.cached).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects oversized input without calling the model", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("MAX_SOURCE_INPUT_CHARS", "10");
    const result = await gate().extractConstraints({
      text: "这是一段远远超过十个字符上限的超长输入文本",
    });
    expect(result.degraded).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
