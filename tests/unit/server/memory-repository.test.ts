import { afterEach, describe, expect, it } from "vitest";
import { ImmutableVersionError } from "@/domain/rules/version-immutability";
import {
  createMemoryRepositories,
  resetMemoryStore,
} from "@/server/repositories/memory";

describe("memory repository", () => {
  afterEach(() => {
    resetMemoryStore();
  });

  it("creates and reads a trip", async () => {
    const repos = createMemoryRepositories();
    expect(repos.persistence).toBe("memory");

    await repos.sessions.create({
      id: "sess_1",
      createdAt: "2026-04-12T00:00:00.000Z",
      lastSeenAt: "2026-04-12T00:00:00.000Z",
      ipHash: null,
    });

    const trip = await repos.trips.create({
      id: "trip_1",
      sessionId: "sess_1",
      title: "香港一日游",
      destination: "Hong Kong",
      timezone: "Asia/Hong_Kong",
      dataMode: "DEMO",
      status: "DRAFT",
      fixtureId: "hong-kong",
      createdAt: "2026-04-12T00:00:00.000Z",
      updatedAt: "2026-04-12T00:00:00.000Z",
    });

    await expect(repos.trips.getById("trip_1")).resolves.toEqual(trip);
  });

  it("refuses in-place mutation of a confirmed plan version", async () => {
    const repos = createMemoryRepositories();
    await repos.planVersions.create({
      id: "ver_1",
      tripId: "trip_1",
      versionNumber: 1,
      parentVersionId: null,
      changeRequestId: null,
      status: "READY_WITH_WARNINGS",
      confirmedAt: "2026-04-12T01:00:00.000Z",
      createdAt: "2026-04-12T00:00:00.000Z",
    });

    await expect(
      repos.planVersions.update({
        id: "ver_1",
        tripId: "trip_1",
        versionNumber: 1,
        parentVersionId: null,
        changeRequestId: null,
        status: "READY",
        confirmedAt: "2026-04-12T01:00:00.000Z",
        createdAt: "2026-04-12T00:00:00.000Z",
      }),
    ).rejects.toBeInstanceOf(ImmutableVersionError);

    await expect(
      repos.planItems.replaceForVersion("ver_1", []),
    ).rejects.toBeInstanceOf(ImmutableVersionError);
  });

  it("atomically increments daily LLM usage in memory", async () => {
    const repos = createMemoryRepositories();
    const first = await repos.llmUsage.incrementAndGet({
      day: "2026-04-12",
      scope: "GLOBAL",
      scopeKey: "global",
    });
    const second = await repos.llmUsage.incrementAndGet({
      day: "2026-04-12",
      scope: "GLOBAL",
      scopeKey: "global",
    });
    expect(first.count).toBe(1);
    expect(second.count).toBe(2);
  });
});
