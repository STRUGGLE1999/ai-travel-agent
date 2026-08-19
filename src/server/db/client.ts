import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "@/server/db/schema";
import { getEnv } from "@/lib/env";

type Db = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as unknown as { tripproofDb?: Db };

export function getDb(): Db {
  const url = getEnv().DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required for postgres persistence");
  }

  if (!globalForDb.tripproofDb) {
    const sql = neon(url);
    globalForDb.tripproofDb = drizzle(sql, { schema });
  }

  return globalForDb.tripproofDb;
}

/** Test helper: drop the cached Neon client after stubbing DATABASE_URL. */
export function resetDbClient(): void {
  globalForDb.tripproofDb = undefined;
}
