import { z } from "zod";
import {
  ignoredBlockReasonSchema,
  sourceInputTypeSchema,
} from "@/domain/enums";

export const ignoredBlockSchema = z.object({
  reason: ignoredBlockReasonSchema,
  quote: z.string(),
});
export type IgnoredBlock = z.infer<typeof ignoredBlockSchema>;

export const sourceInputSchema = z.object({
  id: z.string(),
  tripId: z.string(),
  type: sourceInputTypeSchema,
  rawText: z.string(),
  sanitizedText: z.string(),
  contentHash: z.string(),
  ignoredBlocks: z.array(ignoredBlockSchema),
  createdAt: z.string(),
});
export type SourceInput = z.infer<typeof sourceInputSchema>;
