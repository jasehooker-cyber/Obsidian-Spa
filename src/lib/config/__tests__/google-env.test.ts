import { afterEach, describe, expect, it } from "vitest";
import { getGoogleEnv } from "@/lib/config/env";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("getGoogleEnv", () => {
  it("recognizes WIF without a private key", () => {
    process.env.GOOGLE_CLIENT_EMAIL = "crm@example.iam.gserviceaccount.com";
    process.env.GOOGLE_CALENDAR_ID = "jase@obsidianspas.com";
    process.env.GCP_PROJECT_NUMBER = "123456789";
    process.env.GCP_WORKLOAD_IDENTITY_POOL_ID = "vercel-obsidian";
    process.env.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID = "vercel-production";
    delete process.env.GOOGLE_PRIVATE_KEY;

    const google = getGoogleEnv();

    expect(google.wifConfigured).toBe(true);
    expect(google.privateKeyConfigured).toBe(false);
    expect(google.configured).toBe(true);
  });

  it("does not require WIF when a legacy private key is configured", () => {
    process.env.GOOGLE_CLIENT_EMAIL = "crm@example.iam.gserviceaccount.com";
    process.env.GOOGLE_CALENDAR_ID = "jase@obsidianspas.com";
    process.env.GOOGLE_PRIVATE_KEY =
      "-----BEGIN PRIVATE KEY-----\\nkey\\n-----END PRIVATE KEY-----\\n";
    delete process.env.GCP_PROJECT_NUMBER;
    delete process.env.GCP_WORKLOAD_IDENTITY_POOL_ID;
    delete process.env.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID;

    const google = getGoogleEnv();

    expect(google.wifConfigured).toBe(false);
    expect(google.privateKeyConfigured).toBe(true);
    expect(google.configured).toBe(true);
  });
});
