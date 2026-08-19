import { createId } from "@/lib/ids";
import { CONFLICT_CODES } from "@/domain/enums";
import type { Conflict, Constraint, Evidence, PlanItem } from "@/domain";
import { readItemMeta } from "@/domain/planner/candidate";
import { overlaps, toMinutes } from "@/domain/planner/time";
import { dateForDay, findPlace, findRoute } from "@/fixtures/types";
import type { TripFixture } from "@/fixtures/types";

export interface VerificationContext {
  tripId: string;
  planVersionId: string;
  fixture: TripFixture;
  constraints: Constraint[];
  items: PlanItem[];
  /** Selected ticket id for the peak tram decision (hong-kong only). */
  selectedTicketId?: string | null;
  checkedAtIso: string;
}

export interface VerificationResult {
  conflicts: Conflict[];
  evidence: Evidence[];
}

const FLIGHT_BUFFER_MINUTES = 120;
const PORT_BUFFER_MINUTES = 30;

function conflict(
  ctx: VerificationContext,
  partial: Omit<Conflict, "id" | "tripId" | "planVersionId" | "resolved">,
): Conflict {
  return {
    id: createId(),
    tripId: ctx.tripId,
    planVersionId: ctx.planVersionId,
    resolved: false,
    ...partial,
  };
}

function mockEvidence(
  ctx: VerificationContext,
  partial: Pick<Evidence, "factKey" | "value" | "sourceName" | "sourceUrl">,
): Evidence {
  return {
    id: createId(),
    tripId: ctx.tripId,
    planVersionId: ctx.planVersionId,
    provider: "fixture",
    checkedAt: ctx.checkedAtIso,
    status: "MOCK",
    confidence: null,
    expiresAt: null,
    dataMode: "DEMO",
    ...partial,
  };
}

export function runFeasibilityChecks(
  ctx: VerificationContext,
): VerificationResult {
  const conflicts: Conflict[] = [];
  const evidence: Evidence[] = [];

  checkTimeOverlaps(ctx, conflicts);
  checkTransitGaps(ctx, conflicts, evidence);
  checkFixedEventBuffers(ctx, conflicts);
  checkOpeningWindows(ctx, conflicts, evidence);
  checkMobility(ctx, conflicts, evidence);
  checkTicketPlanMismatch(ctx, conflicts, evidence);

  return { conflicts, evidence };
}

function checkTimeOverlaps(
  ctx: VerificationContext,
  conflicts: Conflict[],
): void {
  const byDay = new Map<number, PlanItem[]>();
  for (const item of ctx.items) {
    const list = byDay.get(item.day) ?? [];
    list.push(item);
    byDay.set(item.day, list);
  }

  for (const [, items] of byDay) {
    const sorted = [...items].sort(
      (a, b) => toMinutes(a.startAt) - toMinutes(b.startAt),
    );
    for (let i = 0; i < sorted.length - 1; i += 1) {
      const current = sorted[i];
      const next = sorted[i + 1];
      if (overlaps(current.startAt, current.endAt, next.startAt, next.endAt)) {
        conflicts.push(
          conflict(ctx, {
            severity: "BLOCKING",
            code: CONFLICT_CODES.TIME_OVERLAP,
            title: "日程时间重叠",
            description: `「${current.title}」(${current.startAt}-${current.endAt}) 与「${next.title}」(${next.startAt}-${next.endAt}) 时间重叠，无法同时执行。`,
            affectedItemIds: [current.id, next.id],
            violatedConstraintIds: [],
            suggestedActions: ["调整其中一项的时间", "删除其中一项"],
          }),
        );
      }
    }
  }
}

function checkTransitGaps(
  ctx: VerificationContext,
  conflicts: Conflict[],
  evidence: Evidence[],
): void {
  const sorted = [...ctx.items].sort(
    (a, b) => a.day - b.day || toMinutes(a.startAt) - toMinutes(b.startAt),
  );

  for (let i = 0; i < sorted.length; i += 1) {
    const item = sorted[i];
    if (item.type !== "TRANSIT") {
      continue;
    }
    const prev = sorted
      .slice(0, i)
      .reverse()
      .find((entry) => entry.day === item.day && entry.placeId);
    const next = sorted
      .slice(i + 1)
      .find((entry) => entry.day === item.day && entry.placeId);
    if (!prev?.placeId || !next?.placeId) {
      continue;
    }

    const route = findRoute(
      ctx.fixture,
      prev.placeId,
      next.placeId,
      item.transportMode ?? undefined,
    );
    if (!route) {
      continue;
    }

    evidence.push(
      mockEvidence(ctx, {
        factKey: `route:${prev.placeId}->${next.placeId}:${route.mode}`,
        value: {
          durationMinutes: route.durationMinutes,
          distanceMeters: route.distanceMeters,
          transfers: route.transfers,
          walkMeters: route.walkMeters,
        },
        sourceName: "路线演示数据",
        sourceUrl: null,
      }),
    );

    const available =
      toMinutes(next.startAt) - toMinutes(prev.endAt);
    if (route.durationMinutes > available) {
      conflicts.push(
        conflict(ctx, {
          severity: "BLOCKING",
          code: CONFLICT_CODES.TRANSIT_OVERFLOW,
          title: "交通时间超过可用间隔",
          description: `「${prev.title}」到「${next.title}」按演示路线需要 ${route.durationMinutes} 分钟，但日程只留了 ${available} 分钟。`,
          affectedItemIds: [prev.id, item.id, next.id],
          violatedConstraintIds: [],
          suggestedActions: ["推迟下一项的开始时间", "缩短上一项停留"],
        }),
      );
    }
  }
}

function checkFixedEventBuffers(
  ctx: VerificationContext,
  conflicts: Conflict[],
): void {
  const sorted = [...ctx.items].sort(
    (a, b) => a.day - b.day || toMinutes(a.startAt) - toMinutes(b.startAt),
  );

  for (let i = 1; i < sorted.length; i += 1) {
    const item = sorted[i];
    const meta = readItemMeta(item);
    const isFlight = meta.role === "RETURN_FLIGHT";
    const isExitPort = meta.role === "EXIT_PORT";
    if (!isFlight && !isExitPort) {
      continue;
    }
    const required = isFlight ? FLIGHT_BUFFER_MINUTES : PORT_BUFFER_MINUTES;
    const prev = sorted[i - 1];
    if (prev.day !== item.day) {
      continue;
    }
    // For flights, the buffer is measured from arriving at the airport
    // (end of the preceding transit/buffer chain) to departure time.
    const arrivalItems = sorted.filter(
      (entry) =>
        entry.day === item.day &&
        toMinutes(entry.endAt) <= toMinutes(item.startAt) &&
        entry.type === "TRANSIT",
    );
    const lastTransit = arrivalItems[arrivalItems.length - 1];
    if (isFlight && lastTransit) {
      const buffer = toMinutes(item.startAt) - toMinutes(lastTransit.endAt);
      if (buffer < required) {
        conflicts.push(
          conflict(ctx, {
            severity: "BLOCKING",
            code: CONFLICT_CODES.BUFFER_INSUFFICIENT,
            title: "航班前缓冲不足",
            description: `到达机场后距离「${item.title}」只有 ${buffer} 分钟，少于要求的 ${required} 分钟值机安检缓冲。`,
            affectedItemIds: [lastTransit.id, item.id],
            violatedConstraintIds: findConstraintIds(ctx, "TRANSPORT"),
            suggestedActions: ["提前结束前一项行程", "提早出发去机场"],
          }),
        );
      }
    }
    if (isExitPort) {
      const buffer = toMinutes(item.startAt) - toMinutes(prev.endAt);
      if (buffer < 0) {
        conflicts.push(
          conflict(ctx, {
            severity: "BLOCKING",
            code: CONFLICT_CODES.BUFFER_INSUFFICIENT,
            title: "口岸返回缓冲不足",
            description: `前一项「${prev.title}」结束时间晚于口岸过关开始时间。`,
            affectedItemIds: [prev.id, item.id],
            violatedConstraintIds: findConstraintIds(ctx, "START_END"),
            suggestedActions: ["缩短前面的行程", "提前返程"],
          }),
        );
      }
    }
  }
}

function checkOpeningWindows(
  ctx: VerificationContext,
  conflicts: Conflict[],
  evidence: Evidence[],
): void {
  for (const item of ctx.items) {
    if (item.type !== "PLACE" || !item.placeId) {
      continue;
    }
    const place = findPlace(ctx.fixture, item.placeId);
    if (!place) {
      continue;
    }
    if (place.openingHours) {
      evidence.push(
        mockEvidence(ctx, {
          factKey: `openingHours:${place.placeId}:${dateForDay(ctx.fixture, item.day)}`,
          value: place.openingHours,
          sourceName: place.sourceName,
          sourceUrl: place.sourceUrl,
        }),
      );
      const opens = toMinutes(place.openingHours.open);
      const closes = toMinutes(place.openingHours.close);
      if (toMinutes(item.startAt) < opens || toMinutes(item.endAt) > closes) {
        conflicts.push(
          conflict(ctx, {
            severity: "BLOCKING",
            code: CONFLICT_CODES.OUTSIDE_OPENING_HOURS,
            title: "计划时段超出营业窗口",
            description: `「${place.name}」演示营业时间为 ${place.openingHours.open}-${place.openingHours.close}，计划时段 ${item.startAt}-${item.endAt} 未被覆盖。`,
            affectedItemIds: [item.id],
            violatedConstraintIds: [],
            suggestedActions: ["调整到营业时间内", "更换地点"],
          }),
        );
      }
    }
  }
}

function checkMobility(
  ctx: VerificationContext,
  conflicts: Conflict[],
  evidence: Evidence[],
): void {
  const mobility = ctx.constraints.find(
    (constraint) => constraint.category === "MOBILITY",
  );
  if (!mobility) {
    return;
  }
  const value = mobility.value as {
    maxWalkMeters?: number;
    maxTransfers?: number;
  };
  const maxWalk = value?.maxWalkMeters ?? Infinity;
  const maxTransfers = value?.maxTransfers ?? Infinity;

  let totalWalk = 0;
  let totalTransfers = 0;
  const sorted = [...ctx.items].sort(
    (a, b) => a.day - b.day || toMinutes(a.startAt) - toMinutes(b.startAt),
  );
  for (let i = 0; i < sorted.length; i += 1) {
    const item = sorted[i];
    if (item.type !== "TRANSIT") {
      continue;
    }
    const prev = sorted
      .slice(0, i)
      .reverse()
      .find((entry) => entry.day === item.day && entry.placeId);
    const next = sorted
      .slice(i + 1)
      .find((entry) => entry.day === item.day && entry.placeId);
    if (!prev?.placeId || !next?.placeId) {
      continue;
    }
    const route = findRoute(
      ctx.fixture,
      prev.placeId,
      next.placeId,
      item.transportMode ?? undefined,
    );
    if (route) {
      totalWalk += route.walkMeters;
      totalTransfers += route.transfers;
    }
  }

  evidence.push(
    mockEvidence(ctx, {
      factKey: "mobility:totalWalkMeters",
      value: { totalWalk, totalTransfers },
      sourceName: "路线演示数据（步行量汇总）",
      sourceUrl: null,
    }),
  );

  if (totalWalk > maxWalk) {
    conflicts.push(
      conflict(ctx, {
        severity: "HIGH",
        code: CONFLICT_CODES.MOBILITY_VIOLATION,
        title: "步行量超过体力约束",
        description: `按演示路线估算总步行约 ${totalWalk} 米，超过锁定的步行上限 ${maxWalk} 米。`,
        affectedItemIds: [],
        violatedConstraintIds: [mobility.id],
        suggestedActions: ["减少一个地点", "部分路段改乘出租车"],
      }),
    );
  }
  if (totalTransfers > maxTransfers) {
    conflicts.push(
      conflict(ctx, {
        severity: "HIGH",
        code: CONFLICT_CODES.TRANSFER_LIMIT,
        title: "换乘次数超过约束",
        description: `全程换乘约 ${totalTransfers} 次，超过约束的 ${maxTransfers} 次。`,
        affectedItemIds: [],
        violatedConstraintIds: [mobility.id],
        suggestedActions: ["改用直达交通", "减少跨区移动"],
      }),
    );
  }
}

function checkTicketPlanMismatch(
  ctx: VerificationContext,
  conflicts: Conflict[],
  evidence: Evidence[],
): void {
  if (!ctx.selectedTicketId) {
    return;
  }
  const ticket = ctx.fixture.tickets.find(
    (option) => option.id === ctx.selectedTicketId,
  );
  if (!ticket) {
    return;
  }

  evidence.push(
    mockEvidence(ctx, {
      factKey: `ticket:${ticket.id}`,
      value: {
        name: ticket.name,
        price: ticket.price,
        currency: ticket.currency,
        includes: ticket.includes,
      },
      sourceName: "票种演示数据",
      sourceUrl: null,
    }),
  );

  const descent = ctx.items.find(
    (item) => readItemMeta(item).role === "DESCENT",
  );
  if (!descent) {
    return;
  }

  if (ticket.coversDescent && descent.transportMode !== "TRAM") {
    conflicts.push(
      conflict(ctx, {
        severity: "BLOCKING",
        code: CONFLICT_CODES.TICKET_PLAN_MISMATCH,
        title: "票种与下山方式不一致",
        description: `已选择「${ticket.name}」（含缆车下山），但计划中的下山方式是「${descent.title}」。往返票的下山段会被浪费，或需要改变下山方式。`,
        affectedItemIds: [descent.id],
        violatedConstraintIds: [],
        suggestedActions: [
          "改选缆车单程票，保留出租车下山",
          "把下山方式改回缆车",
        ],
      }),
    );
  }
}

function findConstraintIds(
  ctx: VerificationContext,
  category: string,
): string[] {
  return ctx.constraints
    .filter((constraint) => constraint.category === category)
    .map((constraint) => constraint.id);
}
