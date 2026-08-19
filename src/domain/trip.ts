import { z } from "zod";
import { dataModeSchema, tripStatusSchema } from "@/domain/enums";

export const tripSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  title: z.string(),
  destination: z.string(),
  timezone: z.string(),
  dataMode: dataModeSchema,
  status: tripStatusSchema,
  fixtureId: z.enum(["hong-kong", "beijing"]).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Trip = z.infer<typeof tripSchema>;

export const anonymousSessionSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  lastSeenAt: z.string(),
  ipHash: z.string().nullable(),
});
export type AnonymousSession = z.infer<typeof anonymousSessionSchema>;
