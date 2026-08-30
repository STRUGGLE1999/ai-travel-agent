import { createId } from "@/lib/ids";
import { systemClock, toIso } from "@/lib/clock";
import { getDataMode } from "@/lib/env";
import type {
  BookingTask,
  ChangeImpact,
  Constraint,
  PlanItem,
  PlanVersion,
  Trip,
  TripStatus,
} from "@/domain";
import { derivePlanStatus } from "@/domain/rules/verification-status";
import { hasUnresolvedHardConstraints } from "@/domain/rules/status-machine";
import { buildCandidatePlanItems } from "@/domain/planner/candidate";
import { runFeasibilityChecks } from "@/domain/rules/feasibility";
import { computeChange } from "@/domain/change/engine";
import { sanitizeImportedText } from "@/services/ai/sanitizer";
import { createGatedAiProvider } from "@/services/ai/gate";
import { getFixture, dateForDay } from "@/fixtures";
import type { TripFixture } from "@/fixtures";
import { sha256Hex } from "@/lib/ids";
import type { Repositories } from "@/server/repositories/types";

export interface ActorContext {
  repos: Repositories;
  sessionId: string;
  ipHash: string | null;
}

function now(): string {
  return toIso(systemClock.now());
}

export async function createTrip(
  ctx: ActorContext,
  input: {
    fixtureId?: "hong-kong" | "beijing";
    title?: string;
    destination?: string;
  },
): Promise<Trip> {
  const fixture = input.fixtureId ? getFixture(input.fixtureId) : null;
  const trip: Trip = {
    id: createId(),
    sessionId: ctx.sessionId,
    title: fixture?.title ?? input.title ?? "未命名行程",
    destination: fixture?.destination ?? input.destination ?? "未指定",
    timezone: fixture?.timezone ?? "Asia/Shanghai",
    dataMode: getDataMode(),
    status: "DRAFT",
    fixtureId: fixture?.fixtureId ?? null,
    createdAt: now(),
    updatedAt: now(),
  };
  return ctx.repos.trips.create(trip);
}

export interface ExtractionSummary {
  degraded: boolean;
  degradeReason?: string;
  provider: string;
  cached: boolean;
  constraintCount: number;
  ignoredCount: number;
}

export async function importTextAndExtract(
  ctx: ActorContext,
  input: { tripId: string; text: string },
): Promise<ExtractionSummary> {
  const trip = await mustGetTrip(ctx, input.tripId);
  const { sanitizedText, ignoredBlocks } = sanitizeImportedText(input.text);

  const sourceInput = await ctx.repos.sourceInputs.create({
    id: createId(),
    tripId: trip.id,
    type: "TEXT",
    rawText: input.text.slice(0, 40000),
    sanitizedText,
    contentHash: await sha256Hex(sanitizedText),
    ignoredBlocks,
    createdAt: now(),
  });

  const ai = createGatedAiProvider({
    repos: ctx.repos,
    sessionId: ctx.sessionId,
    ipHash: ctx.ipHash,
  });
  const result = await ai.extractConstraints({
    text: sanitizedText,
    destination: trip.destination,
  });

  // Model output already passed Zod inside the provider; persist now.
  for (const extracted of result.data.constraints) {
    await ctx.repos.constraints.create({
      id: createId(),
      tripId: trip.id,
      sourceInputId: sourceInput.id,
      category: extracted.category,
      kind: extracted.kind,
      value: extracted.value ?? {},
      summary: extracted.summary,
      locked: false,
      confidence: extracted.confidence,
      sourceQuote: extracted.sourceQuote,
      needsConfirmation: extracted.needsConfirmation,
      createdAt: now(),
      updatedAt: now(),
    });
  }
  for (const candidate of result.data.placeCandidates) {
    await ctx.repos.placeCandidates.create({
      id: createId(),
      tripId: trip.id,
      name: candidate.name,
      placeId: null,
      lat: null,
      lng: null,
      category: candidate.category,
      candidateStatus: candidate.candidateStatus,
      verificationStatus: "MOCK",
      createdAt: now(),
    });
  }

  // Instruction blocks found by the extractor (in addition to the
  // sanitizer) are appended to the stored source input record via a
  // fresh record only when new ones appear; for MVP the sanitizer list
  // is the canonical one shown in the UI.

  await ctx.repos.trips.update({
    ...trip,
    status: "NEEDS_CONFIRMATION",
    updatedAt: now(),
  });

  return {
    degraded: result.degraded,
    degradeReason: result.degradeReason,
    provider: result.provider,
    cached: result.cached,
    constraintCount: result.data.constraints.length,
    ignoredCount:
      ignoredBlocks.length + result.data.ignoredBlocks.length,
  };
}

export async function createDemoTrip(
  ctx: ActorContext,
  fixtureId: "hong-kong" | "beijing",
): Promise<Trip> {
  const fixture = getFixture(fixtureId);
  if (!fixture) {
    throw new Error(`Unknown fixture ${fixtureId}`);
  }
  const trip = await createTrip(ctx, { fixtureId });
  await importDemoFixture(ctx, trip, fixture);
  return trip;
}

async function importDemoFixture(
  ctx: ActorContext,
  trip: Trip,
  fixture: TripFixture,
): Promise<void> {
  const { sanitizedText, ignoredBlocks } = sanitizeImportedText(
    fixture.demoSourceText,
  );
  const sourceInput = await ctx.repos.sourceInputs.create({
    id: createId(),
    tripId: trip.id,
    type: "DEMO_FIXTURE",
    rawText: fixture.demoSourceText,
    sanitizedText,
    contentHash: await sha256Hex(sanitizedText),
    ignoredBlocks:
      ignoredBlocks.length > 0
        ? ignoredBlocks
        : fixture.extraction.ignoredBlocks,
    createdAt: now(),
  });

  for (const extracted of fixture.extraction.constraints) {
    await ctx.repos.constraints.create({
      id: createId(),
      tripId: trip.id,
      sourceInputId: sourceInput.id,
      category: extracted.category,
      kind: extracted.kind,
      value: extracted.value ?? {},
      summary: extracted.summary,
      locked: false,
      confidence: extracted.confidence,
      sourceQuote: extracted.sourceQuote,
      needsConfirmation: extracted.needsConfirmation,
      createdAt: now(),
      updatedAt: now(),
    });
  }
  for (const candidate of fixture.extraction.placeCandidates) {
    await ctx.repos.placeCandidates.create({
      id: createId(),
      tripId: trip.id,
      name: candidate.name,
      placeId: null,
      lat: null,
      lng: null,
      category: candidate.category,
      candidateStatus: candidate.candidateStatus,
      verificationStatus: "MOCK",
      createdAt: now(),
    });
  }

  await ctx.repos.trips.update({
    ...trip,
    status: "NEEDS_CONFIRMATION",
    updatedAt: now(),
  });
}

export async function updateConstraint(
  ctx: ActorContext,
  input: {
    constraintId: string;
    tripId: string;
    patch: Partial<
      Pick<Constraint, "summary" | "locked" | "needsConfirmation" | "kind">
    >;
  },
): Promise<Constraint> {
  await mustGetTrip(ctx, input.tripId);
  const constraints = await ctx.repos.constraints.listByTrip(input.tripId);
  const target = constraints.find((item) => item.id === input.constraintId);
  if (!target) {
    throw new Error("Constraint not found");
  }
  return ctx.repos.constraints.update({
    ...target,
    ...input.patch,
    updatedAt: now(),
  });
}

export async function confirmAllHardConstraints(
  ctx: ActorContext,
  tripId: string,
): Promise<number> {
  await mustGetTrip(ctx, tripId);
  const constraints = await ctx.repos.constraints.listByTrip(tripId);
  const pending = constraints.filter(
    (item) => item.kind === "HARD" && item.needsConfirmation,
  );
  for (const item of pending) {
    await ctx.repos.constraints.update({
      ...item,
      needsConfirmation: false,
      locked: true,
      updatedAt: now(),
    });
  }
  return pending.length;
}

export async function deleteConstraint(
  ctx: ActorContext,
  input: { tripId: string; constraintId: string },
): Promise<void> {
  await mustGetTrip(ctx, input.tripId);
  const constraints = await ctx.repos.constraints.listByTrip(input.tripId);
  if (!constraints.some((item) => item.id === input.constraintId)) {
    throw new TripAccessDeniedError();
  }
  await ctx.repos.constraints.delete(input.constraintId);
}

export async function confirmConstraintsAndPlan(
  ctx: ActorContext,
  tripId: string,
): Promise<{ planVersionId: string; status: TripStatus }> {
  const trip = await mustGetTrip(ctx, tripId);
  const fixture = getFixture(trip.fixtureId);
  if (!fixture) {
    throw new Error("当前 MVP 仅支持从演示场景生成计划");
  }
  const constraints = await ctx.repos.constraints.listByTrip(tripId);
  if (hasUnresolvedHardConstraints(constraints)) {
    throw new Error("仍有待确认的硬约束，无法生成最终计划");
  }

  await ctx.repos.trips.update({
    ...trip,
    status: "PLANNING",
    updatedAt: now(),
  });

  const existingVersions = await ctx.repos.planVersions.listByTrip(tripId);
  const version: PlanVersion = await ctx.repos.planVersions.create({
    id: createId(),
    tripId,
    versionNumber:
      (existingVersions[existingVersions.length - 1]?.versionNumber ?? 0) + 1,
    parentVersionId:
      existingVersions[existingVersions.length - 1]?.id ?? null,
    changeRequestId: null,
    status: "PLANNING",
    confirmedAt: null,
    createdAt: now(),
  });

  const items = buildCandidatePlanItems({
    fixture,
    planVersionId: version.id,
    constraints,
  });
  await ctx.repos.planItems.replaceForVersion(version.id, items);

  // Default booking tasks (the HK default deliberately seeds the
  // round-trip-ticket vs taxi-descent conflict from the source chat).
  const tasks: BookingTask[] = fixture.bookingTasks.map((template) => ({
    id: createId(),
    tripId,
    planVersionId: version.id,
    title: template.title,
    placeId: template.placeId,
    usageDate: dateForDay(fixture, template.usageDay),
    suggestedTimeWindow: template.suggestedTimeWindow,
    ticketType: template.ticketType,
    partySize: template.partySize,
    budgetAmount: null,
    budgetCurrency: null,
    status: "UNVERIFIED",
    sourceName: template.sourceName,
    sourceUrl: template.sourceUrl,
    jumpParams: {
      usageDate: dateForDay(fixture, template.usageDay),
      partySize: template.partySize,
      ticketType: template.ticketType,
    },
    evidenceId: null,
  }));
  await ctx.repos.bookingTasks.createMany(tasks);

  const status = await verifyVersion(ctx, trip, fixture, version.id);
  return { planVersionId: version.id, status };
}

export async function verifyVersion(
  ctx: ActorContext,
  trip: Trip,
  fixture: TripFixture,
  planVersionId: string,
): Promise<TripStatus> {
  const version = await ctx.repos.planVersions.getById(planVersionId);
  if (!version) {
    throw new Error("PlanVersion not found");
  }
  const items = await ctx.repos.planItems.listByVersion(planVersionId);
  const constraints = await ctx.repos.constraints.listByTrip(trip.id);
  const ticketId = await getSelectedTicketId(ctx, planVersionId);

  await ctx.repos.planVersions.update({ ...version, status: "VERIFYING" });

  const { conflicts, evidence } = runFeasibilityChecks({
    tripId: trip.id,
    planVersionId,
    fixture,
    constraints,
    items,
    selectedTicketId: ticketId,
    checkedAtIso: now(),
  });

  await ctx.repos.conflicts.replaceForVersion(planVersionId, conflicts);
  await ctx.repos.evidence.replaceForVersion(planVersionId, evidence);

  const status = derivePlanStatus({ conflicts, evidence });
  const verifying = await ctx.repos.planVersions.getById(planVersionId);
  if (verifying) {
    await ctx.repos.planVersions.update({ ...verifying, status });
  }

  // Route the trip status through legal transitions:
  // (anything) → PLANNING → VERIFYING → derived status.
  let freshTrip = await mustGetTrip(ctx, trip.id);
  if (freshTrip.status !== "PLANNING" && freshTrip.status !== "VERIFYING") {
    await ctx.repos.trips.update({
      ...freshTrip,
      status: "PLANNING",
      updatedAt: now(),
    });
    freshTrip = await mustGetTrip(ctx, trip.id);
  }
  if (freshTrip.status === "PLANNING") {
    await ctx.repos.trips.update({
      ...freshTrip,
      status: "VERIFYING",
      updatedAt: now(),
    });
    freshTrip = await mustGetTrip(ctx, trip.id);
  }
  await ctx.repos.trips.update({
    ...freshTrip,
    status,
    updatedAt: now(),
  });
  return status;
}

async function getSelectedTicketId(
  ctx: ActorContext,
  planVersionId: string,
): Promise<string | null> {
  const tasks = await ctx.repos.bookingTasks.listByVersion(planVersionId);
  const peakTask = tasks.find((task) =>
    task.title.includes("缆车"),
  );
  return peakTask?.ticketType ?? null;
}

export async function selectTicket(
  ctx: ActorContext,
  input: { tripId: string; planVersionId: string; ticketId: string },
): Promise<TripStatus> {
  const trip = await mustGetTrip(ctx, input.tripId);
  const fixture = getFixture(trip.fixtureId);
  if (!fixture) {
    throw new Error("Fixture not found");
  }
  const version = await ctx.repos.planVersions.getById(input.planVersionId);
  if (!version || version.tripId !== input.tripId) {
    throw new TripAccessDeniedError();
  }
  if (version.confirmedAt) {
    throw new Error("已确认版本不可修改，请通过变更流程创建新版本");
  }

  const tasks = await ctx.repos.bookingTasks.listByVersion(
    input.planVersionId,
  );
  const peakTask = tasks.find((task) => task.title.includes("缆车"));
  if (peakTask) {
    await ctx.repos.bookingTasks.update({
      ...peakTask,
      ticketType: input.ticketId,
      jumpParams: { ...(peakTask.jumpParams ?? {}), ticketType: input.ticketId },
    });
  }

  // Re-verify the draft version with the new ticket selection.
  await resetVersionForReverify(ctx, version);
  return verifyVersion(ctx, trip, fixture, input.planVersionId);
}

async function resetVersionForReverify(
  ctx: ActorContext,
  version: PlanVersion,
): Promise<void> {
  // Move status back to PLANNING so VERIFYING transition is legal.
  const current = await ctx.repos.planVersions.getById(version.id);
  if (current && current.status !== "PLANNING") {
    await ctx.repos.planVersions.update({ ...current, status: "PLANNING" });
  }
  const trip = await ctx.repos.trips.getById(version.tripId);
  if (trip && trip.status !== "PLANNING") {
    await ctx.repos.trips.update({
      ...trip,
      status: "PLANNING",
      updatedAt: now(),
    });
  }
}

export async function confirmVersion(
  ctx: ActorContext,
  input: { tripId: string; planVersionId: string },
): Promise<void> {
  await mustGetTrip(ctx, input.tripId);
  const version = await ctx.repos.planVersions.getById(input.planVersionId);
  if (!version || version.tripId !== input.tripId) {
    throw new TripAccessDeniedError();
  }
  const conflicts = await ctx.repos.conflicts.listByVersion(version.id);
  const blocking = conflicts.some(
    (conflict) => conflict.severity === "BLOCKING" && !conflict.resolved,
  );
  if (blocking) {
    throw new Error("存在阻断冲突，无法确认此版本");
  }
  await ctx.repos.planVersions.update({
    ...version,
    confirmedAt: now(),
  });
}

export interface ChangePreview {
  changeRequestId: string;
  impact: ChangeImpact;
  degraded: boolean;
  degradeReason?: string;
  provider: string;
  cached: boolean;
}

export async function previewChange(
  ctx: ActorContext,
  input: { tripId: string; text: string },
): Promise<ChangePreview> {
  const trip = await mustGetTrip(ctx, input.tripId);
  const fixture = getFixture(trip.fixtureId);
  if (!fixture) {
    throw new Error("Fixture not found");
  }
  const versions = await ctx.repos.planVersions.listByTrip(input.tripId);
  const latest = versions[versions.length - 1];
  if (!latest) {
    throw new Error("请先生成候选计划");
  }

  const ai = createGatedAiProvider({
    repos: ctx.repos,
    sessionId: ctx.sessionId,
    ipHash: ctx.ipHash,
  });
  const parsed = await ai.parseChangeRequest({ text: input.text });

  const items = await ctx.repos.planItems.listByVersion(latest.id);
  const currentTicketId = await getSelectedTicketId(ctx, latest.id);
  const constraints = await ctx.repos.constraints.listByTrip(input.tripId);

  const computation = computeChange({
    request: input.text,
    intent: parsed.data,
    items,
    fixture,
    planVersionId: latest.id,
    currentTicketId,
  });

  const previousConflicts = await ctx.repos.conflicts.listByVersion(latest.id);
  const { conflicts: nextConflicts } = runFeasibilityChecks({
    tripId: trip.id,
    planVersionId: latest.id,
    fixture,
    constraints,
    items: computation.nextItems,
    selectedTicketId:
      computation.nextTicketId === undefined
        ? currentTicketId
        : computation.nextTicketId,
    checkedAtIso: now(),
  });

  const resolvedConflictIds = previousConflicts
    .filter(
      (previous) =>
        !previous.resolved &&
        !nextConflicts.some((nextC) => nextC.code === previous.code),
    )
    .map((conflict) => conflict.id);
  const trulyNewConflicts = nextConflicts.filter(
    (nextC) =>
      !previousConflicts.some(
        (previous) => previous.code === nextC.code && !previous.resolved,
      ),
  );

  const impact: ChangeImpact = {
    ...computation.impact,
    newConflicts: trulyNewConflicts,
    resolvedConflictIds,
  };

  const changeRequest = await ctx.repos.changeRequests.create({
    id: createId(),
    tripId: input.tripId,
    fromVersionId: latest.id,
    rawText: input.text,
    parsedIntent: parsed.data,
    status: "PREVIEWED",
    createdAt: now(),
  });
  await ctx.repos.changeImpacts.create({
    id: createId(),
    changeRequestId: changeRequest.id,
    impact,
    createdAt: now(),
  });

  return {
    changeRequestId: changeRequest.id,
    impact,
    degraded: parsed.degraded,
    degradeReason: parsed.degradeReason,
    provider: parsed.provider,
    cached: parsed.cached,
  };
}

export async function applyChange(
  ctx: ActorContext,
  input: { tripId: string; changeRequestId: string },
): Promise<{ planVersionId: string; status: TripStatus }> {
  const trip = await mustGetTrip(ctx, input.tripId);
  const fixture = getFixture(trip.fixtureId);
  if (!fixture) {
    throw new Error("Fixture not found");
  }
  const request = await ctx.repos.changeRequests.getById(
    input.changeRequestId,
  );
  if (!request || request.tripId !== input.tripId) {
    throw new TripAccessDeniedError();
  }
  if (!request.parsedIntent) {
    throw new Error("ChangeRequest not found or unparsed");
  }
  const fromVersion = await ctx.repos.planVersions.getById(
    request.fromVersionId,
  );
  if (!fromVersion) {
    throw new Error("Source version missing");
  }

  const items = await ctx.repos.planItems.listByVersion(fromVersion.id);
  const currentTicketId = await getSelectedTicketId(ctx, fromVersion.id);
  const constraints = await ctx.repos.constraints.listByTrip(input.tripId);

  await ctx.repos.trips.update({
    ...trip,
    status: "PLANNING",
    updatedAt: now(),
  });

  const versions = await ctx.repos.planVersions.listByTrip(input.tripId);
  const newVersion = await ctx.repos.planVersions.create({
    id: createId(),
    tripId: input.tripId,
    versionNumber:
      (versions[versions.length - 1]?.versionNumber ?? 0) + 1,
    parentVersionId: fromVersion.id,
    changeRequestId: request.id,
    status: "PLANNING",
    confirmedAt: null,
    createdAt: now(),
  });

  const computation = computeChange({
    request: request.rawText,
    intent: request.parsedIntent,
    items,
    fixture,
    planVersionId: newVersion.id,
    currentTicketId,
  });
  const nextItems: PlanItem[] = computation.nextItems.map((item) => ({
    ...item,
    planVersionId: newVersion.id,
  }));
  await ctx.repos.planItems.replaceForVersion(newVersion.id, nextItems);

  // Copy booking tasks to the new version, applying ticket changes.
  const previousTasks = await ctx.repos.bookingTasks.listByVersion(
    fromVersion.id,
  );
  const nextTicket =
    computation.nextTicketId === undefined
      ? currentTicketId
      : computation.nextTicketId;
  await ctx.repos.bookingTasks.createMany(
    previousTasks.map((task) => ({
      ...task,
      id: createId(),
      planVersionId: newVersion.id,
      ticketType: task.title.includes("缆车")
        ? nextTicket
        : task.ticketType,
    })),
  );

  await ctx.repos.changeRequests.update({
    ...request,
    status: "APPROVED",
  });

  const status = await verifyVersion(ctx, trip, fixture, newVersion.id);

  void constraints;
  return { planVersionId: newVersion.id, status };
}

export async function updateBookingTaskStatus(
  ctx: ActorContext,
  input: {
    tripId: string;
    taskId: string;
    planVersionId: string;
    status: BookingTask["status"];
  },
): Promise<void> {
  await mustGetTrip(ctx, input.tripId);
  const version = await ctx.repos.planVersions.getById(input.planVersionId);
  if (!version || version.tripId !== input.tripId) {
    throw new TripAccessDeniedError();
  }
  const tasks = await ctx.repos.bookingTasks.listByVersion(
    input.planVersionId,
  );
  const task = tasks.find((entry) => entry.id === input.taskId);
  if (!task || task.tripId !== input.tripId) {
    throw new TripAccessDeniedError();
  }
  await ctx.repos.bookingTasks.update({ ...task, status: input.status });
}

export class TripAccessDeniedError extends Error {
  constructor() {
    super("行程不存在或无权访问");
    this.name = "TripAccessDeniedError";
  }
}

/**
 * Ownership guard: every read/write use-case resolves the trip through
 * here, so a trip is only visible to the anonymous session that created
 * it. Random IDs alone are not an access-control mechanism.
 */
export async function mustGetTrip(
  ctx: ActorContext,
  tripId: string,
): Promise<Trip> {
  const trip = await ctx.repos.trips.getById(tripId);
  if (!trip || trip.sessionId !== ctx.sessionId) {
    throw new TripAccessDeniedError();
  }
  return trip;
}

export async function getLatestVersion(
  ctx: ActorContext,
  tripId: string,
): Promise<PlanVersion | null> {
  const versions = await ctx.repos.planVersions.listByTrip(tripId);
  return versions[versions.length - 1] ?? null;
}
