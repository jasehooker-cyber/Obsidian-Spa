import { describe, expect, it } from "vitest";
import { getCrmEnv, getGoogleEnv, getSupabaseServerEnv } from "@/lib/config/env";

describe("scoped runtime environment", () => {
  it("loads CRM, Google, and Supabase server config without Cal.com or Stripe secrets", () => {
    const previous = { ...process.env };

    try {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
      process.env.SUPABASE_SECRET_KEY = "server-secret";
      process.env.GOOGLE_CLIENT_EMAIL = "svc@example.iam.gserviceaccount.com";
      process.env.GOOGLE_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\\ntest\\n-----END PRIVATE KEY-----";
      process.env.GOOGLE_CALENDAR_ID = "booking@example.com";

      delete process.env.CALCOM_WEBHOOK_SECRET;
      delete process.env.CALCOM_API_KEY;
      delete process.env.STRIPE_SECRET_KEY;
      delete process.env.STRIPE_WEBHOOK_SECRET;
      delete process.env.INTAKE_TOKEN_SECRET;

      expect(getCrmEnv().calendarIds).toEqual(["booking@example.com"]);
      expect(getGoogleEnv().configured).toBe(true);
      expect(getSupabaseServerEnv()).toEqual({
        url: "https://example.supabase.co",
        secretKey: "server-secret",
      });
    } finally {
      process.env = previous;
    }
  });
});
