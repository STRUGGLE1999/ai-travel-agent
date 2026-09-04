import { getPersistenceMode } from "@/lib/env";
import { createMemoryRepositories } from "@/server/repositories/memory";
import { createPostgresRepositories } from "@/server/repositories/postgres";
import type { Repositories } from "@/server/repositories/types";

export type { Repositories } from "@/server/repositories/types";

let hasFallbackToMemory = false;

function isNetworkError(err: unknown): boolean {
  if (!err) return false;
  const anyErr = err as Record<string, unknown>;
  const msg = err instanceof Error ? err.message : String(err);
  const source =
    anyErr.sourceError instanceof Error
      ? anyErr.sourceError.message
      : String(anyErr.sourceError || "");
  const cause =
    anyErr.cause instanceof Error
      ? anyErr.cause.message
      : String(anyErr.cause || "");
  const text = `${msg} ${source} ${cause}`;
  return (
    text.includes("fetch failed") ||
    text.includes("Failed query") ||
    text.includes("ECONNREFUSED") ||
    text.includes("ETIMEDOUT") ||
    text.includes("ENOTFOUND") ||
    text.includes("ConnectTimeoutError") ||
    text.includes("socket hang up")
  );
}

export function getRepositories(): Repositories {
  if (getPersistenceMode() === "postgres" && !hasFallbackToMemory) {
    const pg = createPostgresRepositories();
    const mem = createMemoryRepositories();

    const wrap = <T extends object>(pgSub: T, memSub: T): T => {
      const handler: ProxyHandler<T> = {
        get(target, prop, receiver) {
          const orig = Reflect.get(target, prop, receiver);
          if (typeof orig !== "function") return orig;
          return async function (...args: unknown[]) {
            if (hasFallbackToMemory) {
              const fallbackFn = Reflect.get(memSub, prop, memSub);
              if (typeof fallbackFn === "function") {
                return fallbackFn.apply(memSub, args);
              }
            }
            try {
              return await orig.apply(target, args);
            } catch (err: unknown) {
              if (isNetworkError(err)) {
                hasFallbackToMemory = true;
                console.warn(
                  "⚠ 远程 PostgreSQL 连接受限（fetch failed），已自动平滑降级为内存仓储以保障演示可用性",
                );
                const fallbackFn = Reflect.get(memSub, prop, memSub);
                if (typeof fallbackFn === "function") {
                  return fallbackFn.apply(memSub, args);
                }
              }
              throw err;
            }
          };
        },
      };
      return new Proxy(pgSub, handler);
    };

    return {
      persistence: "postgres",
      sessions: wrap(pg.sessions, mem.sessions),
      trips: wrap(pg.trips, mem.trips),
      sourceInputs: wrap(pg.sourceInputs, mem.sourceInputs),
      constraints: wrap(pg.constraints, mem.constraints),
      placeCandidates: wrap(pg.placeCandidates, mem.placeCandidates),
      planVersions: wrap(pg.planVersions, mem.planVersions),
      planItems: wrap(pg.planItems, mem.planItems),
      evidence: wrap(pg.evidence, mem.evidence),
      conflicts: wrap(pg.conflicts, mem.conflicts),
      changeRequests: wrap(pg.changeRequests, mem.changeRequests),
      changeImpacts: wrap(pg.changeImpacts, mem.changeImpacts),
      bookingTasks: wrap(pg.bookingTasks, mem.bookingTasks),
      llmUsage: wrap(pg.llmUsage, mem.llmUsage),
      llmCache: wrap(pg.llmCache, mem.llmCache),
    };
  }
  return createMemoryRepositories();
}
