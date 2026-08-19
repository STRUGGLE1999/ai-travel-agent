import type { ExtractConstraintsOutput, ParseChangeRequestOutput } from "@/domain";

export type AiProviderKind = "fake" | "anthropic" | "degraded-fake";

export interface ConstraintExtractInput {
  text: string;
  destination?: string;
}

export interface ChangeParseInput {
  text: string;
}

export interface AiProviderResult<T> {
  data: T;
  provider: AiProviderKind;
  degraded: boolean;
  cached: boolean;
  degradeReason?: string;
}

export interface AiProvider {
  kind: AiProviderKind;
  extractConstraints(
    input: ConstraintExtractInput,
  ): Promise<AiProviderResult<ExtractConstraintsOutput>>;
  parseChangeRequest(
    input: ChangeParseInput,
  ): Promise<AiProviderResult<ParseChangeRequestOutput>>;
}
