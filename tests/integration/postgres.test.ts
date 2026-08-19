import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { ImmutableVersionError } from "@/domain/rules/version-immutability";
import { getDb, resetDbClient } from "@/server/db/client";
import * as tables from "@/server/db/schema";
import { createId } from "@/lib/ids";
import { createPostgresRepositories } from "@/server/repositories/postgres";

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const requirePg = process.env.REQUIRE_PG_TESTS === "1";
const describePg = TEST_DATABASE_URL ? describe : describe.skip;

function repos() {
  return createPostgresRepositories();
}

async function cleanup(ids: {
  sessions?: string[];
  trips?: string[];
  versions?: string[];
  usageKeys?: Array<{ day: string; scope: string; scopeKey: string }>;
  cacheHashes?: string[];
}) {
  const db = getDb();
  for (const id of ids.versions ?? []) {
    await db.delete(tables.planVersions).where(eq(tables.planVersions.id, id));
  }
  for (const id of ids.trips ?? []) {
    await db.delete(tables.trips).where(eq(tables.trips.id, id));
  }
  for (const id of ids.sessions ?? []) {
    await db
      .delete(tables.anonymousSessions)
      .where(eq(tables.anonymousSessions.id, id));
  }
  for (const key of ids.usageKeys ?? []) {
    await db
      .delete(tables.llmUsageDaily)
      .where(eq(tables.llmUsageDaily.scopeKey, key.scopeKey));
  }
  for (const hash of ids.cacheHashes ?? []) {
    await db.delete(tables.llmCache).where(eq(tables.llmCache.inputHash, hash));
  }
}

describe("optional PostgreSQL integration", () => {
  it("documents how to enable the suite", () => {
    if (requirePg && !TEST_DATABASE_URL) {
      throw new Error(
        "npm run test:pg requires TEST_DATABASE_URL (do not use the production DATABASE_URL).",
      );
    }
    expect(true).toBe(true);
  });
});

describePg("postgres repository", () => {
  beforeAll(() => {
    vi.stubEnv("DATABASE_URL", TEST_DATABASE_URL as string);
    resetDbClient();
  });

  afterAll(() => {
    resetDbClient();
    vi.unstubAllEnvs();
  });

  it("atomically increments daily LLM usage under concurrent writes", async () => {
    const db = repos();
    const scopeKey = `pgtest-${createId()}`;
    const input = {
      day: "2099-01-01",
      scope: "GLOBAL" as const,
      scopeKey,
    };
    try {
      const results = await Promise.all(
        Array.from({ length: 8 }, () => db.llmUsage.incrementAndGet(input)),
      );
      const counts = results.map((row) => row.count).sort((a, b) => a - b);
      expect(counts).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
      const stored = await db.llmUsage.get(input);
      expect(stored?.count).toBe(8);
    } finally {
      await cleanup({ usageKeys: [input] });
    }
  });

  it("upserts cache rows and hides expired entries at SQL time", async () => {
    const db = repos();
    const inputHash = `pgtest-${createId()}`;
    const key = {
      taskType: "extractConstraints" as const,
      inputHash,
      model: "eval-model",
    };
    try {
      await db.llmCache.set({
        id: createId(),
        ...key,
        output: { v: 1 },
        createdAt: "2026-04-12T00:00:00.000Z",
        expiresAt: "2099-01-01T00:00:00.000Z",
      });
      const fresh = await db.llmCache.get(key);
      expect(fresh?.output).toEqual({ v: 1 });

      await db.llmCache.set({
        id: createId(),
        ...key,
        output: { v: 2 },
        createdAt: "2026-04-12T01:00:00.000Z",
        expiresAt: "2099-01-01T00:00:00.000Z",
      });
      const upserted = await db.llmCache.get(key);
      expect(upserted?.output).toEqual({ v: 2 });

      await db.llmCache.set({
        id: createId(),
        ...key,
        output: { v: 3 },
        createdAt: "2026-04-12T02:00:00.000Z",
        expiresAt: "2000-01-01T00:00:00.000Z",
      });
      await expect(db.llmCache.get(key)).resolves.toBeNull();
    } finally {
      await cleanup({ cacheHashes: [inputHash] });
    }
  });

  it("lists trips only for the owning anonymous session", async () => {
    const db = repos();
    const sessionA = `pgtest-sess-a-${createId()}`;
    const sessionB = `pgtest-sess-b-${createId()}`;
    const tripA = `pgtest-trip-a-${createId()}`;
    const tripB = `pgtest-trip-b-${createId()}`;
    const now = "2026-04-12T00:00:00.000Z";
    try {
      await db.sessions.create({
        id: sessionA,
        createdAt: now,
        lastSeenAt: now,
        ipHash: null,
      });
      await db.sessions.create({
        id: sessionB,
        createdAt: now,
        lastSeenAt: now,
        ipHash: null,
      });
      await db.trips.create({
        id: tripA,
        sessionId: sessionA,
        title: "A",
        destination: "Hong Kong",
        timezone: "Asia/Hong_Kong",
        dataMode: "DEMO",
        status: "DRAFT",
        fixtureId: "hong-kong",
        createdAt: now,
        updatedAt: now,
      });
      await db.trips.create({
        id: tripB,
        sessionId: sessionB,
        title: "B",
        destination: "Beijing",
        timezone: "Asia/Shanghai",
        dataMode: "DEMO",
        status: "DRAFT",
        fixtureId: "beijing",
        createdAt: now,
        updatedAt: now,
      });

      const listedA = await db.trips.listBySession(sessionA);
      const listedB = await db.trips.listBySession(sessionB);
      expect(listedA.map((trip) => trip.id)).toEqual([tripA]);
      expect(listedB.map((trip) => trip.id)).toEqual([tripB]);
    } finally {
      await cleanup({
        trips: [tripA, tripB],
        sessions: [sessionA, sessionB],
      });
    }
  });

  it("refuses in-place mutation of a confirmed plan version", async () => {
    const db = repos();
    const sessionId = `pgtest-sess-${createId()}`;
    const tripId = `pgtest-trip-${createId()}`;
    const versionId = `pgtest-ver-${createId()}`;
    const now = "2026-04-12T00:00:00.000Z";
    try {
      await db.sessions.create({
        id: sessionId,
        createdAt: now,
        lastSeenAt: now,
        ipHash: null,
      });
      await db.trips.create({
        id: tripId,
        sessionId,
        title: "HK",
        destination: "Hong Kong",
        timezone: "Asia/Hong_Kong",
        dataMode: "DEMO",
        status: "DRAFT",
        fixtureId: "hong-kong",
        createdAt: now,
        updatedAt: now,
      });
      await db.planVersions.create({
        id: versionId,
        tripId,
        versionNumber: 1,
        parentVersionId: null,
        changeRequestId: null,
        status: "READY_WITH_WARNINGS",
        confirmedAt: "2026-04-12T01:00:00.000Z",
        createdAt: now,
      });

      await expect(
        db.planVersions.update({
          id: versionId,
          tripId,
          versionNumber: 1,
          parentVersionId: null,
          changeRequestId: null,
          status: "READY",
          confirmedAt: "2026-04-12T01:00:00.000Z",
          createdAt: now,
        }),
      ).rejects.toBeInstanceOf(ImmutableVersionError);
    } finally {
      await cleanup({
        versions: [versionId],
        trips: [tripId],
        sessions: [sessionId],
      });
    }
  });
});
