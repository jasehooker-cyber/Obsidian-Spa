function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

/**
 * Server-side Supabase settings used by database helpers.
 * Kept separate from the full app config so unrelated integrations cannot
 * break CRM/database requests.
 */
export function getSupabaseServerEnv() {
  return {
    url: required("NEXT_PUBLIC_SUPABASE_URL"),
    secretKey: required("SUPABASE_SECRET_KEY"),
  };
}

/** Google Calendar settings used by the CRM and calendar helpers. */
export function getGoogleEnv() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL ?? "";
  const privateKey = process.env.GOOGLE_PRIVATE_KEY ?? "";
  const calendarId = process.env.GOOGLE_CALENDAR_ID ?? "";

  return {
    clientEmail,
    privateKey,
    calendarId,
    configured: !!(clientEmail && privateKey && calendarId),
  };
}

/** CRM-specific settings. These must not depend on Cal.com or Stripe secrets. */
export function getCrmEnv() {
  return {
    calendarIds: (
      process.env.CRM_CALENDAR_IDS ??
      process.env.GOOGLE_CALENDAR_ID ??
      ""
    )
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
    internalEmails: (process.env.CRM_INTERNAL_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
    cronSecret: process.env.CRON_SECRET ?? "",
  };
}

function lazyEnv() {
  const configuredStaffEmails = (process.env.STAFF_ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const staffAllowedEmails = Array.from(
    new Set(["admin@obsidianspas.com", ...configuredStaffEmails])
  );

  const supabaseServer = getSupabaseServerEnv();

  return {
    siteUrl: optional("NEXT_PUBLIC_SITE_URL", "http://localhost:3000"),

    supabase: {
      ...supabaseServer,
      anonKey: required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    },

    stripe: {
      secretKey: required("STRIPE_SECRET_KEY"),
      publishableKey: required("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"),
      webhookSecret: required("STRIPE_WEBHOOK_SECRET"),
    },

    cal: {
      apiKey: required("CALCOM_API_KEY"),
      webhookSecret: required("CALCOM_WEBHOOK_SECRET"),
      versions: {
        bookings: optional("CALCOM_API_VERSION_BOOKINGS", "2024-08-13"),
        slots: optional("CALCOM_API_VERSION_SLOTS", "2024-09-04"),
        eventTypes: optional("CALCOM_API_VERSION_EVENT_TYPES", "2024-06-14"),
      },
    },

    google: getGoogleEnv(),
    crm: getCrmEnv(),

    resend: {
      apiKey: process.env.RESEND_API_KEY ?? "",
      fromEmail: optional("RESEND_FROM_EMAIL", "onboarding@resend.dev"),
      configured: !!process.env.RESEND_API_KEY,
    },

    auth: {
      staffAllowedEmails,
      intakeTokenSecret: required("INTAKE_TOKEN_SECRET"),
    },
  };
}

type Env = ReturnType<typeof lazyEnv>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (!cached) cached = lazyEnv();
  return cached;
}
