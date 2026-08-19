import { describe, expect, it } from "vitest";
import { EVAL_CASE_CATALOG } from "@/evals/catalog";
import { formatEvalReport, runOfflineEval } from "@/evals/run-offline";

describe("offline AI evaluation dataset", () => {
  it("covers the published catalog and prints a repeatable scoreboard", async () => {
    const report = await runOfflineEval();
    // Keep the scoreboard in CI logs so the case study numbers are reproducible.
    console.log(`\n${formatEvalReport(report)}\n`);
    expect(report.total).toBe(EVAL_CASE_CATALOG.length);
    expect(report.provider).toBe("fake");
    expect(report.failed).toBe(0);
    expect(report.cases.every((entry) => entry.passed)).toBe(true);
  });
});
