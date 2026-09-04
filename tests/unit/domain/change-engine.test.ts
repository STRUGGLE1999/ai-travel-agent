import { describe, expect, it } from "vitest";
import { BEIJING_FIXTURE } from "@/fixtures/beijing/data";
import { HONG_KONG_FIXTURE } from "@/fixtures/hong-kong/data";
import { buildCandidatePlanItems, readItemMeta } from "@/domain/planner/candidate";
import { computeChange } from "@/domain/change/engine";
import { ruleBasedChangeIntent } from "@/services/ai/fake";

function bjItems() {
  return buildCandidatePlanItems({
    fixture: BEIJING_FIXTURE,
    planVersionId: "ver_bj",
    constraints: [],
  });
}

function hkItems() {
  return buildCandidatePlanItems({
    fixture: HONG_KONG_FIXTURE,
    planVersionId: "ver_hk",
    constraints: [],
  });
}

describe("beijing return-flight change (BJ-02)", () => {
  it("recomputes only day-5 nodes when the flight moves to 16:15", () => {
    const items = bjItems();
    const before = new Map(
      items.map((item) => [item.id, `${item.startAt}-${item.endAt}`]),
    );

    const result = computeChange({
      request: "返程航班改成16:15",
      intent: ruleBasedChangeIntent("返程航班改成16:15起飞"),
      items,
      fixture: BEIJING_FIXTURE,
      planVersionId: "ver_bj",
      currentTicketId: null,
    });

    const flight = result.nextItems.find(
      (item) => readItemMeta(item).role === "RETURN_FLIGHT",
    );
    expect(flight?.startAt).toBe("16:15");

    const toAirport = result.nextItems.find(
      (item) => readItemMeta(item).role === "TO_AIRPORT",
    );
    // 16:15 - 120min buffer = 14:15 airport arrival; 55min taxi → 13:20.
    expect(toAirport?.startAt).toBe("13:20");
    expect(toAirport?.endAt).toBe("14:15");

    const luggage = result.nextItems.find(
      (item) => readItemMeta(item).role === "LUGGAGE",
    );
    expect(luggage?.startAt).toBe("12:50");

    const sight = result.nextItems.find(
      (item) => readItemMeta(item).role === "DAY5_SIGHT",
    );
    // Must end early enough: luggage 12:50 - 25min taxi back = 12:25;
    // original end 11:30 already satisfies it, so it stays untouched.
    expect(sight?.endAt).toBe("11:30");

    // Nothing outside day 5 changes.
    for (const item of result.nextItems) {
      if (item.day !== 5) {
        expect(before.get(item.id)).toBe(`${item.startAt}-${item.endAt}`);
      }
    }
    const updatedIds = new Set(result.impact.updates.map((u) => u.itemId));
    for (const itemId of updatedIds) {
      const item = result.nextItems.find((entry) => entry.id === itemId);
      expect(item?.day).toBe(5);
    }
  });

  it("compresses the day-5 sight when the flight is very early", () => {
    const items = bjItems();
    const result = computeChange({
      request: "返程航班改成13:00",
      intent: ruleBasedChangeIntent("返程航班改成13:00起飞"),
      items,
      fixture: BEIJING_FIXTURE,
      planVersionId: "ver_bj",
      currentTicketId: null,
    });
    const sight = result.nextItems.find(
      (item) => readItemMeta(item).role === "DAY5_SIGHT",
    );
    // 13:00-120=11:00 airport; -55=10:05 taxi; -30=09:35 luggage; -25=09:10 sight end.
    expect(sight?.endAt).toBe("09:10");
  });
});

describe("hong kong changes (HKG-05 / HKG-06)", () => {
  it("adds the museum after TST and keeps locked ports and lunch times", () => {
    const items = hkItems();
    const lockedBefore = items
      .filter((item) => readItemMeta(item).locked)
      .map((item) => `${item.id}:${item.startAt}-${item.endAt}`);

    const result = computeChange({
      request: "加入香港历史博物馆",
      intent: ruleBasedChangeIntent("加入香港历史博物馆"),
      items,
      fixture: HONG_KONG_FIXTURE,
      planVersionId: "ver_hk",
      currentTicketId: null,
    });

    expect(
      result.impact.additions.some((item) =>
        item.title.includes("香港历史博物馆"),
      ),
    ).toBe(true);

    const lockedAfter = result.nextItems
      .filter((item) => readItemMeta(item).locked)
      .map((item) => `${item.id}:${item.startAt}-${item.endAt}`);
    expect(lockedAfter).toEqual(expect.arrayContaining(lockedBefore));
    expect(result.impact.preservedLockedItemIds.length).toBeGreaterThan(0);
  });

  it("replaces outdoor items with indoor alternatives in a storm, preserving ports and lunch", () => {
    const items = hkItems();
    const result = computeChange({
      request: "如果暴雨就不要去山顶",
      intent: ruleBasedChangeIntent("如果暴雨就不要去山顶"),
      items,
      fixture: HONG_KONG_FIXTURE,
      planVersionId: "ver_hk",
      currentTicketId: null,
    });

    const peak = result.nextItems.find(
      (item) => item.placeId === "hk-history-museum",
    );
    expect(peak).toBeDefined();
    expect(peak?.title).toContain("暴雨室内替代");

    const ports = result.nextItems.filter((item) =>
      ["ENTRY_PORT", "EXIT_PORT"].includes(readItemMeta(item).role ?? ""),
    );
    expect(ports).toHaveLength(2);
    const lunch = result.nextItems.find((item) => item.type === "MEAL");
    expect(lunch?.placeId).toBe("hk-central-lunch");
  });

  it("locked items are never silently removed", () => {
    const items = hkItems();
    const result = computeChange({
      request: "取消中环粤菜午餐",
      intent: { operations: [{ type: "REMOVE_PLACE", name: "中环粤菜午餐" }] },
      items,
      fixture: HONG_KONG_FIXTURE,
      planVersionId: "ver_hk",
      currentTicketId: null,
    });
    const lunch = result.nextItems.find((item) => item.type === "MEAL");
    expect(lunch).toBeDefined();
    expect(result.impact.removals).toHaveLength(0);
  });

  it("updates descent transit mode to tram when requested", () => {
    const items = hkItems();
    const result = computeChange({
      request: "把下山方式改回缆车",
      intent: ruleBasedChangeIntent("把下山方式改回缆车"),
      items,
      fixture: HONG_KONG_FIXTURE,
      planVersionId: "ver_hk",
      currentTicketId: "tram-return",
    });
    const descent = result.nextItems.find(
      (item) => readItemMeta(item).role === "DESCENT",
    );
    expect(descent?.transportMode).toBe("TRAM");
    expect(descent?.title).toBe("缆车下山");
  });
});
