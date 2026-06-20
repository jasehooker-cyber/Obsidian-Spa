import { z } from "zod/v4";

const SERVICE_IDS = [
  "signature-60",
  "signature-90",
  "couples",
  "four-handed",
] as const;

const ADD_ON_IDS = ["cbd", "hot-stones", "cupping"] as const;

export const BookingDraftSchema = z.object({
  serviceId: z.enum(SERVICE_IDS),
  addOnIds: z.array(z.enum(ADD_ON_IDS)),
  therapistId: z.string().uuid(),
  slotStart: z.iso.datetime(),
  slotEnd: z.iso.datetime(),
});

export type BookingDraftInput = z.infer<typeof BookingDraftSchema>;

export const CreateSetupSessionSchema = z.object({
  draftId: z.string().uuid(),
  clientName: z.string().min(1).max(200),
  clientEmail: z.email(),
  clientPhone: z.string().min(7).max(20),
});

export type CreateSetupSessionInput = z.infer<typeof CreateSetupSessionSchema>;

export const IntakeSubmissionSchema = z.object({
  token: z.string().uuid(),
  healthConditions: z.string().max(2000).optional(),
  allergies: z.string().max(1000).optional(),
  pressurePreference: z.enum(["light", "medium", "firm", "deep"]),
  focusAreas: z.string().max(1000).optional(),
  avoidAreas: z.string().max(1000).optional(),
  additionalNotes: z.string().max(2000).optional(),
});

export type IntakeSubmissionInput = z.infer<typeof IntakeSubmissionSchema>;
