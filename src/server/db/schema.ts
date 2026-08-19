import {
  boolean,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const isoTimestamp = (name: string) =>
  timestamp(name, { withTimezone: true, mode: "date" });

export const anonymousSessions = pgTable("anonymous_sessions", {
  id: text("id").primaryKey(),
  createdAt: isoTimestamp("created_at").notNull(),
  lastSeenAt: isoTimestamp("last_seen_at").notNull(),
  ipHash: text("ip_hash"),
});

export const trips = pgTable("trips", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .references(() => anonymousSessions.id),
  title: text("title").notNull(),
  destination: text("destination").notNull(),
  timezone: text("timezone").notNull(),
  dataMode: text("data_mode").notNull(),
  status: text("status").notNull(),
  fixtureId: text("fixture_id"),
  createdAt: isoTimestamp("created_at").notNull(),
  updatedAt: isoTimestamp("updated_at").notNull(),
});

export const sourceInputs = pgTable("source_inputs", {
  id: text("id").primaryKey(),
  tripId: text("trip_id")
    .notNull()
    .references(() => trips.id),
  type: text("type").notNull(),
  rawText: text("raw_text").notNull(),
  sanitizedText: text("sanitized_text").notNull(),
  contentHash: text("content_hash").notNull(),
  ignoredBlocks: jsonb("ignored_blocks").notNull().$type<unknown[]>(),
  createdAt: isoTimestamp("created_at").notNull(),
});

export const constraints = pgTable("constraints", {
  id: text("id").primaryKey(),
  tripId: text("trip_id")
    .notNull()
    .references(() => trips.id),
  sourceInputId: text("source_input_id").references(() => sourceInputs.id),
  category: text("category").notNull(),
  kind: text("kind").notNull(),
  value: jsonb("value").notNull(),
  summary: text("summary").notNull(),
  locked: boolean("locked").notNull().default(false),
  confidence: real("confidence").notNull(),
  sourceQuote: text("source_quote").notNull(),
  needsConfirmation: boolean("needs_confirmation").notNull(),
  createdAt: isoTimestamp("created_at").notNull(),
  updatedAt: isoTimestamp("updated_at").notNull(),
});

export const placeCandidates = pgTable("place_candidates", {
  id: text("id").primaryKey(),
  tripId: text("trip_id")
    .notNull()
    .references(() => trips.id),
  name: text("name").notNull(),
  placeId: text("place_id"),
  lat: real("lat"),
  lng: real("lng"),
  category: text("category"),
  candidateStatus: text("candidate_status").notNull(),
  verificationStatus: text("verification_status").notNull(),
  createdAt: isoTimestamp("created_at").notNull(),
});

export const planVersions = pgTable("plan_versions", {
  id: text("id").primaryKey(),
  tripId: text("trip_id")
    .notNull()
    .references(() => trips.id),
  versionNumber: integer("version_number").notNull(),
  parentVersionId: text("parent_version_id"),
  changeRequestId: text("change_request_id"),
  status: text("status").notNull(),
  confirmedAt: isoTimestamp("confirmed_at"),
  createdAt: isoTimestamp("created_at").notNull(),
});

export const planItems = pgTable("plan_items", {
  id: text("id").primaryKey(),
  planVersionId: text("plan_version_id")
    .notNull()
    .references(() => planVersions.id),
  day: integer("day").notNull(),
  startAt: text("start_at").notNull(),
  endAt: text("end_at").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  placeId: text("place_id"),
  transportMode: text("transport_mode"),
  appliedConstraintIds: jsonb("applied_constraint_ids")
    .notNull()
    .$type<string[]>(),
  evidenceIds: jsonb("evidence_ids").notNull().$type<string[]>(),
  notes: text("notes"),
  sortOrder: integer("sort_order").notNull(),
});

export const evidence = pgTable("evidence", {
  id: text("id").primaryKey(),
  tripId: text("trip_id")
    .notNull()
    .references(() => trips.id),
  planVersionId: text("plan_version_id").references(() => planVersions.id),
  factKey: text("fact_key").notNull(),
  value: jsonb("value").notNull(),
  sourceName: text("source_name").notNull(),
  sourceUrl: text("source_url"),
  provider: text("provider").notNull(),
  checkedAt: isoTimestamp("checked_at"),
  status: text("status").notNull(),
  confidence: real("confidence"),
  expiresAt: isoTimestamp("expires_at"),
  dataMode: text("data_mode").notNull(),
});

export const conflicts = pgTable("conflicts", {
  id: text("id").primaryKey(),
  tripId: text("trip_id")
    .notNull()
    .references(() => trips.id),
  planVersionId: text("plan_version_id")
    .notNull()
    .references(() => planVersions.id),
  severity: text("severity").notNull(),
  code: text("code").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  affectedItemIds: jsonb("affected_item_ids").notNull().$type<string[]>(),
  violatedConstraintIds: jsonb("violated_constraint_ids")
    .notNull()
    .$type<string[]>(),
  suggestedActions: jsonb("suggested_actions").notNull().$type<string[]>(),
  resolved: boolean("resolved").notNull().default(false),
});

export const changeRequests = pgTable("change_requests", {
  id: text("id").primaryKey(),
  tripId: text("trip_id")
    .notNull()
    .references(() => trips.id),
  fromVersionId: text("from_version_id")
    .notNull()
    .references(() => planVersions.id),
  rawText: text("raw_text").notNull(),
  parsedIntent: jsonb("parsed_intent"),
  status: text("status").notNull(),
  createdAt: isoTimestamp("created_at").notNull(),
});

export const changeImpacts = pgTable("change_impacts", {
  id: text("id").primaryKey(),
  changeRequestId: text("change_request_id")
    .notNull()
    .references(() => changeRequests.id),
  impact: jsonb("impact").notNull(),
  createdAt: isoTimestamp("created_at").notNull(),
});

export const bookingTasks = pgTable("booking_tasks", {
  id: text("id").primaryKey(),
  tripId: text("trip_id")
    .notNull()
    .references(() => trips.id),
  planVersionId: text("plan_version_id")
    .notNull()
    .references(() => planVersions.id),
  title: text("title").notNull(),
  placeId: text("place_id"),
  usageDate: text("usage_date").notNull(),
  suggestedTimeWindow: text("suggested_time_window"),
  ticketType: text("ticket_type"),
  partySize: integer("party_size"),
  budgetAmount: real("budget_amount"),
  budgetCurrency: text("budget_currency"),
  status: text("status").notNull(),
  sourceName: text("source_name"),
  sourceUrl: text("source_url"),
  jumpParams: jsonb("jump_params"),
  evidenceId: text("evidence_id"),
});

export const llmUsageDaily = pgTable(
  "llm_usage_daily",
  {
    id: text("id").primaryKey(),
    day: text("day").notNull(),
    scope: text("scope").notNull(),
    scopeKey: text("scope_key").notNull(),
    count: integer("count").notNull().default(0),
  },
  (table) => [
    uniqueIndex("llm_usage_daily_day_scope_key").on(
      table.day,
      table.scope,
      table.scopeKey,
    ),
  ],
);

export const llmCache = pgTable(
  "llm_cache",
  {
    id: text("id").primaryKey(),
    taskType: text("task_type").notNull(),
    inputHash: text("input_hash").notNull(),
    model: text("model").notNull(),
    output: jsonb("output").notNull(),
    createdAt: isoTimestamp("created_at").notNull(),
    expiresAt: isoTimestamp("expires_at"),
  },
  (table) => [
    uniqueIndex("llm_cache_task_input_model").on(
      table.taskType,
      table.inputHash,
      table.model,
    ),
  ],
);
