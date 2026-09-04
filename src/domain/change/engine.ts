import { createId } from "@/lib/ids";
import type {
  ChangeImpact,
  ChangeIntent,
  ChangeOperation,
  Conflict,
  PlanItem,
} from "@/domain";
import {
  readItemMeta,
  withMeta,
} from "@/domain/planner/candidate";
import { toHHMM, toMinutes } from "@/domain/planner/time";
import { findRoute } from "@/fixtures/types";
import type { TripFixture } from "@/fixtures/types";

export interface ChangeComputation {
  nextItems: PlanItem[];
  impact: Omit<ChangeImpact, "newConflicts" | "resolvedConflictIds">;
  /** Ticket id selected via CHANGE_TICKET, if any. */
  nextTicketId: string | null | undefined;
}

const FLIGHT_CHECKIN_BUFFER = 120;
const DEFAULT_STAY_MINUTES: Record<string, number> = {
  购物: 60,
  博物馆: 90,
};

/**
 * Deterministic change engine. The LLM only produces the ChangeIntent;
 * everything below is plain code so unaffected items stay untouched.
 */
export function computeChange(input: {
  request: string;
  intent: ChangeIntent;
  items: PlanItem[];
  fixture: TripFixture;
  planVersionId: string;
  currentTicketId: string | null;
}): ChangeComputation {
  let working = input.items.map((item) => ({ ...item }));
  const additions: PlanItem[] = [];
  const removals: string[] = [];
  const updates: Array<{ itemId: string; fields: Record<string, unknown> }> = [];
  const moves: Array<{ itemId: string; from: string; to: string }> = [];
  const bookingTaskImpacts: string[] = [];
  let nextTicketId: string | null | undefined = undefined;

  const recordUpdate = (
    item: PlanItem,
    fields: Record<string, unknown>,
  ): void => {
    Object.assign(item, fields);
    const existing = updates.find((entry) => entry.itemId === item.id);
    if (existing) {
      Object.assign(existing.fields, fields);
    } else {
      updates.push({ itemId: item.id, fields });
    }
  };

  for (const operation of input.intent.operations) {
    switch (operation.type) {
      case "ADD_PLACE": {
        const result = applyAddPlace(
          operation,
          working,
          input.fixture,
          input.planVersionId,
        );
        working = result.items;
        additions.push(...result.added);
        for (const moved of result.moved) {
          moves.push(moved);
        }
        break;
      }
      case "REMOVE_PLACE": {
        const target = working.find(
          (item) =>
            item.type === "PLACE" && item.title.includes(operation.name),
        );
        if (target && !readItemMeta(target).locked) {
          removals.push(target.id);
          const transitBefore = findTransitBefore(working, target);
          if (transitBefore) {
            removals.push(transitBefore.id);
          }
          working = working.filter((item) => !removals.includes(item.id));
        }
        break;
      }
      case "SET_WEATHER": {
        if (operation.condition === "STORM" || operation.condition === "RAIN") {
          for (const item of working) {
            const meta = readItemMeta(item);
            if (!meta.outdoor || meta.locked || !item.placeId) {
              continue;
            }
            const altId = input.fixture.rainyAlternatives[item.placeId];
            const alt = input.fixture.places.find(
              (place) => place.placeId === altId,
            );
            if (!alt) {
              continue;
            }
            recordUpdate(item, {
              placeId: alt.placeId,
              title: `${alt.name}（暴雨室内替代）`,
              notes: withMeta(`原计划：${item.title}，因暴雨替换为室内地点`, {
                ...meta,
                outdoor: false,
              }),
            });
          }
          bookingTaskImpacts.push("暴雨替代不影响口岸、用餐与返程安排");
        }
        break;
      }
      case "CHANGE_TICKET": {
        const ticket = input.fixture.tickets.find(
          (option) =>
            option.id === operation.ticketType ||
            option.name.includes(operation.ticketType),
        );
        nextTicketId = ticket ? ticket.id : input.currentTicketId;
        if (ticket) {
          bookingTaskImpacts.push(`缆车票种改为「${ticket.name}」`);
        }
        break;
      }
      case "CHANGE_FLIGHT": {
        if (operation.direction === "RETURN") {
          applyReturnFlightChange(
            operation.time,
            working,
            input.fixture,
            recordUpdate,
          );
          bookingTaskImpacts.push(
            `返程航班时间改为 ${operation.time}，第五天时间线已重新计算`,
          );
        }
        break;
      }
      case "CHANGE_LODGING": {
        bookingTaskImpacts.push(
          `住宿调整意向：${operation.locationHint}（需人工比较进城与机场时间权衡）`,
        );
        break;
      }
      case "CHANGE_TRANSIT": {
        const target = working.find((item) => {
          const meta = readItemMeta(item);
          if (operation.role && meta.role === operation.role) return true;
          return (
            item.type === "TRANSIT" &&
            (item.title.includes("下山") ||
              (operation.title && item.title.includes(operation.title)))
          );
        });
        if (target) {
          const meta = readItemMeta(target);
          const newTitle =
            operation.title ||
            (operation.transportMode === "TRAM"
              ? "缆车下山"
              : operation.transportMode === "TAXI"
                ? "出租车下山"
                : target.title);
          const updatedNotes = withMeta(
            operation.transportMode === "TRAM"
              ? "改乘缆车下山，饱览维港全景"
              : operation.transportMode === "TAXI"
                ? "考虑老人体力，下山改乘出租车"
                : (target.notes ?? ""),
            meta,
          );
          recordUpdate(target, {
            transportMode: operation.transportMode,
            title: newTitle,
            notes: updatedNotes,
          });
          bookingTaskImpacts.push(`交通方式调整为「${newTitle}」`);
        }
        break;
      }
      case "UPDATE_CONSTRAINT": {
        bookingTaskImpacts.push(`约束更新请求：${operation.summary}`);
        break;
      }
    }
  }

  const preservedLockedItemIds = working
    .filter((item) => {
      const meta = readItemMeta(item);
      if (!meta.locked) {
        return false;
      }
      const wasUpdated = updates.some((entry) => entry.itemId === item.id);
      const wasRemoved = removals.includes(item.id);
      return !wasUpdated && !wasRemoved;
    })
    .map((item) => item.id);

  // Locked items must never be silently removed by any operation.
  for (const original of input.items) {
    const meta = readItemMeta(original);
    if (meta.locked && !working.some((item) => item.id === original.id)) {
      working.push({ ...original });
    }
  }

  working.sort(
    (a, b) => a.day - b.day || toMinutes(a.startAt) - toMinutes(b.startAt),
  );
  working = working.map((item, index) => ({ ...item, sortOrder: index }));

  return {
    nextItems: working,
    nextTicketId,
    impact: {
      request: input.request,
      additions,
      removals,
      moves,
      updates,
      preservedLockedItemIds,
      bookingTaskImpacts,
    },
  };
}

function findTransitBefore(
  items: PlanItem[],
  target: PlanItem,
): PlanItem | null {
  const sorted = [...items].sort(
    (a, b) => a.day - b.day || toMinutes(a.startAt) - toMinutes(b.startAt),
  );
  const index = sorted.findIndex((item) => item.id === target.id);
  const prev = sorted[index - 1];
  return prev && prev.type === "TRANSIT" && prev.day === target.day
    ? prev
    : null;
}

function applyAddPlace(
  operation: Extract<ChangeOperation, { type: "ADD_PLACE" }>,
  items: PlanItem[],
  fixture: TripFixture,
  planVersionId: string,
): {
  items: PlanItem[];
  added: PlanItem[];
  moved: Array<{ itemId: string; from: string; to: string }>;
} {
  const place = fixture.places.find(
    (candidate) =>
      candidate.name.includes(operation.name) ||
      operation.name.includes(candidate.name) ||
      candidate.name
        .toLowerCase()
        .includes(operation.name.toLowerCase()),
  );
  if (!place) {
    return { items, added: [], moved: [] };
  }

  const sorted = [...items].sort(
    (a, b) => a.day - b.day || toMinutes(a.startAt) - toMinutes(b.startAt),
  );

  let anchor: PlanItem | undefined;
  if (operation.afterPlaceName) {
    anchor = sorted.find(
      (item) =>
        item.type === "PLACE" &&
        item.title.includes(operation.afterPlaceName as string),
    );
  }
  if (!anchor) {
    anchor = [...sorted]
      .reverse()
      .find(
        (item) =>
          item.type === "PLACE" &&
          (operation.day === undefined || item.day === operation.day),
      );
  }
  if (!anchor?.placeId) {
    return { items, added: [], moved: [] };
  }

  const route = findRoute(fixture, anchor.placeId, place.placeId);
  const transitMinutes = route?.durationMinutes ?? 30;
  const stayMinutes = DEFAULT_STAY_MINUTES[place.category] ?? 60;

  const transitStart = toMinutes(anchor.endAt);
  const transitEnd = transitStart + transitMinutes;
  const stayEnd = transitEnd + stayMinutes;

  const transitItem: PlanItem = {
    id: createId(),
    planVersionId,
    day: anchor.day,
    startAt: toHHMM(transitStart),
    endAt: toHHMM(transitEnd),
    type: "TRANSIT",
    title: `前往${place.name}`,
    placeId: null,
    transportMode: route?.mode ?? "TRANSIT",
    appliedConstraintIds: [],
    evidenceIds: [],
    notes: withMeta("按用户变更请求新增", {
      key: `added-transit-${place.placeId}`,
      locked: false,
      role: null,
      outdoor: false,
    }),
    sortOrder: 0,
  };
  const placeItem: PlanItem = {
    id: createId(),
    planVersionId,
    day: anchor.day,
    startAt: toHHMM(transitEnd),
    endAt: toHHMM(stayEnd),
    type: "PLACE",
    title: place.name,
    placeId: place.placeId,
    transportMode: null,
    appliedConstraintIds: [],
    evidenceIds: [],
    notes: withMeta("按用户变更请求新增", {
      key: `added-${place.placeId}`,
      locked: false,
      role: null,
      outdoor: !place.indoor,
    }),
    sortOrder: 0,
  };

  // Shift later unlocked items of the same day; locked items (ports,
  // meals, flights) keep their times so feasibility can surface honest
  // conflicts instead of silently rewriting hard commitments.
  const shift = transitMinutes + stayMinutes;
  const moved: Array<{ itemId: string; from: string; to: string }> = [];
  const next = sorted.map((item) => {
    if (
      item.day === anchor.day &&
      toMinutes(item.startAt) >= toMinutes(anchor.endAt) &&
      item.id !== anchor.id &&
      !readItemMeta(item).locked
    ) {
      const from = `${item.startAt}-${item.endAt}`;
      const shifted = {
        ...item,
        startAt: toHHMM(toMinutes(item.startAt) + shift),
        endAt: toHHMM(toMinutes(item.endAt) + shift),
      };
      moved.push({
        itemId: item.id,
        from,
        to: `${shifted.startAt}-${shifted.endAt}`,
      });
      return shifted;
    }
    return item;
  });

  return {
    items: [...next, transitItem, placeItem],
    added: [transitItem, placeItem],
    moved,
  };
}

function applyReturnFlightChange(
  time: string,
  items: PlanItem[],
  fixture: TripFixture,
  recordUpdate: (item: PlanItem, fields: Record<string, unknown>) => void,
): void {
  const flight = items.find(
    (item) => readItemMeta(item).role === "RETURN_FLIGHT",
  );
  if (!flight) {
    return;
  }
  const flightStart = toMinutes(time);
  recordUpdate(flight, {
    startAt: toHHMM(flightStart),
    endAt: toHHMM(flightStart + 30),
    title: flight.title.replace(/\d{2}:\d{2}|起飞/, "起飞").trim(),
  });

  const buffer = items.find(
    (item) =>
      item.day === flight.day &&
      item.type === "BUFFER",
  );
  const toAirport = items.find(
    (item) => readItemMeta(item).role === "TO_AIRPORT",
  );
  const luggage = items.find(
    (item) => readItemMeta(item).role === "LUGGAGE",
  );
  const sight = items.find(
    (item) => readItemMeta(item).role === "DAY5_SIGHT",
  );

  const airportArrival = flightStart - FLIGHT_CHECKIN_BUFFER;
  if (buffer) {
    recordUpdate(buffer, {
      startAt: toHHMM(airportArrival),
      endAt: toHHMM(flightStart),
    });
  }

  const airportRoute = findRoute(
    fixture,
    "bj-hotel",
    "bj-capital-airport",
    "TAXI",
  );
  const toAirportMinutes = airportRoute?.durationMinutes ?? 55;
  if (toAirport) {
    recordUpdate(toAirport, {
      startAt: toHHMM(airportArrival - toAirportMinutes),
      endAt: toHHMM(airportArrival),
    });
  }

  const luggageStart = airportArrival - toAirportMinutes - 30;
  if (luggage) {
    recordUpdate(luggage, {
      startAt: toHHMM(luggageStart),
      endAt: toHHMM(luggageStart + 30),
    });
  }

  if (sight && sight.placeId) {
    const backRoute = findRoute(fixture, sight.placeId, "bj-hotel", "TAXI");
    const backMinutes = backRoute?.durationMinutes ?? 25;
    const sightEnd = luggageStart - backMinutes;
    if (toMinutes(sight.endAt) > sightEnd) {
      recordUpdate(sight, {
        endAt: toHHMM(sightEnd),
      });
    }
  }
}

export function diffAgainstPrevious(
  previousItems: PlanItem[],
  impact: Omit<ChangeImpact, "newConflicts" | "resolvedConflictIds">,
  newConflicts: Conflict[],
  resolvedConflictIds: string[],
): ChangeImpact {
  void previousItems;
  return {
    ...impact,
    newConflicts,
    resolvedConflictIds,
  };
}
