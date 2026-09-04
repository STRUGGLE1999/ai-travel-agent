import { createId } from "@/lib/ids";
import { CONFLICT_CODES } from "@/domain/enums";
import type { Conflict, Constraint, Evidence, PlanItem } from "@/domain";
import { readItemMeta } from "@/domain/planner/candidate";
import { overlaps, toMinutes } from "@/domain/planner/time";
import { dateForDay, findPlace, findRoute } from "@/fixtures/types";
import type { TripFixture } from "@/fixtures/types";
import { calculateTripBudget } from "@/domain/budget/calculator";

import type { MapProvider, WeatherProvider } from "@/services/providers/types";

export interface VerificationContext {
  tripId: string;
  planVersionId: string;
  fixture: TripFixture;
  constraints: Constraint[];
  items: PlanItem[];
  /** Selected ticket id for the peak tram decision (hong-kong only). */
  selectedTicketId?: string | null;
  checkedAtIso: string;
  mapProvider?: MapProvider;
  weatherProvider?: WeatherProvider;
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

function createEvidence(
  ctx: VerificationContext,
  partial: Pick<Evidence, "factKey" | "value" | "sourceName" | "sourceUrl"> &
    Partial<
      Pick<
        Evidence,
        "provider" | "status" | "dataMode" | "expiresAt" | "confidence"
      >
    >,
): Evidence {
  const isVerified = partial.status === "VERIFIED";
  const defaultExpiresAt = isVerified
    ? new Date(
        new Date(ctx.checkedAtIso).getTime() + 24 * 60 * 60 * 1000,
      ).toISOString()
    : null;

  return {
    id: createId(),
    tripId: ctx.tripId,
    planVersionId: ctx.planVersionId,
    provider: partial.provider ?? (isVerified ? "amap" : "fixture"),
    checkedAt: ctx.checkedAtIso,
    status: partial.status ?? "MOCK",
    confidence: partial.confidence ?? (isVerified ? 0.95 : null),
    expiresAt: partial.expiresAt ?? defaultExpiresAt,
    dataMode: partial.dataMode ?? (isVerified ? "LIVE_PARTIAL" : "DEMO"),
    sourceUrl: partial.sourceUrl ?? null,
    factKey: partial.factKey,
    value: partial.value,
    sourceName: partial.sourceName,
  };
}

function mockEvidence(
  ctx: VerificationContext,
  partial: Pick<Evidence, "factKey" | "value" | "sourceName" | "sourceUrl">,
): Evidence {
  return createEvidence(ctx, {
    ...partial,
    status: "MOCK",
    dataMode: "DEMO",
    provider: "fixture",
  });
}

export async function runFeasibilityChecks(
  ctx: VerificationContext,
): Promise<VerificationResult> {
  const conflicts: Conflict[] = [];
  const evidence: Evidence[] = [];

  checkTimeOverlaps(ctx, conflicts);
  await checkTransitGaps(ctx, conflicts, evidence);
  checkFixedEventBuffers(ctx, conflicts);
  checkOpeningWindows(ctx, conflicts, evidence);
  await checkMobility(ctx, conflicts, evidence);
  checkTicketPlanMismatch(ctx, conflicts, evidence);
  checkBudgetLimit(ctx, conflicts, evidence);
  await checkWeatherConstraints(ctx, conflicts, evidence);

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

async function checkTransitGaps(
  ctx: VerificationContext,
  conflicts: Conflict[],
  evidence: Evidence[],
): Promise<void> {
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

    const prevPlace = findPlace(ctx.fixture, prev.placeId);
    const nextPlace = findPlace(ctx.fixture, next.placeId);

    let durationMinutes = 0;
    let distanceMeters = 0;
    let transfers = 0;
    let walkMeters = 0;
    let isVerified = false;
    let sourceName = "路线演示数据";
    let dataMode: "LIVE_PARTIAL" | "DEMO" = "DEMO";

    const fixtureRoute = findRoute(
      ctx.fixture,
      prev.placeId,
      next.placeId,
      item.transportMode ?? undefined,
    );

    if (ctx.mapProvider && prevPlace && nextPlace) {
      const mode =
        item.transportMode === "TAXI"
          ? "TAXI"
          : item.transportMode === "WALK"
          ? "WALK"
          : "TRANSIT";

      const routeResult = await ctx.mapProvider.route({
        fromPlaceId: prev.placeId,
        toPlaceId: next.placeId,
        mode,
        fromCoord: { lat: prevPlace.lat, lng: prevPlace.lng },
        toCoord: { lat: nextPlace.lat, lng: nextPlace.lng },
        city: ctx.fixture.destination,
      });

      if (routeResult.status === "VERIFIED") {
        durationMinutes = routeResult.durationMinutes;
        distanceMeters = routeResult.distanceMeters;
        transfers = routeResult.transfers;
        walkMeters = routeResult.walkMeters;
        isVerified = true;
        sourceName = routeResult.sourceName;
        dataMode = routeResult.dataMode;
      } else if (fixtureRoute) {
        durationMinutes = fixtureRoute.durationMinutes;
        distanceMeters = fixtureRoute.distanceMeters;
        transfers = fixtureRoute.transfers;
        walkMeters = fixtureRoute.walkMeters;
      } else {
        continue;
      }
    } else if (fixtureRoute) {
      durationMinutes = fixtureRoute.durationMinutes;
      distanceMeters = fixtureRoute.distanceMeters;
      transfers = fixtureRoute.transfers;
      walkMeters = fixtureRoute.walkMeters;
    } else {
      continue;
    }

    evidence.push(
      createEvidence(ctx, {
        factKey: `route:${prev.placeId}->${next.placeId}:${item.transportMode ?? "TRANSIT"}`,
        value: {
          durationMinutes,
          distanceMeters,
          transfers,
          walkMeters,
        },
        sourceName,
        sourceUrl: null,
        status: isVerified ? "VERIFIED" : "MOCK",
        dataMode,
        provider: isVerified ? "amap" : "fixture",
      }),
    );

    const available = toMinutes(next.startAt) - toMinutes(prev.endAt);
    if (durationMinutes > available) {
      conflicts.push(
        conflict(ctx, {
          severity: "BLOCKING",
          code: CONFLICT_CODES.TRANSIT_OVERFLOW,
          title: "交通时间超过可用间隔",
          description: `「${prev.title}」到「${next.title}」按${sourceName}测算需要 ${durationMinutes} 分钟，但日程只留了 ${available} 分钟。`,
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

async function checkMobility(
  ctx: VerificationContext,
  conflicts: Conflict[],
  evidence: Evidence[],
): Promise<void> {
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
  let anyVerified = false;

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

    const prevPlace = findPlace(ctx.fixture, prev.placeId);
    const nextPlace = findPlace(ctx.fixture, next.placeId);

    const fixtureRoute = findRoute(
      ctx.fixture,
      prev.placeId,
      next.placeId,
      item.transportMode ?? undefined,
    );

    if (ctx.mapProvider && prevPlace && nextPlace) {
      const mode =
        item.transportMode === "TAXI"
          ? "TAXI"
          : item.transportMode === "WALK"
          ? "WALK"
          : "TRANSIT";
      const routeResult = await ctx.mapProvider.route({
        fromPlaceId: prev.placeId,
        toPlaceId: next.placeId,
        mode,
        fromCoord: { lat: prevPlace.lat, lng: prevPlace.lng },
        toCoord: { lat: nextPlace.lat, lng: nextPlace.lng },
        city: ctx.fixture.destination,
      });

      if (routeResult.status === "VERIFIED") {
        totalWalk += routeResult.walkMeters;
        totalTransfers += routeResult.transfers;
        anyVerified = true;
      } else if (fixtureRoute) {
        totalWalk += fixtureRoute.walkMeters;
        totalTransfers += fixtureRoute.transfers;
      } else {
        continue;
      }
    } else if (fixtureRoute) {
      totalWalk += fixtureRoute.walkMeters;
      totalTransfers += fixtureRoute.transfers;
    }
  }

  evidence.push(
    createEvidence(ctx, {
      factKey: "mobility:totalWalkMeters",
      value: { totalWalk, totalTransfers },
      sourceName: anyVerified
        ? "高德地图 Web 服务（全天步行与换乘核验）"
        : "路线演示数据（步行量汇总）",
      sourceUrl: null,
      status: anyVerified ? "VERIFIED" : "MOCK",
      dataMode: anyVerified ? "LIVE_PARTIAL" : "DEMO",
      provider: anyVerified ? "amap" : "fixture",
    }),
  );

  if (totalWalk > maxWalk) {
    conflicts.push(
      conflict(ctx, {
        severity: "HIGH",
        code: CONFLICT_CODES.MOBILITY_VIOLATION,
        title: "步行量超过体力约束",
        description: `按${anyVerified ? "高德实际路线" : "演示路线"}估算总步行约 ${totalWalk} 米，超过锁定的步行上限 ${maxWalk} 米。`,
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

function checkBudgetLimit(
  ctx: VerificationContext,
  conflicts: Conflict[],
  evidence: Evidence[],
): void {
  const budget = calculateTripBudget({
    items: ctx.items,
    fixture: ctx.fixture,
    selectedTicketId: ctx.selectedTicketId,
    constraints: ctx.constraints,
  });

  evidence.push(
    mockEvidence(ctx, {
      factKey: "budget:summary",
      value: {
        totalConfirmed: budget.totalConfirmed,
        totalEstimated: budget.totalEstimated,
        totalAmount: budget.totalAmount,
        currency: budget.currency,
        budgetLimit: budget.budgetLimit,
        isOverBudget: budget.isOverBudget,
      },
      sourceName: "费用预估与核算引擎",
      sourceUrl: null,
    }),
  );

  if (budget.isOverBudget && budget.budgetLimit !== null) {
    const budgetConstraintIds = findConstraintIds(ctx, "BUDGET");
    conflicts.push(
      conflict(ctx, {
        severity: "HIGH",
        code: CONFLICT_CODES.BUDGET_EXCEEDED,
        title: "预估总费用超出预算上限",
        description: `当前计划预估总费用约 ${budget.totalAmount} ${budget.currency}，超出预算上限 ${budget.budgetLimit} ${budget.currency}（超支约 ${budget.overBudgetAmount} ${budget.currency}）。`,
        affectedItemIds: [],
        violatedConstraintIds: budgetConstraintIds,
        suggestedActions: [
          "调整门票选择或将部分付费项目替换为免费/室内备选",
          "将交通方式从出租车改为公共交通",
          "在约束中适当调整预算上限",
        ],
      }),
    );
  }
}

async function checkWeatherConstraints(
  ctx: VerificationContext,
  conflicts: Conflict[],
  evidence: Evidence[],
): Promise<void> {
  if (!ctx.weatherProvider) {
    return;
  }

  const rainContingency = ctx.constraints.find(
    (c) =>
      c.summary.includes("暴雨") ||
      (c.value &&
        typeof c.value === "object" &&
        "condition" in c.value &&
        String((c.value as { condition: string }).condition).includes("暴雨")),
  );

  const targetDate = dateForDay(ctx.fixture, 1);
  const forecast = await ctx.weatherProvider.getForecast({
    placeId: ctx.fixture.fixtureId || ctx.tripId || "hk",
    date: targetDate,
    city: ctx.fixture.destination,
  });

  const isVerified = forecast.status === "VERIFIED";
  evidence.push(
    createEvidence(ctx, {
      factKey: `weather:forecast:${targetDate}`,
      value: {
        condition: forecast.condition,
        summary: forecast.summary,
      },
      sourceName: forecast.sourceName,
      sourceUrl: null,
      status: forecast.status,
      dataMode: forecast.dataMode,
      provider: isVerified ? "amap" : "fixture",
    }),
  );

  // If weather is severe storm and user specified rainy day constraint
  if (forecast.condition === "STORM" && rainContingency) {
    // Check if there are outdoor items scheduled on that day
    const outdoorItems = ctx.items.filter((item) => {
      if (item.type !== "PLACE" || !item.placeId) return false;
      const place = findPlace(ctx.fixture, item.placeId);
      return place && !place.indoor;
    });

    if (outdoorItems.length > 0) {
      conflicts.push(
        conflict(ctx, {
          severity: "HIGH",
          code: CONFLICT_CODES.WEATHER_VIOLATION,
          title: "室外行程遇暴雨预警",
          description: `预报出行日（${targetDate}）有${forecast.summary}。约定「${rainContingency.summary}」，但当前日程仍包含「${outdoorItems.map((i) => i.title).join("、")}」等室外行程。`,
          affectedItemIds: outdoorItems.map((i) => i.id),
          violatedConstraintIds: [rainContingency.id],
          suggestedActions: ["切换为室内备选方案", "调整到晴好天气时段"],
        }),
      );
    }
  }
}
