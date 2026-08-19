import { z } from "zod";
import {
  conflictCodeSchema,
  conflictSeveritySchema,
  dataModeSchema,
  verificationStatusSchema,
} from "@/domain/enums";

export const evidenceSchema = z.object({
  id: z.string(),
  tripId: z.string(),
  planVersionId: z.string().nullable(),
  factKey: z.string(),
  value: z.unknown(),
  sourceName: z.string(),
  sourceUrl: z.string().nullable(),
  provider: z.string(),
  checkedAt: z.string().nullable(),
  status: verificationStatusSchema,
  confidence: z.number().min(0).max(1).nullable(),
  expiresAt: z.string().nullable(),
  dataMode: dataModeSchema,
});
export type Evidence = z.infer<typeof evidenceSchema>;

export const conflictSchema = z.object({
  id: z.string(),
  tripId: z.string(),
  planVersionId: z.string(),
  severity: conflictSeveritySchema,
  code: conflictCodeSchema,
  title: z.string(),
  description: z.string(),
  affectedItemIds: z.array(z.string()),
  violatedConstraintIds: z.array(z.string()),
  suggestedActions: z.array(z.string()),
  resolved: z.boolean(),
});
export type Conflict = z.infer<typeof conflictSchema>;
