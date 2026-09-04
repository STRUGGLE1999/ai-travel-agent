import { describe, expect, it, vi } from "vitest";
import { HONG_KONG_FIXTURE } from "@/fixtures/hong-kong/data";
import { buildCandidatePlanItems } from "@/domain/planner/candidate";
import { runFeasibilityChecks } from "@/domain/rules/feasibility";
import { derivePlanStatus } from "@/domain/rules/verification-status";
import { AmapClient, AmapMapProvider, AmapWeatherProvider, ProviderCache } from "@/services/providers";
import type { Constraint } from "@/domain";

const NOW = "2026-04-18T00:00:00.000Z";

function hkConstraints(): Constraint[] {
  return HONG_KONG_FIXTURE.extraction.constraints.map((extracted, index) => ({
    id: `c${index}`,
    tripId: "trip_hk",
    sourceInputId: null,
    category: extracted.category,
    kind: extracted.kind,
    value: extracted.value ?? {},
    summary: extracted.summary,
    locked: true,
    confidence: extracted.confidence,
    sourceQuote: extracted.sourceQuote,
    needsConfirmation: false,
    createdAt: NOW,
    updatedAt: NOW,
  }));
}

describe("Step 3: Live External Verification with AMap Providers", () => {
  it("promotes evidence to VERIFIED and upgrades plan status when live providers succeed", async () => {
    const constraints = hkConstraints();
    const items = buildCandidatePlanItems({
      fixture: HONG_KONG_FIXTURE,
      planVersionId: "ver_live",
      constraints,
    });

    const placesMap = new Map(HONG_KONG_FIXTURE.places.map((p) => [p.placeId, p]));

    // Mock AMap fetch client returning realistic transit, walking, and sunny weather responses
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("direction/transit")) {
        return {
          ok: true,
          json: async () => ({
            status: "1",
            info: "OK",
            infocode: "10000",
            route: {
              transits: [
                {
                  duration: "1800", // 30 min
                  distance: "15000",
                  walking_distance: "300",
                  segments: [{ bus: { buslines: [{ name: "港铁东铁线" }] } }],
                },
              ],
            },
          }),
        } as unknown as Response;
      }

      if (url.includes("direction/walking")) {
        return {
          ok: true,
          json: async () => ({
            status: "1",
            info: "OK",
            infocode: "10000",
            route: {
              paths: [{ distance: "600", duration: "480" }],
            },
          }),
        } as unknown as Response;
      }

      if (url.includes("direction/driving")) {
        return {
          ok: true,
          json: async () => ({
            status: "1",
            info: "OK",
            infocode: "10000",
            route: {
              paths: [{ distance: "5000", duration: "900" }],
            },
          }),
        } as unknown as Response;
      }

      if (url.includes("weather/weatherInfo")) {
        return {
          ok: true,
          json: async () => ({
            status: "1",
            info: "OK",
            infocode: "10000",
            forecasts: [
              {
                city: "香港",
                adcode: "810000",
                casts: [
                  {
                    date: "2026-04-18",
                    dayweather: "晴",
                    nightweather: "晴",
                    daytemp: "27",
                    nighttemp: "22",
                  },
                ],
              },
            ],
          }),
        } as unknown as Response;
      }

      throw new Error(`Unexpected endpoint: ${url}`);
    });

    const client = new AmapClient({ apiKey: "mock-valid-key", fetchFn: fetchMock });
    const cache = new ProviderCache();
    const mapProvider = new AmapMapProvider({ client, cache, placeResolver: (id) => placesMap.get(id) });
    const weatherProvider = new AmapWeatherProvider({ client, cache });

    const result = await runFeasibilityChecks({
      tripId: "trip_hk",
      planVersionId: "ver_live",
      fixture: HONG_KONG_FIXTURE,
      constraints,
      items,
      selectedTicketId: "tram-single", // Valid single ticket
      checkedAtIso: NOW,
      mapProvider,
      weatherProvider,
    });

    // Check evidence status
    const verifiedEvidences = result.evidence.filter((e) => e.status === "VERIFIED");
    expect(verifiedEvidences.length).toBeGreaterThan(0);

    // Weather evidence should be VERIFIED
    const weatherEvidence = result.evidence.find((e) => e.factKey.startsWith("weather:forecast"));
    expect(weatherEvidence).toBeDefined();
    expect(weatherEvidence?.status).toBe("VERIFIED");
    expect(weatherEvidence?.dataMode).toBe("LIVE_PARTIAL");

    // Mobility evidence should be VERIFIED
    const mobilityEvidence = result.evidence.find((e) => e.factKey === "mobility:totalWalkMeters");
    expect(mobilityEvidence).toBeDefined();
    expect(mobilityEvidence?.status).toBe("VERIFIED");

    // Transit routes should be VERIFIED
    const routeEvidences = result.evidence.filter((e) => e.factKey.startsWith("route:"));
    expect(routeEvidences.some((e) => e.status === "VERIFIED")).toBe(true);

    // No blocking conflicts
    const blocking = result.conflicts.filter((c) => c.severity === "BLOCKING");
    expect(blocking.length).toBe(0);

    // Plan status derivation with no blocking conflicts
    const planStatus = derivePlanStatus({ conflicts: result.conflicts, evidence: result.evidence });
    expect(["READY", "READY_WITH_WARNINGS"]).toContain(planStatus);
  });

  it("detects severe storm via AMap weather and triggers WEATHER_VIOLATION on outdoor places", async () => {
    const constraints = hkConstraints();
    const items = buildCandidatePlanItems({
      fixture: HONG_KONG_FIXTURE,
      planVersionId: "ver_storm",
      constraints,
    });

    const placesMap = new Map(HONG_KONG_FIXTURE.places.map((p) => [p.placeId, p]));

    // Weather returns thunderstorm
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("weather/weatherInfo")) {
        return {
          ok: true,
          json: async () => ({
            status: "1",
            info: "OK",
            infocode: "10000",
            forecasts: [
              {
                city: "香港",
                adcode: "810000",
                casts: [
                  {
                    date: "2026-04-18",
                    dayweather: "特大暴雨",
                    nightweather: "雷暴",
                    daytemp: "25",
                    nighttemp: "22",
                  },
                ],
              },
            ],
          }),
        } as unknown as Response;
      }
      return {
        ok: true,
        json: async () => ({
          status: "1",
          info: "OK",
          infocode: "10000",
          route: { paths: [{ distance: "1000", duration: "600" }] },
        }),
      } as unknown as Response;
    });

    const client = new AmapClient({ apiKey: "mock-valid-key", fetchFn: fetchMock });
    const weatherProvider = new AmapWeatherProvider({ client });
    const mapProvider = new AmapMapProvider({ client, placeResolver: (id) => placesMap.get(id) });

    const result = await runFeasibilityChecks({
      tripId: "trip_hk",
      planVersionId: "ver_storm",
      fixture: HONG_KONG_FIXTURE,
      constraints,
      items,
      selectedTicketId: "tram-single",
      checkedAtIso: NOW,
      mapProvider,
      weatherProvider,
    });

    const weatherConflict = result.conflicts.find((c) => c.code === "WEATHER_VIOLATION");
    expect(weatherConflict).toBeDefined();
    expect(weatherConflict?.title).toBe("室外行程遇暴雨预警");
    expect(weatherConflict?.description).toContain("特大暴雨");
  });
});
