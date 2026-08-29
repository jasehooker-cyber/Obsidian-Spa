import { z } from "zod/v4";

export const SyncRequestSchema = z.object({
  /**
   * How far back to scan. The routine sync uses the default; a wider value is
   * for backfilling history the first time, or after a gap.
   */
  lookbackDays: z.number().int().min(1).max(1095).optional(),
});

export type SyncRequestInput = z.infer<typeof SyncRequestSchema>;

export const ClientListQuerySchema = z.object({
  /** Free text over name, email, and phone. */
  q: z.string().trim().max(120).optional(),
  sort: z
    .enum(["last_visit", "lifetime_value", "visit_count", "name"])
    .default("last_visit"),
  /** Only clients whose last visit is at least this many days ago. */
  lapsedDays: z.coerce.number().int().min(0).max(3650).optional(),
  /** Drop anyone with no email and no phone — they cannot be contacted. */
  // Not z.coerce.boolean(): that treats the string "false" as true.
  contactableOnly: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(200),
});

export type ClientListQueryInput = z.infer<typeof ClientListQuerySchema>;

export const ClientUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  email: z.union([z.email(), z.literal("")]).optional(),
  phone: z.string().trim().max(32).optional(),
  notes: z.string().trim().max(2000).optional(),
  marketingOptOut: z.boolean().optional(),
});

export type ClientUpdateInput = z.infer<typeof ClientUpdateSchema>;
