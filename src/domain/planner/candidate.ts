import { createId } from "@/lib/ids";
import type { Constraint, PlanItem } from "@/domain";
import type { TripFixture } from "@/fixtures/types";

/**
 * Deterministic candidate planner: turns a fixture plan template into
 * concrete PlanItems for a version. It never invents prices, opening
 * hours or routes — those come from the fixture providers as MOCK
 * evidence during verification.
 */
export function buildCandidatePlanItems(input: {
  fixture: TripFixture;
  planVersionId: string;
  constraints: Constraint[];
}): PlanItem[] {
  const constraintIdsByCategory = new Map<string, string[]>();
  for (const constraint of input.constraints) {
    const list = constraintIdsByCategory.get(constraint.category) ?? [];
    list.push(constraint.id);
    constraintIdsByCategory.set(constraint.category, list);
  }

  const categoryFor = (templateKey: string): string[] => {
    if (templateKey.includes("port")) {
      return constraintIdsByCategory.get("START_END") ?? [];
    }
    if (templateKey.includes("flight") || templateKey.includes("airport")) {
      return constraintIdsByCategory.get("TRANSPORT") ?? [];
    }
    if (templateKey === "rest" || templateKey.includes("rest")) {
      return [
        ...(constraintIdsByCategory.get("MOBILITY") ?? []),
        ...(constraintIdsByCategory.get("PACE") ?? []),
      ];
    }
    return [];
  };

  return input.fixture.planTemplate.map((template, index) => ({
    id: createId(),
    planVersionId: input.planVersionId,
    day: template.day,
    startAt: template.start,
    endAt: template.end,
    type: template.type,
    title: template.title,
    placeId: template.placeId ?? null,
    transportMode: template.transportMode ?? null,
    appliedConstraintIds: categoryFor(template.key),
    evidenceIds: [],
    notes: buildNotes(template.notes, template.key, template.locked, template.role, template.outdoor),
    sortOrder: index,
  }));
}

/**
 * Structured metadata is serialized into notes with a stable prefix so the
 * change engine can recover template roles without extra tables.
 */
const META_PREFIX = "@@meta:";

export interface PlanItemMeta {
  key: string;
  locked: boolean;
  role: string | null;
  outdoor: boolean;
}

function buildNotes(
  notes: string | undefined,
  key: string,
  locked?: boolean,
  role?: string,
  outdoor?: boolean,
): string {
  const meta: PlanItemMeta = {
    key,
    locked: Boolean(locked),
    role: role ?? null,
    outdoor: Boolean(outdoor),
  };
  const humanNotes = notes ?? "";
  return `${humanNotes}\n${META_PREFIX}${JSON.stringify(meta)}`.trim();
}

export function readItemMeta(item: { notes: string | null }): PlanItemMeta {
  const fallback: PlanItemMeta = {
    key: "",
    locked: false,
    role: null,
    outdoor: false,
  };
  if (!item.notes) {
    return fallback;
  }
  const line = item.notes
    .split("\n")
    .find((entry) => entry.startsWith(META_PREFIX));
  if (!line) {
    return fallback;
  }
  try {
    return { ...fallback, ...JSON.parse(line.slice(META_PREFIX.length)) };
  } catch {
    return fallback;
  }
}

export function humanNotes(item: { notes: string | null }): string {
  if (!item.notes) {
    return "";
  }
  return item.notes
    .split("\n")
    .filter((entry) => !entry.startsWith(META_PREFIX))
    .join("\n")
    .trim();
}

export function withMeta(
  notes: string,
  meta: PlanItemMeta,
): string {
  return `${notes}\n${META_PREFIX}${JSON.stringify(meta)}`.trim();
}
