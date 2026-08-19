import { z } from "zod";
import { bookingTaskStatusSchema } from "@/domain/enums";

export const bookingTaskSchema = z.object({
  id: z.string(),
  tripId: z.string(),
  planVersionId: z.string(),
  title: z.string(),
  placeId: z.string().nullable(),
  usageDate: z.string(),
  suggestedTimeWindow: z.string().nullable(),
  ticketType: z.string().nullable(),
  partySize: z.number().int().positive().nullable(),
  budgetAmount: z.number().nullable(),
  budgetCurrency: z.string().nullable(),
  status: bookingTaskStatusSchema,
  sourceName: z.string().nullable(),
  sourceUrl: z.string().nullable(),
  jumpParams: z.record(z.string(), z.unknown()).nullable(),
  evidenceId: z.string().nullable(),
});
export type BookingTask = z.infer<typeof bookingTaskSchema>;
