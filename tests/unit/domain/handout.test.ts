import { describe, expect, it } from "vitest";
import { HONG_KONG_FIXTURE } from "@/fixtures/hong-kong/data";
import { BEIJING_FIXTURE } from "@/fixtures/beijing/data";
import { buildCandidatePlanItems } from "@/domain/planner/candidate";
import { calculateTripBudget } from "@/domain/budget/calculator";

describe("handout data preparation and structure", () => {
  it("prepares complete Hong Kong handout dataset", () => {
    const items = buildCandidatePlanItems({
      fixture: HONG_KONG_FIXTURE,
      planVersionId: "v1",
      constraints: [],
    });

    const budget = calculateTripBudget({
      items,
      fixture: HONG_KONG_FIXTURE,
      selectedTicketId: "tram-single",
    });

    expect(budget.partySize).toBe(3);
    expect(budget.currency).toBe("HKD");
    expect(budget.categories.length).toBeGreaterThanOrEqual(3);

    // Verify places have mapX and mapY for SVG topology rendering
    for (const place of HONG_KONG_FIXTURE.places) {
      expect(place.mapX).toBeTypeOf("number");
      expect(place.mapY).toBeTypeOf("number");
    }

    // Booking tasks matching
    for (const task of HONG_KONG_FIXTURE.bookingTasks) {
      expect(task.title).toBeTruthy();
      expect(task.usageDay).toBeGreaterThanOrEqual(1);
    }
  });

  it("prepares complete Beijing 5-day handout dataset", () => {
    const items = buildCandidatePlanItems({
      fixture: BEIJING_FIXTURE,
      planVersionId: "v1",
      constraints: [],
    });

    const budget = calculateTripBudget({
      items,
      fixture: BEIJING_FIXTURE,
    });

    expect(budget.partySize).toBe(2);
    expect(budget.currency).toBe("CNY");
    expect(budget.categories.some((c) => c.category === "LODGING")).toBe(true);

    // Multi-day items grouping check
    const days = new Set(items.map((i) => i.day));
    expect(days.size).toBe(5);
  });

  it("generates correct custom export names and incrementing sequences", async () => {
    const { getExportBaseName, toChineseNumber, consumeNextExportSeq, peekNextExportSeq } = await import(
      "@/lib/handout-naming"
    );

    expect(toChineseNumber(1)).toBe("一");
    expect(toChineseNumber(5)).toBe("五");
    expect(toChineseNumber(7)).toBe("七");
    expect(toChineseNumber(10)).toBe("十");
    expect(toChineseNumber(12)).toBe("十二");
    expect(toChineseNumber(20)).toBe("二十");
    expect(toChineseNumber(25)).toBe("二十五");

    // Matches user requirement: "按照不同地点的出游取不同的名字（比如香港一日游或者北京五日游）"
    expect(getExportBaseName("香港", 1)).toBe("香港一日游");
    expect(getExportBaseName("北京", 5)).toBe("北京五日游");
    expect(getExportBaseName("成都", 3)).toBe("成都三日游");
    expect(getExportBaseName(undefined, undefined, "自定义假日游")).toBe("自定义假日游");

    // Sequence in non-browser env defaults safely to "01"
    expect(peekNextExportSeq("t1", "20260904")).toBe("01");
    expect(consumeNextExportSeq("t1", "20260904")).toBe("01");
  });
});
