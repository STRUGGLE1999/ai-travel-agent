import { createId } from "@/lib/ids";
import {
  anonymousSessionSchema,
  bookingTaskSchema,
  changeImpactRecordSchema,
  changeRequestSchema,
  conflictSchema,
  constraintSchema,
  evidenceSchema,
  llmCacheRecordSchema,
  llmUsageDailySchema,
  placeCandidateSchema,
  planItemSchema,
  planVersionSchema,
  sourceInputSchema,
  tripSchema,
} from "@/domain";
import { assertStatusTransition } from "@/domain/rules/status-machine";
import { assertPlanVersionMutable } from "@/domain/rules/version-immutability";
import type {
  AnonymousSession,
  BookingTask,
  ChangeImpactRecord,
  ChangeRequest,
  Conflict,
  Constraint,
  Evidence,
  LlmCacheRecord,
  LlmUsageDaily,
  PlaceCandidate,
  PlanItem,
  PlanVersion,
  SourceInput,
  Trip,
} from "@/domain";
import type { Repositories } from "@/server/repositories/types";

class MemoryStore {
  sessions = new Map<string, AnonymousSession>();
  trips = new Map<string, Trip>();
  sourceInputs = new Map<string, SourceInput>();
  constraints = new Map<string, Constraint>();
  placeCandidates = new Map<string, PlaceCandidate>();
  planVersions = new Map<string, PlanVersion>();
  planItems = new Map<string, PlanItem>();
  evidence = new Map<string, Evidence>();
  conflicts = new Map<string, Conflict>();
  changeRequests = new Map<string, ChangeRequest>();
  changeImpacts = new Map<string, ChangeImpactRecord>();
  bookingTasks = new Map<string, BookingTask>();
  llmUsage = new Map<string, LlmUsageDaily>();
  llmCache = new Map<string, LlmCacheRecord>();
}

const globalForMemory = globalThis as unknown as {
  tripproofMemoryStore?: MemoryStore;
};

export function getMemoryStore(): MemoryStore {
  if (!globalForMemory.tripproofMemoryStore) {
    globalForMemory.tripproofMemoryStore = new MemoryStore();
  }
  return globalForMemory.tripproofMemoryStore;
}

export function resetMemoryStore(): void {
  globalForMemory.tripproofMemoryStore = new MemoryStore();
}

function usageKey(day: string, scope: string, scopeKey: string): string {
  return `${day}:${scope}:${scopeKey}`;
}

function cacheKey(taskType: string, inputHash: string, model: string): string {
  return `${taskType}:${inputHash}:${model}`;
}

export function createMemoryRepositories(): Repositories {
  const store = getMemoryStore();

  return {
    persistence: "memory",
    sessions: {
      async create(session) {
        const parsed = anonymousSessionSchema.parse(session);
        store.sessions.set(parsed.id, parsed);
        return parsed;
      },
      async getById(id) {
        return store.sessions.get(id) ?? null;
      },
      async touch(id, lastSeenAt, ipHash) {
        const current = store.sessions.get(id);
        if (!current) {
          return;
        }
        store.sessions.set(id, {
          ...current,
          lastSeenAt,
          ipHash: ipHash === undefined ? current.ipHash : ipHash,
        });
      },
    },
    trips: {
      async create(trip) {
        const parsed = tripSchema.parse(trip);
        store.trips.set(parsed.id, parsed);
        return parsed;
      },
      async getById(id) {
        return store.trips.get(id) ?? null;
      },
      async update(trip) {
        const existing = store.trips.get(trip.id);
        if (!existing) {
          throw new Error(`Trip ${trip.id} not found`);
        }
        assertStatusTransition(existing.status, trip.status);
        const parsed = tripSchema.parse(trip);
        store.trips.set(parsed.id, parsed);
        return parsed;
      },
      async listBySession(sessionId) {
        return [...store.trips.values()].filter(
          (trip) => trip.sessionId === sessionId,
        );
      },
    },
    sourceInputs: {
      async create(input) {
        const parsed = sourceInputSchema.parse(input);
        store.sourceInputs.set(parsed.id, parsed);
        return parsed;
      },
      async listByTrip(tripId) {
        return [...store.sourceInputs.values()].filter(
          (item) => item.tripId === tripId,
        );
      },
    },
    constraints: {
      async create(constraint) {
        const parsed = constraintSchema.parse(constraint);
        store.constraints.set(parsed.id, parsed);
        return parsed;
      },
      async listByTrip(tripId) {
        return [...store.constraints.values()].filter(
          (item) => item.tripId === tripId,
        );
      },
      async update(constraint) {
        if (!store.constraints.has(constraint.id)) {
          throw new Error(`Constraint ${constraint.id} not found`);
        }
        const parsed = constraintSchema.parse(constraint);
        store.constraints.set(parsed.id, parsed);
        return parsed;
      },
      async delete(id) {
        store.constraints.delete(id);
      },
    },
    placeCandidates: {
      async create(place) {
        const parsed = placeCandidateSchema.parse(place);
        store.placeCandidates.set(parsed.id, parsed);
        return parsed;
      },
      async listByTrip(tripId) {
        return [...store.placeCandidates.values()].filter(
          (item) => item.tripId === tripId,
        );
      },
      async update(place) {
        if (!store.placeCandidates.has(place.id)) {
          throw new Error(`PlaceCandidate ${place.id} not found`);
        }
        const parsed = placeCandidateSchema.parse(place);
        store.placeCandidates.set(parsed.id, parsed);
        return parsed;
      },
    },
    planVersions: {
      async create(version) {
        const parsed = planVersionSchema.parse(version);
        store.planVersions.set(parsed.id, parsed);
        return parsed;
      },
      async getById(id) {
        return store.planVersions.get(id) ?? null;
      },
      async listByTrip(tripId) {
        return [...store.planVersions.values()]
          .filter((item) => item.tripId === tripId)
          .sort((a, b) => a.versionNumber - b.versionNumber);
      },
      async update(version) {
        const existing = store.planVersions.get(version.id);
        if (!existing) {
          throw new Error(`PlanVersion ${version.id} not found`);
        }
        assertPlanVersionMutable(existing);
        assertStatusTransition(existing.status, version.status);
        const parsed = planVersionSchema.parse(version);
        store.planVersions.set(parsed.id, parsed);
        return parsed;
      },
    },
    planItems: {
      async replaceForVersion(versionId, items) {
        const version = store.planVersions.get(versionId);
        if (!version) {
          throw new Error(`PlanVersion ${versionId} not found`);
        }
        assertPlanVersionMutable(version);
        for (const [id, item] of store.planItems) {
          if (item.planVersionId === versionId) {
            store.planItems.delete(id);
          }
        }
        const parsed = items.map((item) => planItemSchema.parse(item));
        for (const item of parsed) {
          store.planItems.set(item.id, item);
        }
        return parsed;
      },
      async listByVersion(versionId) {
        return [...store.planItems.values()]
          .filter((item) => item.planVersionId === versionId)
          .sort((a, b) => a.sortOrder - b.sortOrder);
      },
    },
    evidence: {
      async createMany(items) {
        const parsed = items.map((item) => evidenceSchema.parse(item));
        for (const item of parsed) {
          store.evidence.set(item.id, item);
        }
        return parsed;
      },
      async replaceForVersion(planVersionId, items) {
        for (const [id, item] of store.evidence) {
          if (item.planVersionId === planVersionId) {
            store.evidence.delete(id);
          }
        }
        const parsed = items.map((item) => evidenceSchema.parse(item));
        for (const item of parsed) {
          store.evidence.set(item.id, item);
        }
        return parsed;
      },
      async listByVersion(planVersionId) {
        return [...store.evidence.values()].filter(
          (item) => item.planVersionId === planVersionId,
        );
      },
    },
    conflicts: {
      async createMany(items) {
        const parsed = items.map((item) => conflictSchema.parse(item));
        for (const item of parsed) {
          store.conflicts.set(item.id, item);
        }
        return parsed;
      },
      async replaceForVersion(planVersionId, items) {
        for (const [id, item] of store.conflicts) {
          if (item.planVersionId === planVersionId) {
            store.conflicts.delete(id);
          }
        }
        const parsed = items.map((item) => conflictSchema.parse(item));
        for (const item of parsed) {
          store.conflicts.set(item.id, item);
        }
        return parsed;
      },
      async listByVersion(planVersionId) {
        return [...store.conflicts.values()].filter(
          (item) => item.planVersionId === planVersionId,
        );
      },
      async update(conflict) {
        if (!store.conflicts.has(conflict.id)) {
          throw new Error(`Conflict ${conflict.id} not found`);
        }
        const parsed = conflictSchema.parse(conflict);
        store.conflicts.set(parsed.id, parsed);
        return parsed;
      },
    },
    changeRequests: {
      async create(request) {
        const parsed = changeRequestSchema.parse(request);
        store.changeRequests.set(parsed.id, parsed);
        return parsed;
      },
      async getById(id) {
        return store.changeRequests.get(id) ?? null;
      },
      async update(request) {
        if (!store.changeRequests.has(request.id)) {
          throw new Error(`ChangeRequest ${request.id} not found`);
        }
        const parsed = changeRequestSchema.parse(request);
        store.changeRequests.set(parsed.id, parsed);
        return parsed;
      },
    },
    changeImpacts: {
      async create(record) {
        const parsed = changeImpactRecordSchema.parse(record);
        store.changeImpacts.set(parsed.id, parsed);
        return parsed;
      },
      async getByRequestId(changeRequestId) {
        return (
          [...store.changeImpacts.values()].find(
            (item) => item.changeRequestId === changeRequestId,
          ) ?? null
        );
      },
    },
    bookingTasks: {
      async createMany(tasks) {
        const parsed = tasks.map((task) => bookingTaskSchema.parse(task));
        for (const task of parsed) {
          store.bookingTasks.set(task.id, task);
        }
        return parsed;
      },
      async listByVersion(planVersionId) {
        return [...store.bookingTasks.values()].filter(
          (task) => task.planVersionId === planVersionId,
        );
      },
      async update(task) {
        if (!store.bookingTasks.has(task.id)) {
          throw new Error(`BookingTask ${task.id} not found`);
        }
        const parsed = bookingTaskSchema.parse(task);
        store.bookingTasks.set(parsed.id, parsed);
        return parsed;
      },
    },
    llmUsage: {
      async incrementAndGet(input) {
        const key = usageKey(input.day, input.scope, input.scopeKey);
        const current = store.llmUsage.get(key);
        const next = llmUsageDailySchema.parse({
          id: current?.id ?? createId(),
          day: input.day,
          scope: input.scope,
          scopeKey: input.scopeKey,
          count: (current?.count ?? 0) + 1,
        });
        store.llmUsage.set(key, next);
        return next;
      },
      async get(input) {
        return (
          store.llmUsage.get(
            usageKey(input.day, input.scope, input.scopeKey),
          ) ?? null
        );
      },
    },
    llmCache: {
      async get(input) {
        return (
          store.llmCache.get(
            cacheKey(input.taskType, input.inputHash, input.model),
          ) ?? null
        );
      },
      async set(record) {
        const parsed = llmCacheRecordSchema.parse(record);
        store.llmCache.set(
          cacheKey(parsed.taskType, parsed.inputHash, parsed.model),
          parsed,
        );
        return parsed;
      },
    },
  };
}
