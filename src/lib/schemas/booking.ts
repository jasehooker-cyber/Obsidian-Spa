import { z } from "zod/v4";

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
