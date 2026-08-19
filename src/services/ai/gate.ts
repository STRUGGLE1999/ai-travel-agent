import { createId, sha256Hex } from "@/lib/ids";
import { getEnv, hasLiveAiConfig } from "@/lib/env";
import type { Clock } from "@/lib/clock";
import { systemClock } from "@/lib/clock";
import {
  extractConstraintsOutputSchema,
  parseChangeRequestOutputSchema,
} from "@/domain";
import type {
  ExtractConstraintsOutput,
  LlmTaskType,
  ParseChangeRequestOutput,
} from "@/domain";
import type { Repositories } from "@/server/repositories/types";
import { createFakeAiProvider } from "@/services/ai/fake";
import { createAnthropicAiProvider } from "@/services/ai/anthropic";
import type { AiProvider, AiProviderResult } from "@/services/ai/types";

export interface GateContext {
  repos: Repositories;
  sessionId: string;
  ipHash: string | null;
  clock?: Clock;
}

/**
 * Cost-protection gate around the real LLM: enforces input size, daily
 * quotas (session / hashed IP / global, atomically counted in the
 * repository), normalized-input caching, and explicit degradation to the
 * deterministic Fake AI whenever anything fails.
 */
export function createGatedAiProvider(ctx: GateContext): AiProvider {
  const fake = createFakeAiProvider();

  if (!hasLiveAiConfig()) {
    return fake;
  }

  const live = createAnthropicAiProvider();
  const clock = ctx.clock ?? systemClock;

  const runGated = async <T>(input: {
    taskType: LlmTaskType;
    text: string;
    call: () => Promise<AiProviderResult<T>>;
    fallback: () => Promise<AiProviderResult<T>>;
    parseCached: (value: unknown) => T;
  }): Promise<AiProviderResult<T>> => {
    const env = getEnv();

    if (input.text.length > env.MAX_SOURCE_INPUT_CHARS) {
      const result = await input.fallback();
      return degrade(result, "输入超过字符上限，已降级为演示解析");
    }

    const model = env.ANTHROPIC_MODEL ?? "unknown";
    const normalized = normalizeInput(input.text);
    const inputHash = await sha256Hex(`${input.taskType}:${normalized}`);

    // Cache first: repeated identical inputs must not consume quota.
    // Expired entries (past their TTL) are treated as misses.
    try {
      const cached = await ctx.repos.llmCache.get({
        taskType: input.taskType,
        inputHash,
        model,
      });
      const notExpired =
        cached &&
        (!cached.expiresAt ||
          new Date(cached.expiresAt).getTime() > clock.now().getTime());
      if (cached && notExpired) {
        return {
          data: input.parseCached(cached.output),
          provider: "anthropic",
          degraded: false,
          cached: true,
        };
      }
    } catch {
      // Cache lookup failure is non-fatal; continue to quota check.
    }

    const day = clock.now().toISOString().slice(0, 10);
    try {
      const sessionUsage = await ctx.repos.llmUsage.incrementAndGet({
        day,
        scope: "SESSION",
        scopeKey: ctx.sessionId,
      });
      if (sessionUsage.count > env.MAX_LLM_CALLS_PER_SESSION_PER_DAY) {
        const result = await input.fallback();
        return degrade(result, "今日会话内真实 AI 调用次数已用完，已降级为演示解析");
      }
      if (ctx.ipHash) {
        const ipUsage = await ctx.repos.llmUsage.incrementAndGet({
          day,
          scope: "IP",
          scopeKey: ctx.ipHash,
        });
        if (ipUsage.count > env.MAX_LLM_CALLS_PER_IP_PER_DAY) {
          const result = await input.fallback();
          return degrade(result, "今日该网络的真实 AI 调用次数已用完，已降级为演示解析");
        }
      }
      const globalUsage = await ctx.repos.llmUsage.incrementAndGet({
        day,
        scope: "GLOBAL",
        scopeKey: "global",
      });
      if (globalUsage.count > env.MAX_LLM_CALLS_GLOBAL_PER_DAY) {
        const result = await input.fallback();
        return degrade(result, "全站今日真实 AI 额度已用完，已降级为演示解析");
      }
    } catch {
      // Quota storage unavailable → refuse to spend money, degrade.
      const result = await input.fallback();
      return degrade(result, "额度存储不可用，已降级为演示解析");
    }

    try {
      const result = await input.call();
      try {
        await ctx.repos.llmCache.set({
          id: createId(),
          taskType: input.taskType,
          inputHash,
          model,
          output: result.data as unknown,
          createdAt: clock.now().toISOString(),
          expiresAt: new Date(
            clock.now().getTime() + env.LLM_CACHE_TTL_SECONDS * 1000,
          ).toISOString(),
        });
      } catch {
        // Failing to cache must not fail the request.
      }
      return result;
    } catch {
      const result = await input.fallback();
      return degrade(result, "真实模型调用失败或输出无法通过校验，已降级为演示解析");
    }
  };

  return {
    kind: "anthropic",
    async extractConstraints(input) {
      return runGated<ExtractConstraintsOutput>({
        taskType: "extractConstraints",
        text: input.text,
        call: () => live.extractConstraints(input),
        fallback: () => fake.extractConstraints(input),
        parseCached: (value) => extractConstraintsOutputSchema.parse(value),
      });
    },
    async parseChangeRequest(input) {
      return runGated<ParseChangeRequestOutput>({
        taskType: "parseChangeRequest",
        text: input.text,
        call: () => live.parseChangeRequest(input),
        fallback: () => fake.parseChangeRequest(input),
        parseCached: (value) => parseChangeRequestOutputSchema.parse(value),
      });
    },
  };
}

function degrade<T>(
  result: AiProviderResult<T>,
  reason: string,
): AiProviderResult<T> {
  return {
    ...result,
    provider: "degraded-fake",
    degraded: true,
    degradeReason: reason,
  };
}

export function normalizeInput(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}
