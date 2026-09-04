import type {
  ExtractConstraintsOutput,
  ParseChangeRequestOutput,
} from "@/domain";
import {
  extractConstraintsOutputSchema,
  parseChangeRequestOutputSchema,
} from "@/domain";
import type { ChangeOperation } from "@/domain";
import { FIXTURES } from "@/fixtures";
import type {
  AiProvider,
  AiProviderResult,
  ChangeParseInput,
  ConstraintExtractInput,
} from "@/services/ai/types";

/**
 * Deterministic Fake AI. Fixture demo texts return the exact curated
 * extraction; arbitrary text goes through simple keyword rules. Never
 * calls the network.
 */
export function createFakeAiProvider(): AiProvider {
  return {
    kind: "fake",
    async extractConstraints(
      input: ConstraintExtractInput,
    ): Promise<AiProviderResult<ExtractConstraintsOutput>> {
      const fixture = matchFixture(input.text);
      const data = fixture
        ? fixture.extraction
        : genericExtraction(input.text);
      return {
        data: extractConstraintsOutputSchema.parse(data),
        provider: "fake",
        degraded: false,
        cached: false,
      };
    },
    async parseChangeRequest(
      input: ChangeParseInput,
    ): Promise<AiProviderResult<ParseChangeRequestOutput>> {
      return {
        data: parseChangeRequestOutputSchema.parse(
          ruleBasedChangeIntent(input.text),
        ),
        provider: "fake",
        degraded: false,
        cached: false,
      };
    },
  };
}

function matchFixture(text: string) {
  for (const fixture of Object.values(FIXTURES)) {
    const probe = fixture.demoSourceText.slice(0, 40);
    if (text.includes(probe.slice(0, 20))) {
      return fixture;
    }
  }
  if (text.includes("福田口岸") && text.includes("罗湖")) {
    return FIXTURES["hong-kong"];
  }
  if (text.includes("北京") && (text.includes("CA18") || text.includes("恭王府"))) {
    return FIXTURES["beijing"];
  }
  return null;
}

function genericExtraction(text: string): ExtractConstraintsOutput {
  const constraints: ExtractConstraintsOutput["constraints"] = [];
  const placeCandidates: ExtractConstraintsOutput["placeCandidates"] = [];

  const quote = (keyword: string): string => {
    const line = text
      .split("\n")
      .find((entry) => entry.includes(keyword));
    return (line ?? keyword).slice(0, 200);
  };

  if (text.includes("老人") || text.includes("爸妈") || text.includes("父母")) {
    constraints.push({
      category: "TRAVELER",
      kind: "HARD",
      value: { travelers: "老人同行" },
      summary: "老人同行",
      confidence: 0.8,
      sourceQuote: quote("老人"),
      needsConfirmation: true,
    });
  }
  if (text.includes("少走路") || text.includes("不要暴走") || text.includes("不暴走")) {
    constraints.push({
      category: "MOBILITY",
      kind: "HARD",
      value: { maxWalkMeters: 3000, maxTransfers: 4 },
      summary: "少走路、减少换乘",
      confidence: 0.75,
      sourceQuote: quote("走"),
      needsConfirmation: true,
    });
  }

  const avoidMatches = text.match(/不(?:坐|去|要|想去)([^\s，。、；]{2,12})/g) ?? [];
  for (const raw of avoidMatches) {
    const target = raw.replace(/^不(?:坐|去|要|想去)/, "");
    if (target.includes("暴走") || target.length < 2) {
      continue;
    }
    constraints.push({
      category: "AVOID",
      kind: "NEGATIVE",
      value: { avoid: target },
      summary: `不去/不坐：${target}`,
      confidence: 0.8,
      sourceQuote: quote(target),
      needsConfirmation: false,
    });
  }

  const wantMatches = text.match(/想去([^\s，。、；]{2,12})/g) ?? [];
  for (const raw of wantMatches) {
    const target = raw.replace(/^想去/, "");
    constraints.push({
      category: "MUST_VISIT",
      kind: "SOFT",
      value: { place: target },
      summary: `想去${target}`,
      confidence: 0.7,
      sourceQuote: quote(target),
      needsConfirmation: false,
    });
    placeCandidates.push({
      name: target,
      category: null,
      candidateStatus: "WANT_TO_GO",
      sourceQuote: quote(target),
    });
  }

  if (constraints.length === 0) {
    constraints.push({
      category: "DATE_TIME",
      kind: "UNKNOWN",
      value: { raw: text.slice(0, 100) },
      summary: "未识别出明确约束，请手动补充",
      confidence: 0.2,
      sourceQuote: text.slice(0, 120),
      needsConfirmation: true,
    });
  }

  return {
    constraints,
    placeCandidates,
    ignoredBlocks: [],
    openQuestions:
      placeCandidates.length === 0
        ? ["未识别到明确的地点偏好，可在约束页手动添加。"]
        : [],
  };
}

export function ruleBasedChangeIntent(text: string): ParseChangeRequestOutput {
  const operations: ChangeOperation[] = [];

  const flightMatch = text.match(
    /(返程|回程|回去)[^0-9]*?(\d{1,2})[:：点](\d{2})?/,
  );
  if (flightMatch && /航班|飞机|起飞|返程/.test(text)) {
    const hh = flightMatch[2].padStart(2, "0");
    const mm = (flightMatch[3] ?? "00").padStart(2, "0");
    operations.push({
      type: "CHANGE_FLIGHT",
      direction: "RETURN",
      time: `${hh}:${mm}`,
    });
  }

  if (/暴雨|大雨|台风/.test(text)) {
    operations.push({ type: "SET_WEATHER", condition: "STORM" });
  } else if (/下雨|降雨/.test(text)) {
    operations.push({ type: "SET_WEATHER", condition: "RAIN" });
  }

  const addMatches =
    text.match(/(?:加入|加上|添加|想再去|插入)([^\s，。、；]{2,20})/g) ?? [];
  for (const raw of addMatches) {
    const name = raw.replace(/^(?:加入|加上|添加|想再去|插入)/, "");
    operations.push({ type: "ADD_PLACE", name });
  }

  const removeMatches =
    text.match(/(?:取消|删掉|删除|不去了?)([^\s，。、；]{2,20})/g) ?? [];
  for (const raw of removeMatches) {
    const name = raw.replace(/^(?:取消|删掉|删除|不去了?)/, "");
    if (name.length >= 2) {
      operations.push({ type: "REMOVE_PLACE", name });
    }
  }

  if (/下山.*缆车|缆车.*下山|改回缆车|改坐缆车|改乘缆车|坐缆车下山/.test(text)) {
    operations.push({
      type: "CHANGE_TRANSIT",
      role: "DESCENT",
      transportMode: "TRAM",
      title: "缆车下山",
    });
  } else if (/下山.*出租车|出租车.*下山|打车.*下山|下山.*打车/.test(text)) {
    operations.push({
      type: "CHANGE_TRANSIT",
      role: "DESCENT",
      transportMode: "TAXI",
      title: "出租车下山",
    });
  }

  if (/单程/.test(text)) {
    operations.push({ type: "CHANGE_TICKET", ticketType: "tram-single" });
  } else if (/套票|摩天台/.test(text)) {
    operations.push({ type: "CHANGE_TICKET", ticketType: "tram-sky-pass" });
  } else if (/往返/.test(text)) {
    operations.push({ type: "CHANGE_TICKET", ticketType: "tram-return" });
  }

  if (/机场附近|住机场/.test(text)) {
    operations.push({
      type: "CHANGE_LODGING",
      locationHint: "机场附近",
    });
  }

  if (operations.length === 0) {
    operations.push({
      type: "UPDATE_CONSTRAINT",
      category: "DATE_TIME",
      summary: `无法解析的变更请求：${text.slice(0, 80)}`,
    });
  }

  return { operations };
}
