function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

function lazyEnv() {
  return {
    siteUrl: optional("NEXT_PUBLIC_SITE_URL", "http://localhost:3000"),

    supabase: {
      url: required("NEXT_PUBLIC_SUPABASE_URL"),
      anonKey: required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
      secretKey: required("SUPABASE_SECRET_KEY"),
    },

    stripe: {
      secretKey: required("STRIPE_SECRET_KEY"),
      publishableKey: required("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"),
      webhookSecret: required("STRIPE_WEBHOOK_SECRET"),
    },

    cal: {
      apiKey: required("CALCOM_API_KEY"),
      versions: {
        bookings: optional("CALCOM_API_VERSION_BOOKINGS", "2024-08-13"),
        slots: optional("CALCOM_API_VERSION_SLOTS", "2024-09-04"),
        eventTypes: optional("CALCOM_API_VERSION_EVENT_TYPES", "2024-06-14"),
      },
    },

    google: {
      clientEmail: process.env.GOOGLE_CLIENT_EMAIL ?? "",
      privateKey: process.env.GOOGLE_PRIVATE_KEY ?? "",
      calendarId: process.env.GOOGLE_CALENDAR_ID ?? "",
      configured: !!(
        process.env.GOOGLE_CLIENT_EMAIL &&
        process.env.GOOGLE_PRIVATE_KEY &&
        process.env.GOOGLE_CALENDAR_ID
      ),
    },

    resend: {
      apiKey: process.env.RESEND_API_KEY ?? "",
      fromEmail: optional("RESEND_FROM_EMAIL", "onboarding@resend.dev"),
      configured: !!process.env.RESEND_API_KEY,
    },

    auth: {
      staffAllowedEmails: required("STAFF_ALLOWED_EMAILS")
        .split(",")
        .map((e) => e.trim().toLowerCase()),
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
