CREATE TABLE "anonymous_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone NOT NULL,
	"ip_hash" text
);
--> statement-breakpoint
CREATE TABLE "booking_tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"trip_id" text NOT NULL,
	"plan_version_id" text NOT NULL,
	"title" text NOT NULL,
	"place_id" text,
	"usage_date" text NOT NULL,
	"suggested_time_window" text,
	"ticket_type" text,
	"party_size" integer,
	"budget_amount" real,
	"budget_currency" text,
	"status" text NOT NULL,
	"source_name" text,
	"source_url" text,
	"jump_params" jsonb,
	"evidence_id" text
);
--> statement-breakpoint
CREATE TABLE "change_impacts" (
	"id" text PRIMARY KEY NOT NULL,
	"change_request_id" text NOT NULL,
	"impact" jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "change_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"trip_id" text NOT NULL,
	"from_version_id" text NOT NULL,
	"raw_text" text NOT NULL,
	"parsed_intent" jsonb,
	"status" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conflicts" (
	"id" text PRIMARY KEY NOT NULL,
	"trip_id" text NOT NULL,
	"plan_version_id" text NOT NULL,
	"severity" text NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"affected_item_ids" jsonb NOT NULL,
	"violated_constraint_ids" jsonb NOT NULL,
	"suggested_actions" jsonb NOT NULL,
	"resolved" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "constraints" (
	"id" text PRIMARY KEY NOT NULL,
	"trip_id" text NOT NULL,
	"source_input_id" text,
	"category" text NOT NULL,
	"kind" text NOT NULL,
	"value" jsonb NOT NULL,
	"summary" text NOT NULL,
	"locked" boolean DEFAULT false NOT NULL,
	"confidence" real NOT NULL,
	"source_quote" text NOT NULL,
	"needs_confirmation" boolean NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evidence" (
	"id" text PRIMARY KEY NOT NULL,
	"trip_id" text NOT NULL,
	"plan_version_id" text,
	"fact_key" text NOT NULL,
	"value" jsonb NOT NULL,
	"source_name" text NOT NULL,
	"source_url" text,
	"provider" text NOT NULL,
	"checked_at" timestamp with time zone,
	"status" text NOT NULL,
	"confidence" real,
	"expires_at" timestamp with time zone,
	"data_mode" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "llm_cache" (
	"id" text PRIMARY KEY NOT NULL,
	"task_type" text NOT NULL,
	"input_hash" text NOT NULL,
	"model" text NOT NULL,
	"output" jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "llm_usage_daily" (
	"id" text PRIMARY KEY NOT NULL,
	"day" text NOT NULL,
	"scope" text NOT NULL,
	"scope_key" text NOT NULL,
	"count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "place_candidates" (
	"id" text PRIMARY KEY NOT NULL,
	"trip_id" text NOT NULL,
	"name" text NOT NULL,
	"place_id" text,
	"lat" real,
	"lng" real,
	"category" text,
	"candidate_status" text NOT NULL,
	"verification_status" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_items" (
	"id" text PRIMARY KEY NOT NULL,
	"plan_version_id" text NOT NULL,
	"day" integer NOT NULL,
	"start_at" text NOT NULL,
	"end_at" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"place_id" text,
	"transport_mode" text,
	"applied_constraint_ids" jsonb NOT NULL,
	"evidence_ids" jsonb NOT NULL,
	"notes" text,
	"sort_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"trip_id" text NOT NULL,
	"version_number" integer NOT NULL,
	"parent_version_id" text,
	"change_request_id" text,
	"status" text NOT NULL,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_inputs" (
	"id" text PRIMARY KEY NOT NULL,
	"trip_id" text NOT NULL,
	"type" text NOT NULL,
	"raw_text" text NOT NULL,
	"sanitized_text" text NOT NULL,
	"content_hash" text NOT NULL,
	"ignored_blocks" jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trips" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"title" text NOT NULL,
	"destination" text NOT NULL,
	"timezone" text NOT NULL,
	"data_mode" text NOT NULL,
	"status" text NOT NULL,
	"fixture_id" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "booking_tasks" ADD CONSTRAINT "booking_tasks_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_tasks" ADD CONSTRAINT "booking_tasks_plan_version_id_plan_versions_id_fk" FOREIGN KEY ("plan_version_id") REFERENCES "public"."plan_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_impacts" ADD CONSTRAINT "change_impacts_change_request_id_change_requests_id_fk" FOREIGN KEY ("change_request_id") REFERENCES "public"."change_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_requests" ADD CONSTRAINT "change_requests_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_requests" ADD CONSTRAINT "change_requests_from_version_id_plan_versions_id_fk" FOREIGN KEY ("from_version_id") REFERENCES "public"."plan_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conflicts" ADD CONSTRAINT "conflicts_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conflicts" ADD CONSTRAINT "conflicts_plan_version_id_plan_versions_id_fk" FOREIGN KEY ("plan_version_id") REFERENCES "public"."plan_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "constraints" ADD CONSTRAINT "constraints_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "constraints" ADD CONSTRAINT "constraints_source_input_id_source_inputs_id_fk" FOREIGN KEY ("source_input_id") REFERENCES "public"."source_inputs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_plan_version_id_plan_versions_id_fk" FOREIGN KEY ("plan_version_id") REFERENCES "public"."plan_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "place_candidates" ADD CONSTRAINT "place_candidates_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_items" ADD CONSTRAINT "plan_items_plan_version_id_plan_versions_id_fk" FOREIGN KEY ("plan_version_id") REFERENCES "public"."plan_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_versions" ADD CONSTRAINT "plan_versions_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_inputs" ADD CONSTRAINT "source_inputs_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_session_id_anonymous_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."anonymous_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "llm_cache_task_input_model" ON "llm_cache" USING btree ("task_type","input_hash","model");--> statement-breakpoint
CREATE UNIQUE INDEX "llm_usage_daily_day_scope_key" ON "llm_usage_daily" USING btree ("day","scope","scope_key");