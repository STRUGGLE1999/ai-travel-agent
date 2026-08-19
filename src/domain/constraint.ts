import { z } from "zod";
import {
  constraintCategorySchema,
  constraintKindSchema,
} from "@/domain/enums";

export const constraintSchema = z.object({
  id: z.string(),
  tripId: z.string(),
  sourceInputId: z.string().nullable(),
  category: constraintCategorySchema,
  kind: constraintKindSchema,
  value: z.unknown(),
  summary: z.string(),
  locked: z.boolean(),
  confidence: z.number().min(0).max(1),
  sourceQuote: z.string(),
  needsConfirmation: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Constraint = z.infer<typeof constraintSchema>;

export const extractedConstraintSchema = constraintSchema.omit({
  id: true,
  tripId: true,
  sourceInputId: true,
  locked: true,
  createdAt: true,
  updatedAt: true,
});
export type ExtractedConstraint = z.infer<typeof extractedConstraintSchema>;
