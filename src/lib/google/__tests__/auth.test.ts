import { afterEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

function setWifEnv() {
  process.env.GOOGLE_CLIENT_EMAIL = "crm@example.iam.gserviceaccount.com";
  process.env.GOOGLE_CALENDAR_ID = "jase@obsidianspas.com";
  process.env.GCP_PROJECT_NUMBER = "123456789";
  process.env.GCP_WORKLOAD_IDENTITY_POOL_ID = "vercel-obsidian";
  process.env.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID = "vercel-production";
  process.env.VERCEL_OIDC_TOKEN = "vercel-oidc-token";
}

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.restoreAllMocks();
  vi.resetModules();
});

describe("getGoogleCalendarAccessToken", () => {
  it("exchanges Vercel OIDC for a Calendar-scoped service-account token", async () => {
    setWifEnv();
    delete process.env.GOOGLE_PRIVATE_KEY;

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ access_token: "federated-token", expires_in: 3600 }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            accessToken: "calendar-token",
            expireTime: new Date(Date.now() + 3_600_000).toISOString(),
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        )
      );

    const { getGoogleCalendarAccessToken } = await import("@/lib/google/auth");
    const token = await getGoogleCalendarAccessToken();

    expect(token).toBe("calendar-token");
    expect(fetchMock).toHaveBeenCalledTimes(2);

    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://sts.googleapis.com/v1/token"
    );
    const stsBody = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(stsBody.audience).toBe(
      "//iam.googleapis.com/projects/123456789/locations/global/workloadIdentityPools/vercel-obsidian/providers/vercel-production"
    );
    expect(stsBody.subjectToken).toBe("vercel-oidc-token");
    expect(stsBody.subjectTokenType).toBe(
      "urn:ietf:params:oauth:token-type:jwt"
    );

    expect(String(fetchMock.mock.calls[1][0])).toContain(
      "crm%40example.iam.gserviceaccount.com:generateAccessToken"
    );
    const impersonationBody = JSON.parse(
      String(fetchMock.mock.calls[1][1]?.body)
    );
    expect(impersonationBody.scope).toEqual([
      "https://www.googleapis.com/auth/calendar",
    ]);
  });

  it("fails clearly when WIF is configured but the Vercel token is unavailable", async () => {
    setWifEnv();
    delete process.env.VERCEL_OIDC_TOKEN;
    delete process.env.GOOGLE_PRIVATE_KEY;

    const { getGoogleCalendarAccessToken } = await import("@/lib/google/auth");

    await expect(getGoogleCalendarAccessToken()).rejects.toThrow(
      "Vercel OIDC token is unavailable"
    );
  });

  it("prefers WIF over a legacy private key", async () => {
    setWifEnv();
    process.env.GOOGLE_PRIVATE_KEY = "not-a-real-private-key";

    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ access_token: "federated-token", expires_in: 3600 }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            accessToken: "calendar-token",
            expireTime: new Date(Date.now() + 3_600_000).toISOString(),
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        )
      );

    const { getGoogleCalendarAccessToken } = await import("@/lib/google/auth");

    await expect(getGoogleCalendarAccessToken()).resolves.toBe(
      "calendar-token"
    );
  });

  it("does not expose the Vercel OIDC token in STS errors", async () => {
    setWifEnv();
    delete process.env.GOOGLE_PRIVATE_KEY;

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({ error: "bad token vercel-oidc-token" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      )
    );

    const { getGoogleCalendarAccessToken } = await import("@/lib/google/auth");

    let message = "";
    try {
      await getGoogleCalendarAccessToken();
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }

    expect(message).toContain("Google STS exchange failed (403)");
    expect(message).not.toContain("vercel-oidc-token");
  });
});
