import { z } from "zod";
import {
  placeCandidateStatusSchema,
  verificationStatusSchema,
} from "@/domain/enums";

export const placeCandidateSchema = z.object({
  id: z.string(),
  tripId: z.string(),
  name: z.string(),
  placeId: z.string().nullable(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  category: z.string().nullable(),
  candidateStatus: placeCandidateStatusSchema,
  verificationStatus: verificationStatusSchema,
  createdAt: z.string(),
});
export type PlaceCandidate = z.infer<typeof placeCandidateSchema>;
