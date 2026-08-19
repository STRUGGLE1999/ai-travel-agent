import { z } from "zod";
import { extractedConstraintSchema } from "@/domain/constraint";
import { ignoredBlockSchema } from "@/domain/source";
import { placeCandidateStatusSchema } from "@/domain/enums";
import { changeIntentSchema } from "@/domain/change";

export const extractedPlaceCandidateSchema = z.object({
  name: z.string(),
  category: z.string().nullable(),
  candidateStatus: placeCandidateStatusSchema,
  sourceQuote: z.string(),
});
export type ExtractedPlaceCandidate = z.infer<
  typeof extractedPlaceCandidateSchema
>;

export const extractConstraintsOutputSchema = z.object({
  constraints: z.array(extractedConstraintSchema),
  placeCandidates: z.array(extractedPlaceCandidateSchema),
  ignoredBlocks: z.array(ignoredBlockSchema),
  openQuestions: z.array(z.string()),
});
export type ExtractConstraintsOutput = z.infer<
  typeof extractConstraintsOutputSchema
>;

export const parseChangeRequestOutputSchema = changeIntentSchema;
export type ParseChangeRequestOutput = z.infer<
  typeof parseChangeRequestOutputSchema
>;

export const llmCacheRecordSchema = z.object({
  id: z.string(),
  taskType: z.enum(["extractConstraints", "parseChangeRequest"]),
  inputHash: z.string(),
  model: z.string(),
  output: z.unknown(),
  createdAt: z.string(),
  expiresAt: z.string().nullable(),
});
export type LlmCacheRecord = z.infer<typeof llmCacheRecordSchema>;

export const llmUsageDailySchema = z.object({
  id: z.string(),
  day: z.string(),
  scope: z.enum(["SESSION", "IP", "GLOBAL"]),
  scopeKey: z.string(),
  count: z.number().int().nonnegative(),
});
export type LlmUsageDaily = z.infer<typeof llmUsageDailySchema>;
