import { describe, expect, it } from "vitest";
import {
  changeIntentSchema,
  extractConstraintsOutputSchema,
  tripSchema,
} from "@/domain";

describe("domain schemas", () => {
  it("parses a valid trip", () => {
    const trip = tripSchema.parse({
      id: "trip_1",
      sessionId: "sess_1",
      title: "香港一日游",
      destination: "Hong Kong",
      timezone: "Asia/Hong_Kong",
      dataMode: "DEMO",
      status: "DRAFT",
      fixtureId: "hong-kong",
      createdAt: "2026-04-12T00:00:00.000Z",
      updatedAt: "2026-04-12T00:00:00.000Z",
    });
    expect(trip.fixtureId).toBe("hong-kong");
  });

  it("rejects invalid trip status", () => {
    expect(() =>
      tripSchema.parse({
        id: "trip_1",
        sessionId: "sess_1",
        title: "香港一日游",
        destination: "Hong Kong",
        timezone: "Asia/Hong_Kong",
        dataMode: "DEMO",
        status: "FINAL",
        fixtureId: null,
        createdAt: "2026-04-12T00:00:00.000Z",
        updatedAt: "2026-04-12T00:00:00.000Z",
      }),
    ).toThrow();
  });

  it("accepts extract output with ignored instruction blocks", () => {
    const output = extractConstraintsOutputSchema.parse({
      constraints: [
        {
          category: "START_END",
          kind: "HARD",
          value: { entry: "福田口岸", exit: "罗湖口岸" },
          summary: "福田口岸进入，罗湖口岸返回",
          confidence: 0.9,
          sourceQuote: "福田口岸出发、罗湖返回",
          needsConfirmation: true,
        },
      ],
      placeCandidates: [],
      ignoredBlocks: [
        {
          reason: "IGNORED_INSTRUCTION",
          quote: "# AGENTS.md instructions",
        },
      ],
      openQuestions: [],
    });
    expect(output.ignoredBlocks[0]?.reason).toBe("IGNORED_INSTRUCTION");
  });

  it("parses a structured change intent", () => {
    const intent = changeIntentSchema.parse({
      operations: [
        { type: "SET_WEATHER", condition: "STORM" },
        { type: "ADD_PLACE", name: "香港历史博物馆" },
      ],
    });
    expect(intent.operations).toHaveLength(2);
  });
});
