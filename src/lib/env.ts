import { z } from "zod";
import type { DataMode, PersistenceMode } from "@/domain/enums";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1).optional(),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_BASE_URL: z.string().min(1).optional(),
  ANTHROPIC_MODEL: z.string().min(1).optional(),
  RATE_LIMIT_SALT: z.string().min(1).optional(),
  MAX_LLM_CALLS_PER_SESSION_PER_DAY: z.coerce.number().int().positive().default(3),
  MAX_LLM_CALLS_PER_IP_PER_DAY: z.coerce.number().int().positive().default(3),
  MAX_LLM_CALLS_GLOBAL_PER_DAY: z.coerce.number().int().positive().default(100),
  MAX_SOURCE_INPUT_CHARS: z.coerce.number().int().positive().default(20000),
  LLM_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(86400),
});

export type AppEnv = z.infer<typeof envSchema>;

export function getEnv(): AppEnv {
  return envSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL || undefined,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || undefined,
    ANTHROPIC_BASE_URL: process.env.ANTHROPIC_BASE_URL || undefined,
    ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL || undefined,
    RATE_LIMIT_SALT: process.env.RATE_LIMIT_SALT || undefined,
    MAX_LLM_CALLS_PER_SESSION_PER_DAY:
      process.env.MAX_LLM_CALLS_PER_SESSION_PER_DAY,
    MAX_LLM_CALLS_PER_IP_PER_DAY: process.env.MAX_LLM_CALLS_PER_IP_PER_DAY,
    MAX_LLM_CALLS_GLOBAL_PER_DAY: process.env.MAX_LLM_CALLS_GLOBAL_PER_DAY,
    MAX_SOURCE_INPUT_CHARS: process.env.MAX_SOURCE_INPUT_CHARS,
    LLM_CACHE_TTL_SECONDS: process.env.LLM_CACHE_TTL_SECONDS,
  });
}

function hasAnthropicCredentials(env: AppEnv): boolean {
  return Boolean(
    env.ANTHROPIC_API_KEY && env.ANTHROPIC_BASE_URL && env.ANTHROPIC_MODEL,
  );
}

/**
 * LIVE_PARTIAL requires the full set: model credentials AND the
 * infrastructure that makes quota enforcement reliable across
 * instances (PostgreSQL atomic counters + a salt for IP hashing).
 * Anything less must run as DEMO and never call the real model.
 */
export function hasLiveAiConfig(): boolean {
  const env = getEnv();
  return (
    hasAnthropicCredentials(env) &&
    Boolean(env.DATABASE_URL && env.RATE_LIMIT_SALT)
  );
}

export function getDataMode(): DataMode {
  return hasLiveAiConfig() ? "LIVE_PARTIAL" : "DEMO";
}

/** Human-readable reason why the app is running in DEMO mode. */
export function getDemoReason(): string | null {
  if (hasLiveAiConfig()) {
    return null;
  }
  const env = getEnv();
  if (!hasAnthropicCredentials(env)) {
    return "真实模型未启用";
  }
  return "缺少 PostgreSQL / RATE_LIMIT_SALT，已保护性降级";
}

export function getPersistenceMode(): PersistenceMode {
  return getEnv().DATABASE_URL ? "postgres" : "memory";
}

export function getRuntimeInfo() {
  const persistence = getPersistenceMode();
  return {
    dataMode: getDataMode(),
    demoReason: getDemoReason(),
    persistence,
    persistenceLabel:
      persistence === "memory"
        ? "内存仓储（刷新或重启后数据可能丢失）"
        : "PostgreSQL",
  };
}
