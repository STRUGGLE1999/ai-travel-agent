import { getPersistenceMode } from "@/lib/env";
import { createMemoryRepositories } from "@/server/repositories/memory";
import { createPostgresRepositories } from "@/server/repositories/postgres";
import type { Repositories } from "@/server/repositories/types";

export type { Repositories } from "@/server/repositories/types";

export function getRepositories(): Repositories {
  if (getPersistenceMode() === "postgres") {
    return createPostgresRepositories();
  }
  return createMemoryRepositories();
}
