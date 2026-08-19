import { z } from "zod";
import { planItemTypeSchema, transportModeSchema, tripStatusSchema } from "@/domain/enums";

export const planVersionSchema = z.object({
  id: z.string(),
  tripId: z.string(),
  versionNumber: z.number().int().positive(),
  parentVersionId: z.string().nullable(),
  changeRequestId: z.string().nullable(),
  status: tripStatusSchema,
  confirmedAt: z.string().nullable(),
  createdAt: z.string(),
});
export type PlanVersion = z.infer<typeof planVersionSchema>;

export const planItemSchema = z.object({
  id: z.string(),
  planVersionId: z.string(),
  day: z.number().int().positive(),
  startAt: z.string(),
  endAt: z.string(),
  type: planItemTypeSchema,
  title: z.string(),
  placeId: z.string().nullable(),
  transportMode: transportModeSchema.nullable(),
  appliedConstraintIds: z.array(z.string()),
  evidenceIds: z.array(z.string()),
  notes: z.string().nullable(),
  sortOrder: z.number().int(),
});
export type PlanItem = z.infer<typeof planItemSchema>;
