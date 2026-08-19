import { z } from "zod";
import { constraintCategorySchema, changeRequestStatusSchema } from "@/domain/enums";
import { conflictSchema } from "@/domain/verification";
import { planItemSchema } from "@/domain/itinerary";

export const changeOperationSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("ADD_PLACE"),
    name: z.string(),
    afterPlaceName: z.string().optional(),
    day: z.number().int().positive().optional(),
  }),
  z.object({
    type: z.literal("REMOVE_PLACE"),
    name: z.string(),
  }),
  z.object({
    type: z.literal("SET_WEATHER"),
    condition: z.enum(["SUNNY", "RAIN", "STORM"]),
  }),
  z.object({
    type: z.literal("CHANGE_TICKET"),
    ticketType: z.string(),
    placeName: z.string().optional(),
  }),
  z.object({
    type: z.literal("CHANGE_FLIGHT"),
    direction: z.enum(["OUTBOUND", "RETURN"]),
    time: z.string(),
    flightNumber: z.string().optional(),
  }),
  z.object({
    type: z.literal("CHANGE_LODGING"),
    night: z.number().int().positive().optional(),
    locationHint: z.string(),
  }),
  z.object({
    type: z.literal("UPDATE_CONSTRAINT"),
    category: constraintCategorySchema,
    summary: z.string(),
    value: z.unknown().optional(),
  }),
]);
export type ChangeOperation = z.infer<typeof changeOperationSchema>;

export const changeIntentSchema = z.object({
  operations: z.array(changeOperationSchema).min(1),
  notes: z.string().optional(),
});
export type ChangeIntent = z.infer<typeof changeIntentSchema>;

export const changeRequestSchema = z.object({
  id: z.string(),
  tripId: z.string(),
  fromVersionId: z.string(),
  rawText: z.string(),
  parsedIntent: changeIntentSchema.nullable(),
  status: changeRequestStatusSchema,
  createdAt: z.string(),
});
export type ChangeRequest = z.infer<typeof changeRequestSchema>;

export const changeImpactSchema = z.object({
  request: z.string(),
  additions: z.array(planItemSchema),
  removals: z.array(z.string()),
  moves: z.array(
    z.object({
      itemId: z.string(),
      from: z.string(),
      to: z.string(),
    }),
  ),
  updates: z.array(
    z.object({
      itemId: z.string(),
      fields: z.record(z.string(), z.unknown()),
    }),
  ),
  preservedLockedItemIds: z.array(z.string()),
  newConflicts: z.array(conflictSchema),
  resolvedConflictIds: z.array(z.string()),
  bookingTaskImpacts: z.array(z.string()),
});
export type ChangeImpact = z.infer<typeof changeImpactSchema>;

export const changeImpactRecordSchema = z.object({
  id: z.string(),
  changeRequestId: z.string(),
  impact: changeImpactSchema,
  createdAt: z.string(),
});
export type ChangeImpactRecord = z.infer<typeof changeImpactRecordSchema>;
