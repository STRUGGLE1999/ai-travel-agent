import type {
  AnonymousSession,
  BookingTask,
  ChangeImpactRecord,
  ChangeRequest,
  Conflict,
  Constraint,
  Evidence,
  LlmCacheRecord,
  LlmTaskType,
  LlmUsageDaily,
  LlmUsageScope,
  PersistenceMode,
  PlaceCandidate,
  PlanItem,
  PlanVersion,
  SourceInput,
  Trip,
} from "@/domain";

export interface SessionRepository {
  create(session: AnonymousSession): Promise<AnonymousSession>;
  getById(id: string): Promise<AnonymousSession | null>;
  touch(id: string, lastSeenAt: string, ipHash?: string | null): Promise<void>;
}

export interface TripRepository {
  create(trip: Trip): Promise<Trip>;
  getById(id: string): Promise<Trip | null>;
  update(trip: Trip): Promise<Trip>;
  listBySession(sessionId: string): Promise<Trip[]>;
}

export interface SourceInputRepository {
  create(input: SourceInput): Promise<SourceInput>;
  listByTrip(tripId: string): Promise<SourceInput[]>;
}

export interface ConstraintRepository {
  create(constraint: Constraint): Promise<Constraint>;
  listByTrip(tripId: string): Promise<Constraint[]>;
  update(constraint: Constraint): Promise<Constraint>;
  delete(id: string): Promise<void>;
}

export interface PlaceCandidateRepository {
  create(place: PlaceCandidate): Promise<PlaceCandidate>;
  listByTrip(tripId: string): Promise<PlaceCandidate[]>;
  update(place: PlaceCandidate): Promise<PlaceCandidate>;
}

export interface PlanVersionRepository {
  create(version: PlanVersion): Promise<PlanVersion>;
  getById(id: string): Promise<PlanVersion | null>;
  listByTrip(tripId: string): Promise<PlanVersion[]>;
  update(version: PlanVersion): Promise<PlanVersion>;
}

export interface PlanItemRepository {
  replaceForVersion(versionId: string, items: PlanItem[]): Promise<PlanItem[]>;
  listByVersion(versionId: string): Promise<PlanItem[]>;
}

export interface EvidenceRepository {
  createMany(items: Evidence[]): Promise<Evidence[]>;
  replaceForVersion(
    planVersionId: string,
    items: Evidence[],
  ): Promise<Evidence[]>;
  listByVersion(planVersionId: string): Promise<Evidence[]>;
}

export interface ConflictRepository {
  createMany(items: Conflict[]): Promise<Conflict[]>;
  replaceForVersion(
    planVersionId: string,
    items: Conflict[],
  ): Promise<Conflict[]>;
  listByVersion(planVersionId: string): Promise<Conflict[]>;
  update(conflict: Conflict): Promise<Conflict>;
}

export interface ChangeRequestRepository {
  create(request: ChangeRequest): Promise<ChangeRequest>;
  getById(id: string): Promise<ChangeRequest | null>;
  update(request: ChangeRequest): Promise<ChangeRequest>;
}

export interface ChangeImpactRepository {
  create(record: ChangeImpactRecord): Promise<ChangeImpactRecord>;
  getByRequestId(changeRequestId: string): Promise<ChangeImpactRecord | null>;
}

export interface BookingTaskRepository {
  createMany(tasks: BookingTask[]): Promise<BookingTask[]>;
  listByVersion(planVersionId: string): Promise<BookingTask[]>;
  update(task: BookingTask): Promise<BookingTask>;
}

export interface LlmUsageRepository {
  incrementAndGet(input: {
    day: string;
    scope: LlmUsageScope;
    scopeKey: string;
  }): Promise<LlmUsageDaily>;
  get(input: {
    day: string;
    scope: LlmUsageScope;
    scopeKey: string;
  }): Promise<LlmUsageDaily | null>;
}

export interface LlmCacheRepository {
  get(input: {
    taskType: LlmTaskType;
    inputHash: string;
    model: string;
  }): Promise<LlmCacheRecord | null>;
  set(record: LlmCacheRecord): Promise<LlmCacheRecord>;
}

export interface Repositories {
  persistence: PersistenceMode;
  sessions: SessionRepository;
  trips: TripRepository;
  sourceInputs: SourceInputRepository;
  constraints: ConstraintRepository;
  placeCandidates: PlaceCandidateRepository;
  planVersions: PlanVersionRepository;
  planItems: PlanItemRepository;
  evidence: EvidenceRepository;
  conflicts: ConflictRepository;
  changeRequests: ChangeRequestRepository;
  changeImpacts: ChangeImpactRepository;
  bookingTasks: BookingTaskRepository;
  llmUsage: LlmUsageRepository;
  llmCache: LlmCacheRepository;
}
