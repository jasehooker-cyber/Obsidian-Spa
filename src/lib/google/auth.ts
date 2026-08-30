import { createPrivateKey, createSign } from "crypto";
import { getGoogleEnv } from "@/lib/config/env";

const GOOGLE_STS_URL = "https://sts.googleapis.com/v1/token";
const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const CLOUD_PLATFORM_SCOPE = "https://www.googleapis.com/auth/cloud-platform";
const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar";
const TOKEN_REFRESH_SKEW_MS = 60_000;

interface CachedToken {
  token: string;
  expiresAt: number;
}

let tokenCache: CachedToken | null = null;

function providerAudience(): string {
  const google = getGoogleEnv();
  return `//iam.googleapis.com/projects/${google.projectNumber}/locations/global/workloadIdentityPools/${google.workloadIdentityPoolId}/providers/${google.workloadIdentityPoolProviderId}`;
}

function upstreamError(label: string, status: number): Error {
  // Do not include upstream response bodies: identity-provider errors can echo
  // submitted credentials, and no token belongs in an admin-visible message.
  return new Error(`${label} failed (${status})`);
}

async function getWorkloadIdentityToken(): Promise<CachedToken> {
  const google = getGoogleEnv();
  const subjectToken = process.env.VERCEL_OIDC_TOKEN;

  if (!subjectToken) {
    throw new Error(
      "Vercel OIDC token is unavailable for Google authentication"
    );
  }

  const stsResponse = await fetch(GOOGLE_STS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      audience: providerAudience(),
      grantType: "urn:ietf:params:oauth:grant-type:token-exchange",
      requestedTokenType: "urn:ietf:params:oauth:token-type:access_token",
      scope: CLOUD_PLATFORM_SCOPE,
      subjectTokenType: "urn:ietf:params:oauth:token-type:jwt",
      subjectToken,
    }),
  });

  if (!stsResponse.ok) {
    throw upstreamError("Google STS exchange", stsResponse.status);
  }

  const stsData = (await stsResponse.json()) as {
    access_token?: string;
    expires_in?: number;
  };

  if (!stsData.access_token) {
    throw new Error("Google STS exchange returned no access token");
  }

  const serviceAccount = encodeURIComponent(google.clientEmail);
  const impersonationResponse = await fetch(
    `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${serviceAccount}:generateAccessToken`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stsData.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        scope: [CALENDAR_SCOPE],
        lifetime: "3600s",
      }),
    }
  );

  if (!impersonationResponse.ok) {
    throw upstreamError(
      "Google service-account impersonation",
      impersonationResponse.status
    );
  }

  const impersonationData = (await impersonationResponse.json()) as {
    accessToken?: string;
    expireTime?: string;
  };

  if (!impersonationData.accessToken) {
    throw new Error("Google service-account impersonation returned no token");
  }

  const parsedExpiry = impersonationData.expireTime
    ? Date.parse(impersonationData.expireTime)
    : Number.NaN;

  return {
    token: impersonationData.accessToken,
    expiresAt: Number.isFinite(parsedExpiry)
      ? parsedExpiry
      : Date.now() + 3_600_000,
  };
}

async function getPrivateKeyToken(): Promise<CachedToken> {
  const google = getGoogleEnv();
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(
    JSON.stringify({ alg: "RS256", typ: "JWT" })
  ).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      iss: google.clientEmail,
      scope: CALENDAR_SCOPE,
      aud: GOOGLE_OAUTH_TOKEN_URL,
      iat: now,
      exp: now + 3600,
    })
  ).toString("base64url");

  const key = createPrivateKey(google.privateKey.replace(/\\n/g, "\n"));
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${payload}`);
  const signature = signer.sign(key, "base64url");

  const jwt = `${header}.${payload}.${signature}`;
  const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    throw upstreamError("Google service-account JWT auth", response.status);
  }

  const data = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
  };

  if (!data.access_token) {
    throw new Error("Google service-account JWT auth returned no access token");
  }

  return {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
}

export async function getGoogleCalendarAccessToken(): Promise<string> {
  if (
    tokenCache &&
    Date.now() < tokenCache.expiresAt - TOKEN_REFRESH_SKEW_MS
  ) {
    return tokenCache.token;
  }

  const google = getGoogleEnv();

  // WIF is deliberately first. If production declares WIF but Google rejects
  // it, fail visibly instead of silently downgrading to a long-lived key.
  if (google.wifConfigured) {
    tokenCache = await getWorkloadIdentityToken();
    return tokenCache.token;
  }

  if (google.privateKeyConfigured) {
    tokenCache = await getPrivateKeyToken();
    return tokenCache.token;
  }

  throw new Error(
    "Google authentication is not configured. Configure Workload Identity Federation or a legacy private key."
  );
}
