import { and, eq, gt, isNull, or, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import * as tables from "@/server/db/schema";
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
import type {
  AnonymousSession,
  BookingTask,
  ChangeImpactRecord,
  ChangeRequest,
  ChangeIntent,
  Conflict,
  Constraint,
  Evidence,
  IgnoredBlock,
  LlmCacheRecord,
  LlmUsageDaily,
  PlaceCandidate,
  PlanItem,
  PlanVersion,
  SourceInput,
  Trip,
} from "@/domain";
import { createId } from "@/lib/ids";
import { assertStatusTransition } from "@/domain/rules/status-machine";
import { assertPlanVersionMutable } from "@/domain/rules/version-immutability";
import type { Repositories } from "@/server/repositories/types";

function iso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function isoRequired(value: Date): string {
  return value.toISOString();
}

function toSession(row: typeof tables.anonymousSessions.$inferSelect): AnonymousSession {
  return anonymousSessionSchema.parse({
    ...row,
    createdAt: isoRequired(row.createdAt),
    lastSeenAt: isoRequired(row.lastSeenAt),
  });
}

function toTrip(row: typeof tables.trips.$inferSelect): Trip {
  return tripSchema.parse({
    ...row,
    createdAt: isoRequired(row.createdAt),
    updatedAt: isoRequired(row.updatedAt),
  });
}

function toSourceInput(row: typeof tables.sourceInputs.$inferSelect): SourceInput {
  return sourceInputSchema.parse({
    ...row,
    ignoredBlocks: row.ignoredBlocks as IgnoredBlock[],
    createdAt: isoRequired(row.createdAt),
  });
}

function toConstraint(row: typeof tables.constraints.$inferSelect): Constraint {
  return constraintSchema.parse({
    ...row,
    createdAt: isoRequired(row.createdAt),
    updatedAt: isoRequired(row.updatedAt),
  });
}

function toPlace(row: typeof tables.placeCandidates.$inferSelect): PlaceCandidate {
  return placeCandidateSchema.parse({
    ...row,
    createdAt: isoRequired(row.createdAt),
  });
}

function toVersion(row: typeof tables.planVersions.$inferSelect): PlanVersion {
  return planVersionSchema.parse({
    ...row,
    confirmedAt: iso(row.confirmedAt),
    createdAt: isoRequired(row.createdAt),
  });
}

function toItem(row: typeof tables.planItems.$inferSelect): PlanItem {
  return planItemSchema.parse(row);
}

function toEvidence(row: typeof tables.evidence.$inferSelect): Evidence {
  return evidenceSchema.parse({
    ...row,
    checkedAt: iso(row.checkedAt),
    expiresAt: iso(row.expiresAt),
  });
}

function toConflict(row: typeof tables.conflicts.$inferSelect): Conflict {
  return conflictSchema.parse(row);
}

function toChangeRequest(row: typeof tables.changeRequests.$inferSelect): ChangeRequest {
  return changeRequestSchema.parse({
    ...row,
    parsedIntent: (row.parsedIntent as ChangeIntent | null) ?? null,
    createdAt: isoRequired(row.createdAt),
  });
}

function toChangeImpact(
  row: typeof tables.changeImpacts.$inferSelect,
): ChangeImpactRecord {
  return changeImpactRecordSchema.parse({
    ...row,
    createdAt: isoRequired(row.createdAt),
  });
}

function toBookingTask(row: typeof tables.bookingTasks.$inferSelect): BookingTask {
  return bookingTaskSchema.parse(row);
}

function toUsage(row: typeof tables.llmUsageDaily.$inferSelect): LlmUsageDaily {
  return llmUsageDailySchema.parse(row);
}

function toCache(row: typeof tables.llmCache.$inferSelect): LlmCacheRecord {
  return llmCacheRecordSchema.parse({
    ...row,
    createdAt: isoRequired(row.createdAt),
    expiresAt: iso(row.expiresAt),
  });
}

export function createPostgresRepositories(): Repositories {
  const db = getDb();

  return {
    persistence: "postgres",
    sessions: {
      async create(session) {
        const parsed = anonymousSessionSchema.parse(session);
        const [row] = await db
          .insert(tables.anonymousSessions)
          .values({
            ...parsed,
            createdAt: new Date(parsed.createdAt),
            lastSeenAt: new Date(parsed.lastSeenAt),
          })
          .returning();
        return toSession(row);
      },
      async getById(id) {
        const rows = await db
          .select()
          .from(tables.anonymousSessions)
          .where(eq(tables.anonymousSessions.id, id))
          .limit(1);
        return rows[0] ? toSession(rows[0]) : null;
      },
      async touch(id, lastSeenAt, ipHash) {
        await db
          .update(tables.anonymousSessions)
          .set({
            lastSeenAt: new Date(lastSeenAt),
            ...(ipHash === undefined ? {} : { ipHash }),
          })
          .where(eq(tables.anonymousSessions.id, id));
      },
    },
    trips: {
      async create(trip) {
        const parsed = tripSchema.parse(trip);
        const [row] = await db
          .insert(tables.trips)
          .values({
            ...parsed,
            createdAt: new Date(parsed.createdAt),
            updatedAt: new Date(parsed.updatedAt),
          })
          .returning();
        return toTrip(row);
      },
      async getById(id) {
        const rows = await db
          .select()
          .from(tables.trips)
          .where(eq(tables.trips.id, id))
          .limit(1);
        return rows[0] ? toTrip(rows[0]) : null;
      },
      async update(trip) {
        const existing = await this.getById(trip.id);
        if (!existing) {
          throw new Error(`Trip ${trip.id} not found`);
        }
        assertStatusTransition(existing.status, trip.status);
        const parsed = tripSchema.parse(trip);
        const [row] = await db
          .update(tables.trips)
          .set({
            ...parsed,
            createdAt: new Date(parsed.createdAt),
            updatedAt: new Date(parsed.updatedAt),
          })
          .where(eq(tables.trips.id, parsed.id))
          .returning();
        return toTrip(row);
      },
      async listBySession(sessionId) {
        const rows = await db
          .select()
          .from(tables.trips)
          .where(eq(tables.trips.sessionId, sessionId));
        return rows.map(toTrip);
      },
    },
    sourceInputs: {
      async create(input) {
        const parsed = sourceInputSchema.parse(input);
        const [row] = await db
          .insert(tables.sourceInputs)
          .values({
            ...parsed,
            createdAt: new Date(parsed.createdAt),
          })
          .returning();
        return toSourceInput(row);
      },
      async listByTrip(tripId) {
        const rows = await db
          .select()
          .from(tables.sourceInputs)
          .where(eq(tables.sourceInputs.tripId, tripId));
        return rows.map(toSourceInput);
      },
    },
    constraints: {
      async create(constraint) {
        const parsed = constraintSchema.parse(constraint);
        const [row] = await db
          .insert(tables.constraints)
          .values({
            ...parsed,
            createdAt: new Date(parsed.createdAt),
            updatedAt: new Date(parsed.updatedAt),
          })
          .returning();
        return toConstraint(row);
      },
      async listByTrip(tripId) {
        const rows = await db
          .select()
          .from(tables.constraints)
          .where(eq(tables.constraints.tripId, tripId));
        return rows.map(toConstraint);
      },
      async update(constraint) {
        const parsed = constraintSchema.parse(constraint);
        const [row] = await db
          .update(tables.constraints)
          .set({
            ...parsed,
            createdAt: new Date(parsed.createdAt),
            updatedAt: new Date(parsed.updatedAt),
          })
          .where(eq(tables.constraints.id, parsed.id))
          .returning();
        if (!row) {
          throw new Error(`Constraint ${parsed.id} not found`);
        }
        return toConstraint(row);
      },
      async delete(id) {
        await db.delete(tables.constraints).where(eq(tables.constraints.id, id));
      },
    },
    placeCandidates: {
      async create(place) {
        const parsed = placeCandidateSchema.parse(place);
        const [row] = await db
          .insert(tables.placeCandidates)
          .values({
            ...parsed,
            createdAt: new Date(parsed.createdAt),
          })
          .returning();
        return toPlace(row);
      },
      async listByTrip(tripId) {
        const rows = await db
          .select()
          .from(tables.placeCandidates)
          .where(eq(tables.placeCandidates.tripId, tripId));
        return rows.map(toPlace);
      },
      async update(place) {
        const parsed = placeCandidateSchema.parse(place);
        const [row] = await db
          .update(tables.placeCandidates)
          .set({
            ...parsed,
            createdAt: new Date(parsed.createdAt),
          })
          .where(eq(tables.placeCandidates.id, parsed.id))
          .returning();
        if (!row) {
          throw new Error(`PlaceCandidate ${parsed.id} not found`);
        }
        return toPlace(row);
      },
    },
    planVersions: {
      async create(version) {
        const parsed = planVersionSchema.parse(version);
        const [row] = await db
          .insert(tables.planVersions)
          .values({
            ...parsed,
            confirmedAt: parsed.confirmedAt ? new Date(parsed.confirmedAt) : null,
            createdAt: new Date(parsed.createdAt),
          })
          .returning();
        return toVersion(row);
      },
      async getById(id) {
        const rows = await db
          .select()
          .from(tables.planVersions)
          .where(eq(tables.planVersions.id, id))
          .limit(1);
        return rows[0] ? toVersion(rows[0]) : null;
      },
      async listByTrip(tripId) {
        const rows = await db
          .select()
          .from(tables.planVersions)
          .where(eq(tables.planVersions.tripId, tripId));
        return rows.map(toVersion).sort((a, b) => a.versionNumber - b.versionNumber);
      },
      async update(version) {
        const existing = await this.getById(version.id);
        if (!existing) {
          throw new Error(`PlanVersion ${version.id} not found`);
        }
        assertPlanVersionMutable(existing);
        assertStatusTransition(existing.status, version.status);
        const parsed = planVersionSchema.parse(version);
        const [row] = await db
          .update(tables.planVersions)
          .set({
            ...parsed,
            confirmedAt: parsed.confirmedAt ? new Date(parsed.confirmedAt) : null,
            createdAt: new Date(parsed.createdAt),
          })
          .where(eq(tables.planVersions.id, parsed.id))
          .returning();
        return toVersion(row);
      },
    },
    planItems: {
      async replaceForVersion(versionId, items) {
        const version = (
          await db
            .select()
            .from(tables.planVersions)
            .where(eq(tables.planVersions.id, versionId))
            .limit(1)
        )[0];
        if (!version) {
          throw new Error(`PlanVersion ${versionId} not found`);
        }
        assertPlanVersionMutable(toVersion(version));
        await db
          .delete(tables.planItems)
          .where(eq(tables.planItems.planVersionId, versionId));
        if (items.length === 0) {
          return [];
        }
        const parsed = items.map((item) => planItemSchema.parse(item));
        const rows = await db.insert(tables.planItems).values(parsed).returning();
        return rows.map(toItem);
      },
      async listByVersion(versionId) {
        const rows = await db
          .select()
          .from(tables.planItems)
          .where(eq(tables.planItems.planVersionId, versionId));
        return rows.map(toItem).sort((a, b) => a.sortOrder - b.sortOrder);
      },
    },
    evidence: {
      async createMany(items) {
        if (items.length === 0) {
          return [];
        }
        const parsed = items.map((item) => evidenceSchema.parse(item));
        const rows = await db
          .insert(tables.evidence)
          .values(
            parsed.map((item) => ({
              ...item,
              checkedAt: item.checkedAt ? new Date(item.checkedAt) : null,
              expiresAt: item.expiresAt ? new Date(item.expiresAt) : null,
            })),
          )
          .returning();
        return rows.map(toEvidence);
      },
      async replaceForVersion(planVersionId, items) {
        await db
          .delete(tables.evidence)
          .where(eq(tables.evidence.planVersionId, planVersionId));
        return this.createMany(items);
      },
      async listByVersion(planVersionId) {
        const rows = await db
          .select()
          .from(tables.evidence)
          .where(eq(tables.evidence.planVersionId, planVersionId));
        return rows.map(toEvidence);
      },
    },
    conflicts: {
      async createMany(items) {
        if (items.length === 0) {
          return [];
        }
        const parsed = items.map((item) => conflictSchema.parse(item));
        const rows = await db.insert(tables.conflicts).values(parsed).returning();
        return rows.map(toConflict);
      },
      async replaceForVersion(planVersionId, items) {
        await db
          .delete(tables.conflicts)
          .where(eq(tables.conflicts.planVersionId, planVersionId));
        return this.createMany(items);
      },
      async listByVersion(planVersionId) {
        const rows = await db
          .select()
          .from(tables.conflicts)
          .where(eq(tables.conflicts.planVersionId, planVersionId));
        return rows.map(toConflict);
      },
      async update(conflict) {
        const parsed = conflictSchema.parse(conflict);
        const [row] = await db
          .update(tables.conflicts)
          .set(parsed)
          .where(eq(tables.conflicts.id, parsed.id))
          .returning();
        if (!row) {
          throw new Error(`Conflict ${parsed.id} not found`);
        }
        return toConflict(row);
      },
    },
    changeRequests: {
      async create(request) {
        const parsed = changeRequestSchema.parse(request);
        const [row] = await db
          .insert(tables.changeRequests)
          .values({
            ...parsed,
            createdAt: new Date(parsed.createdAt),
          })
          .returning();
        return toChangeRequest(row);
      },
      async getById(id) {
        const rows = await db
          .select()
          .from(tables.changeRequests)
          .where(eq(tables.changeRequests.id, id))
          .limit(1);
        return rows[0] ? toChangeRequest(rows[0]) : null;
      },
      async update(request) {
        const parsed = changeRequestSchema.parse(request);
        const [row] = await db
          .update(tables.changeRequests)
          .set({
            ...parsed,
            createdAt: new Date(parsed.createdAt),
          })
          .where(eq(tables.changeRequests.id, parsed.id))
          .returning();
        if (!row) {
          throw new Error(`ChangeRequest ${parsed.id} not found`);
        }
        return toChangeRequest(row);
      },
    },
    changeImpacts: {
      async create(record) {
        const parsed = changeImpactRecordSchema.parse(record);
        const [row] = await db
          .insert(tables.changeImpacts)
          .values({
            ...parsed,
            createdAt: new Date(parsed.createdAt),
          })
          .returning();
        return toChangeImpact(row);
      },
      async getByRequestId(changeRequestId) {
        const rows = await db
          .select()
          .from(tables.changeImpacts)
          .where(eq(tables.changeImpacts.changeRequestId, changeRequestId))
          .limit(1);
        return rows[0] ? toChangeImpact(rows[0]) : null;
      },
    },
    bookingTasks: {
      async createMany(tasks) {
        if (tasks.length === 0) {
          return [];
        }
        const parsed = tasks.map((task) => bookingTaskSchema.parse(task));
        const rows = await db.insert(tables.bookingTasks).values(parsed).returning();
        return rows.map(toBookingTask);
      },
      async listByVersion(planVersionId) {
        const rows = await db
          .select()
          .from(tables.bookingTasks)
          .where(eq(tables.bookingTasks.planVersionId, planVersionId));
        return rows.map(toBookingTask);
      },
      async update(task) {
        const parsed = bookingTaskSchema.parse(task);
        const [row] = await db
          .update(tables.bookingTasks)
          .set(parsed)
          .where(eq(tables.bookingTasks.id, parsed.id))
          .returning();
        if (!row) {
          throw new Error(`BookingTask ${parsed.id} not found`);
        }
        return toBookingTask(row);
      },
    },
    llmUsage: {
      async incrementAndGet(input) {
        const [row] = await db
          .insert(tables.llmUsageDaily)
          .values({
            id: createId(),
            day: input.day,
            scope: input.scope,
            scopeKey: input.scopeKey,
            count: 1,
          })
          .onConflictDoUpdate({
            target: [
              tables.llmUsageDaily.day,
              tables.llmUsageDaily.scope,
              tables.llmUsageDaily.scopeKey,
            ],
            set: { count: sql`${tables.llmUsageDaily.count} + 1` },
          })
          .returning();
        return toUsage(row);
      },
      async get(input) {
        const rows = await db
          .select()
          .from(tables.llmUsageDaily)
          .where(
            and(
              eq(tables.llmUsageDaily.day, input.day),
              eq(tables.llmUsageDaily.scope, input.scope),
              eq(tables.llmUsageDaily.scopeKey, input.scopeKey),
            ),
          )
          .limit(1);
        return rows[0] ? toUsage(rows[0]) : null;
      },
    },
    llmCache: {
      async get(input) {
        const rows = await db
          .select()
          .from(tables.llmCache)
          .where(
            and(
              eq(tables.llmCache.taskType, input.taskType),
              eq(tables.llmCache.inputHash, input.inputHash),
              eq(tables.llmCache.model, input.model),
              or(
                isNull(tables.llmCache.expiresAt),
                gt(tables.llmCache.expiresAt, new Date()),
              ),
            ),
          )
          .limit(1);
        return rows[0] ? toCache(rows[0]) : null;
      },
      async set(record) {
        const parsed = llmCacheRecordSchema.parse(record);
        const [row] = await db
          .insert(tables.llmCache)
          .values({
            ...parsed,
            createdAt: new Date(parsed.createdAt),
            expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : null,
          })
          .onConflictDoUpdate({
            target: [
              tables.llmCache.taskType,
              tables.llmCache.inputHash,
              tables.llmCache.model,
            ],
            set: {
              output: parsed.output,
              createdAt: new Date(parsed.createdAt),
              expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : null,
            },
          })
          .returning();
        return toCache(row);
      },
    },
  };
}
