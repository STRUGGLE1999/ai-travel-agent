import { z } from "zod";

export const dataModeSchema = z.enum(["DEMO", "LIVE_PARTIAL"]);
export type DataMode = z.infer<typeof dataModeSchema>;

export const persistenceModeSchema = z.enum(["memory", "postgres"]);
export type PersistenceMode = z.infer<typeof persistenceModeSchema>;

export const tripStatusSchema = z.enum([
  "DRAFT",
  "NEEDS_CONFIRMATION",
  "PLANNING",
  "VERIFYING",
  "BLOCKED",
  "READY_WITH_WARNINGS",
  "READY",
]);
export type TripStatus = z.infer<typeof tripStatusSchema>;

export const constraintKindSchema = z.enum([
  "HARD",
  "SOFT",
  "NEGATIVE",
  "UNKNOWN",
]);
export type ConstraintKind = z.infer<typeof constraintKindSchema>;

export const constraintCategorySchema = z.enum([
  "DATE_TIME",
  "START_END",
  "TRAVELER",
  "MOBILITY",
  "PACE",
  "TRANSPORT",
  "LODGING",
  "BUDGET",
  "MUST_VISIT",
  "AVOID",
  "RESERVATION",
  "WEATHER",
]);
export type ConstraintCategory = z.infer<typeof constraintCategorySchema>;

export const placeCandidateStatusSchema = z.enum([
  "MUST_GO",
  "WANT_TO_GO",
  "OPTIONAL",
  "RAINY_DAY",
  "NEEDS_VERIFICATION",
]);
export type PlaceCandidateStatus = z.infer<typeof placeCandidateStatusSchema>;

export const verificationStatusSchema = z.enum([
  "VERIFIED",
  "STALE",
  "UNKNOWN",
  "MOCK",
  "NOT_REQUIRED",
]);
export type VerificationStatus = z.infer<typeof verificationStatusSchema>;

export const planItemTypeSchema = z.enum([
  "PLACE",
  "TRANSIT",
  "MEAL",
  "REST",
  "CHECK_IN",
  "BUFFER",
]);
export type PlanItemType = z.infer<typeof planItemTypeSchema>;

export const transportModeSchema = z.enum([
  "WALK",
  "TRANSIT",
  "TAXI",
  "FERRY",
  "TRAM",
  "CAR",
]);
export type TransportMode = z.infer<typeof transportModeSchema>;

export const conflictSeveritySchema = z.enum([
  "BLOCKING",
  "HIGH",
  "MEDIUM",
  "LOW",
]);
export type ConflictSeverity = z.infer<typeof conflictSeveritySchema>;

export const bookingTaskStatusSchema = z.enum([
  "UNVERIFIED",
  "TO_BOOK",
  "BOOKED",
  "CANCELLED",
]);
export type BookingTaskStatus = z.infer<typeof bookingTaskStatusSchema>;

export const sourceInputTypeSchema = z.enum([
  "TEXT",
  "CHAT_TRANSCRIPT",
  "DEMO_FIXTURE",
]);
export type SourceInputType = z.infer<typeof sourceInputTypeSchema>;

export const changeRequestStatusSchema = z.enum([
  "PENDING",
  "PREVIEWED",
  "APPROVED",
  "REJECTED",
  "FAILED",
]);
export type ChangeRequestStatus = z.infer<typeof changeRequestStatusSchema>;

export const ignoredBlockReasonSchema = z.enum(["IGNORED_INSTRUCTION"]);
export type IgnoredBlockReason = z.infer<typeof ignoredBlockReasonSchema>;

export const llmTaskTypeSchema = z.enum([
  "extractConstraints",
  "parseChangeRequest",
]);
export type LlmTaskType = z.infer<typeof llmTaskTypeSchema>;

export const llmUsageScopeSchema = z.enum(["SESSION", "IP", "GLOBAL"]);
export type LlmUsageScope = z.infer<typeof llmUsageScopeSchema>;

export const CONFLICT_CODES = {
  TIME_OVERLAP: "TIME_OVERLAP",
  TRANSIT_OVERFLOW: "TRANSIT_OVERFLOW",
  BUFFER_INSUFFICIENT: "BUFFER_INSUFFICIENT",
  OUTSIDE_OPENING_HOURS: "OUTSIDE_OPENING_HOURS",
  MOBILITY_VIOLATION: "MOBILITY_VIOLATION",
  TRANSFER_LIMIT: "TRANSFER_LIMIT",
  TICKET_PLAN_MISMATCH: "TICKET_PLAN_MISMATCH",
  LOCKED_ITEM_CHANGED: "LOCKED_ITEM_CHANGED",
  UNVERIFIED_AS_READY: "UNVERIFIED_AS_READY",
  BUDGET_EXCEEDED: "BUDGET_EXCEEDED",
  WEATHER_VIOLATION: "WEATHER_VIOLATION",
} as const;

export const conflictCodeSchema = z.enum([
  CONFLICT_CODES.TIME_OVERLAP,
  CONFLICT_CODES.TRANSIT_OVERFLOW,
  CONFLICT_CODES.BUFFER_INSUFFICIENT,
  CONFLICT_CODES.OUTSIDE_OPENING_HOURS,
  CONFLICT_CODES.MOBILITY_VIOLATION,
  CONFLICT_CODES.TRANSFER_LIMIT,
  CONFLICT_CODES.TICKET_PLAN_MISMATCH,
  CONFLICT_CODES.LOCKED_ITEM_CHANGED,
  CONFLICT_CODES.UNVERIFIED_AS_READY,
  CONFLICT_CODES.BUDGET_EXCEEDED,
  CONFLICT_CODES.WEATHER_VIOLATION,
]);
export type ConflictCode = z.infer<typeof conflictCodeSchema>;
