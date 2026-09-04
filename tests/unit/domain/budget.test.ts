import { describe, expect, it } from "vitest";
import { HONG_KONG_FIXTURE } from "@/fixtures/hong-kong/data";
import { BEIJING_FIXTURE } from "@/fixtures/beijing/data";
import { buildCandidatePlanItems } from "@/domain/planner/candidate";
import { calculateTripBudget } from "@/domain/budget/calculator";
import { runFeasibilityChecks } from "@/domain/rules/feasibility";
import type { Constraint } from "@/domain";

const NOW = "2026-04-18T00:00:00.000Z";

function makeConstraint(category: string, value: unknown, summary: string): Constraint {
  return {
    id: `c_${category}`,
    tripId: "test_trip",
    sourceInputId: null,
    category: category as Constraint["category"],
    kind: "HARD",
    value,
    summary,
    locked: true,
    confidence: 1,
    sourceQuote: summary,
    needsConfirmation: false,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

describe("budget calculation and rules (Step 2)", () => {
  it("calculates Hong Kong budget with partySize 3 and updates when ticket changes", () => {
    const items = buildCandidatePlanItems({
      fixture: HONG_KONG_FIXTURE,
      planVersionId: "v1",
      constraints: [],
    });

    const budgetSingle = calculateTripBudget({
      items,
      fixture: HONG_KONG_FIXTURE,
      selectedTicketId: "tram-single",
    });

    expect(budgetSingle.currency).toBe("HKD");
    expect(budgetSingle.partySize).toBe(3);
    const singleTicket = budgetSingle.items.find((i) => i.id === "ticket-tram-single");
    expect(singleTicket).toBeDefined();
    expect(singleTicket?.amount).toBe(76 * 3); // 228 HKD
    expect(singleTicket?.isConfirmed).toBe(true);

    const budgetReturn = calculateTripBudget({
      items,
      fixture: HONG_KONG_FIXTURE,
      selectedTicketId: "tram-return",
    });
    const returnTicket = budgetReturn.items.find((i) => i.id === "ticket-tram-return");
    expect(returnTicket?.amount).toBe(108 * 3); // 324 HKD

    // Total should accurately reflect ticket difference
    expect(budgetReturn.totalAmount - budgetSingle.totalAmount).toBe(324 - 228);
  });

  it("distinguishes confirmed tickets from estimated transit and meals", () => {
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

    expect(budget.totalConfirmed).toBe(76 * 3);
    expect(budget.totalEstimated).toBeGreaterThan(0);
    expect(budget.totalAmount).toBe(budget.totalConfirmed + budget.totalEstimated);

    const confirmedItems = budget.items.filter((i) => i.isConfirmed);
    const estimatedItems = budget.items.filter((i) => !i.isConfirmed);

    expect(confirmedItems.length).toBeGreaterThan(0);
    expect(estimatedItems.length).toBeGreaterThan(0);
    expect(confirmedItems.every((i) => i.source === "MOCK")).toBe(true);
    expect(estimatedItems.every((i) => i.source === "ESTIMATED")).toBe(true);
  });

  it("calculates Beijing multi-day multi-category budget including lodging", () => {
    const items = buildCandidatePlanItems({
      fixture: BEIJING_FIXTURE,
      planVersionId: "v1",
      constraints: [],
    });

    const budget = calculateTripBudget({
      items,
      fixture: BEIJING_FIXTURE,
    });

    expect(budget.currency).toBe("CNY");
    expect(budget.partySize).toBe(2);

    // Includes lodging for multi-day
    const lodging = budget.items.find((i) => i.category === "LODGING");
    expect(lodging).toBeDefined();
    expect(lodging?.amount).toBe(450 * 4); // 4 nights

    // Includes attractions
    const forbiddenCity = budget.items.find((i) => i.id === "ticket-bj-forbidden-city");
    expect(forbiddenCity?.amount).toBe(60 * 2);
  });

  it("flags BUDGET_EXCEEDED conflict when plan exceeds budget constraint", async () => {
    const items = buildCandidatePlanItems({
      fixture: HONG_KONG_FIXTURE,
      planVersionId: "v1",
      constraints: [],
    });

    // Budget limit of 500 HKD (total HK trip is around 900 HKD)
    const tightConstraint = makeConstraint("BUDGET", { max: 500 }, "预算上限 500 HKD");
    const resultOver = await runFeasibilityChecks({
      tripId: "trip_hk",
      planVersionId: "v1",
      fixture: HONG_KONG_FIXTURE,
      constraints: [tightConstraint],
      items,
      selectedTicketId: "tram-single",
      checkedAtIso: NOW,
    });

    const budgetConflict = resultOver.conflicts.find((c) => c.code === "BUDGET_EXCEEDED");
    expect(budgetConflict).toBeDefined();
    expect(budgetConflict?.severity).toBe("HIGH");

    // Generous budget limit of 3000 HKD
    const looseConstraint = makeConstraint("BUDGET", { max: 3000 }, "预算上限 3000 HKD");
    const resultOk = await runFeasibilityChecks({
      tripId: "trip_hk",
      planVersionId: "v1",
      fixture: HONG_KONG_FIXTURE,
      constraints: [looseConstraint],
      items,
      selectedTicketId: "tram-single",
      checkedAtIso: NOW,
    });

    expect(resultOk.conflicts.some((c) => c.code === "BUDGET_EXCEEDED")).toBe(false);
  });
});
