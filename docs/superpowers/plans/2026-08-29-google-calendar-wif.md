# Keyless Google Calendar Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the production requirement for a Google service-account private key with Vercel OIDC + Google Workload Identity Federation while preserving Google Calendar behavior and an optional local private-key fallback.

**Architecture:** A focused Google auth module exchanges Vercel's runtime OIDC token with Google STS, impersonates the existing keyless service account through IAM Credentials, and returns a short-lived Calendar token. The existing Calendar adapter consumes that token and remains responsible only for Calendar REST calls. WIF is preferred whenever configured; the legacy signed-JWT path remains fallback-only.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, native `fetch`, Node `crypto`, Vitest, Vercel OIDC system token, Google STS, Google IAM Service Account Credentials, Google Calendar REST API.

**Spec:** `docs/superpowers/specs/2026-08-29-google-calendar-wif-design.md`

## Global Constraints

- Keep `iam.managed.disableServiceAccountKeyCreation` enabled; production must not require a JSON key.
- Do not add npm dependencies; use native `fetch` and the existing Node runtime.
- Never log or return the Vercel OIDC token, STS token, service-account access token, or private key.
- Restrict Google federation to `owner:jase2:project:obsidian-spa:environment:production` in Google Cloud configuration.
- Preserve `GOOGLE_PRIVATE_KEY` only as a local/legacy fallback.
- WIF must win when both WIF and a private key are configured.
- If WIF is configured but `VERCEL_OIDC_TOKEN` is missing, fail explicitly; do not silently downgrade to private-key auth.
- Preserve the existing `listCalendarEvents`, `createCalendarEvent`, and `deleteCalendarEvent` public interfaces.
- After the change run `npm run lint && npm run typecheck && npm run test && npm run build` or use the Vercel production-style build plus available CI verification when a local checkout is unavailable.

---

### Task 1: Add WIF configuration semantics

**Files:**
- Modify: `src/lib/config/env.ts`
- Test: `src/lib/config/__tests__/google-env.test.ts`

**Interfaces:**
- Produces: `getGoogleEnv()` with `wifConfigured`, `privateKeyConfigured`, and `configured` booleans plus WIF identifiers.
- Consumes: existing `process.env` lazy-runtime pattern.

- [ ] **Step 1: Write the failing configuration tests**

Create `src/lib/config/__tests__/google-env.test.ts` with isolated environment setup that verifies:

```ts
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
    process.env.GOOGLE_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\\nkey\\n-----END PRIVATE KEY-----\\n";
    delete process.env.GCP_PROJECT_NUMBER;
    delete process.env.GCP_WORKLOAD_IDENTITY_POOL_ID;
    delete process.env.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID;

    const google = getGoogleEnv();

    expect(google.wifConfigured).toBe(false);
    expect(google.privateKeyConfigured).toBe(true);
    expect(google.configured).toBe(true);
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
npm run test -- src/lib/config/__tests__/google-env.test.ts
```

Expected: FAIL because the WIF fields/flags are not yet returned by `getGoogleEnv()`.

- [ ] **Step 3: Implement the minimal env shape**

Change `getGoogleEnv()` to read:

```ts
const clientEmail = process.env.GOOGLE_CLIENT_EMAIL ?? "";
const privateKey = process.env.GOOGLE_PRIVATE_KEY ?? "";
const calendarId = process.env.GOOGLE_CALENDAR_ID ?? "";
const projectNumber = process.env.GCP_PROJECT_NUMBER ?? "";
const workloadIdentityPoolId =
  process.env.GCP_WORKLOAD_IDENTITY_POOL_ID ?? "";
const workloadIdentityPoolProviderId =
  process.env.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID ?? "";

const wifConfigured = !!(
  clientEmail &&
  projectNumber &&
  workloadIdentityPoolId &&
  workloadIdentityPoolProviderId
);
const privateKeyConfigured = !!(clientEmail && privateKey);

return {
  clientEmail,
  privateKey,
  calendarId,
  projectNumber,
  workloadIdentityPoolId,
  workloadIdentityPoolProviderId,
  wifConfigured,
  privateKeyConfigured,
  configured: !!(calendarId && (wifConfigured || privateKeyConfigured)),
};
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run the same command and expect PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/config/env.ts src/lib/config/__tests__/google-env.test.ts
git commit -m "test: define Google WIF configuration"
```

---

### Task 2: Implement keyless Google token exchange

**Files:**
- Create: `src/lib/google/auth.ts`
- Test: `src/lib/google/__tests__/auth.test.ts`

**Interfaces:**
- Consumes: `getGoogleEnv()` from Task 1 and `process.env.VERCEL_OIDC_TOKEN`.
- Produces: `getGoogleCalendarAccessToken(): Promise<string>`.

- [ ] **Step 1: Write failing WIF authentication tests**

Create tests that mock `global.fetch` and set WIF env values. Cover:

```ts
it("exchanges Vercel OIDC for a Calendar-scoped service-account token", async () => {
  process.env.GOOGLE_CLIENT_EMAIL = "crm@example.iam.gserviceaccount.com";
  process.env.GOOGLE_CALENDAR_ID = "jase@obsidianspas.com";
  process.env.GCP_PROJECT_NUMBER = "123456789";
  process.env.GCP_WORKLOAD_IDENTITY_POOL_ID = "vercel-obsidian";
  process.env.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID = "vercel-production";
  process.env.VERCEL_OIDC_TOKEN = "vercel-oidc-token";
  delete process.env.GOOGLE_PRIVATE_KEY;

  const fetchMock = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ access_token: "federated-token", expires_in: 3600 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          accessToken: "calendar-token",
          expireTime: new Date(Date.now() + 3_600_000).toISOString(),
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

  const token = await getGoogleCalendarAccessToken();

  expect(token).toBe("calendar-token");

  const stsBody = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
  expect(stsBody.audience).toBe(
    "//iam.googleapis.com/projects/123456789/locations/global/workloadIdentityPools/vercel-obsidian/providers/vercel-production"
  );
  expect(stsBody.subjectToken).toBe("vercel-oidc-token");

  const impersonationBody = JSON.parse(
    String(fetchMock.mock.calls[1][1]?.body)
  );
  expect(impersonationBody.scope).toEqual([
    "https://www.googleapis.com/auth/calendar",
  ]);
});
```

Also test:

```ts
it("fails clearly when WIF is configured but VERCEL_OIDC_TOKEN is missing", async () => {
  // WIF env present, no private key, no VERCEL_OIDC_TOKEN
  await expect(getGoogleCalendarAccessToken()).rejects.toThrow(
    "Vercel OIDC token is unavailable"
  );
});
```

and one error-redaction case where the upstream body contains `vercel-oidc-token`; assert the thrown error does not contain that token.

- [ ] **Step 2: Run tests and verify RED**

```bash
npm run test -- src/lib/google/__tests__/auth.test.ts
```

Expected: FAIL because `src/lib/google/auth.ts` does not exist.

- [ ] **Step 3: Implement WIF STS + service-account impersonation**

Create `src/lib/google/auth.ts` with:

```ts
import { createPrivateKey, createSign } from "crypto";
import { getGoogleEnv } from "@/lib/config/env";

const STS_URL = "https://sts.googleapis.com/v1/token";
const IAM_SCOPE = "https://www.googleapis.com/auth/cloud-platform";
const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar";

let tokenCache: { token: string; expiresAt: number } | null = null;

function providerAudience() {
  const google = getGoogleEnv();
  return `//iam.googleapis.com/projects/${google.projectNumber}/locations/global/workloadIdentityPools/${google.workloadIdentityPoolId}/providers/${google.workloadIdentityPoolProviderId}`;
}

function safeUpstreamError(label: string, status: number): Error {
  return new Error(`${label} failed (${status})`);
}

async function getWifToken(): Promise<{ token: string; expiresAt: number }> {
  const google = getGoogleEnv();
  const subjectToken = process.env.VERCEL_OIDC_TOKEN;
  if (!subjectToken) {
    throw new Error("Vercel OIDC token is unavailable for Google authentication");
  }

  const sts = await fetch(STS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      audience: providerAudience(),
      grantType: "urn:ietf:params:oauth:grant-type:token-exchange",
      requestedTokenType: "urn:ietf:params:oauth:token-type:access_token",
      scope: IAM_SCOPE,
      subjectTokenType: "urn:ietf:params:oauth:token-type:jwt",
      subjectToken,
    }),
  });

  if (!sts.ok) throw safeUpstreamError("Google STS exchange", sts.status);
  const stsData = (await sts.json()) as {
    access_token: string;
    expires_in?: number;
  };

  const impersonation = await fetch(
    `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${encodeURIComponent(google.clientEmail)}:generateAccessToken`,
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

  if (!impersonation.ok) {
    throw safeUpstreamError(
      "Google service-account impersonation",
      impersonation.status
    );
  }

  const data = (await impersonation.json()) as {
    accessToken: string;
    expireTime?: string;
  };
  const expiresAt = data.expireTime
    ? new Date(data.expireTime).getTime()
    : Date.now() + 3_600_000;

  return { token: data.accessToken, expiresAt };
}
```

Move the existing private-key JWT logic from `server.ts` into a private `getPrivateKeyToken()` in this file. Do not change its protocol behavior.

Export:

```ts
export async function getGoogleCalendarAccessToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt - 60_000) {
    return tokenCache.token;
  }

  const google = getGoogleEnv();
  const fresh = google.wifConfigured
    ? await getWifToken()
    : google.privateKeyConfigured
      ? await getPrivateKeyToken()
      : null;

  if (!fresh) {
    throw new Error(
      "Google authentication is not configured. Configure Workload Identity Federation or a legacy private key."
    );
  }

  tokenCache = fresh;
  return fresh.token;
}
```

- [ ] **Step 4: Run focused tests and verify GREEN**

Run the auth tests. Fix only implementation defects surfaced by those tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/google/auth.ts src/lib/google/__tests__/auth.test.ts
git commit -m "feat: add keyless Google WIF auth"
```

---

### Task 3: Route Calendar operations through the new auth module

**Files:**
- Modify: `src/lib/google/server.ts`
- Test: existing CRM/Google tests plus `src/lib/google/__tests__/auth.test.ts`

**Interfaces:**
- Consumes: `getGoogleCalendarAccessToken()`.
- Preserves: `createCalendarEvent`, `listCalendarEvents`, `deleteCalendarEvent` signatures.

- [ ] **Step 1: Add a regression assertion**

In the auth test suite, ensure `server.ts` no longer owns private-key signing by testing the exported auth function independently and relying on existing Calendar adapter tests for HTTP behavior.

- [ ] **Step 2: Modify `server.ts`**

Replace:

```ts
import { createPrivateKey, createSign } from "crypto";
```

and the local token cache / `getAccessToken()` implementation with:

```ts
import { getGoogleCalendarAccessToken } from "@/lib/google/auth";
```

Then replace each call to:

```ts
const token = await getAccessToken();
```

with:

```ts
const token = await getGoogleCalendarAccessToken();
```

Leave Calendar URLs, pagination, request bodies, and error handling unchanged.

- [ ] **Step 3: Run Google/CRM tests**

```bash
npm run test -- src/lib/google src/lib/crm
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/google/server.ts
git commit -m "refactor: use shared Google auth adapter"
```

---

### Task 4: Update runtime guidance and CRM configuration error text

**Files:**
- Modify: `src/lib/crm/sync.ts`
- Create: `docs/google-calendar-keyless-auth.md`

**Interfaces:**
- Produces: actionable production setup instructions matching the exact Vercel project identity.

- [ ] **Step 1: Update the CRM configuration error**

Change the current Google configuration error to:

```ts
throw new Error(
  "Google Calendar auth is not configured. Set GOOGLE_CLIENT_EMAIL, GOOGLE_CALENDAR_ID and the GCP Workload Identity variables (or a legacy GOOGLE_PRIVATE_KEY)."
);
```

- [ ] **Step 2: Write operator documentation**

Create `docs/google-calendar-keyless-auth.md` documenting these exact Google Cloud values:

```text
Vercel issuer: https://oidc.vercel.com/jase2
Vercel allowed audience: https://vercel.com/jase2
Expected subject: owner:jase2:project:obsidian-spa:environment:production
Suggested pool ID: vercel-obsidian
Suggested provider ID: vercel-production
```

Include exact mappings:

```text
google.subject = assertion.sub
attribute.owner = assertion.owner
attribute.project = assertion.project
attribute.environment = assertion.environment
```

Include exact condition:

```text
assertion.owner == 'jase2' && assertion.project == 'obsidian-spa' && assertion.environment == 'production'
```

List Vercel Production variables:

```text
GOOGLE_CLIENT_EMAIL
GOOGLE_CALENDAR_ID=jase@obsidianspas.com
CRM_CALENDAR_IDS=jase@obsidianspas.com
GCP_PROJECT_NUMBER
GCP_WORKLOAD_IDENTITY_POOL_ID=vercel-obsidian
GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID=vercel-production
```

Explicitly say not to create `VERCEL_OIDC_TOKEN` manually and not to add `GOOGLE_PRIVATE_KEY` for the WIF setup.

- [ ] **Step 3: Commit**

```bash
git add src/lib/crm/sync.ts docs/google-calendar-keyless-auth.md
git commit -m "docs: add keyless Google Calendar setup"
```

---

### Task 5: Verify and release the code path

**Files:**
- No new files expected.

**Interfaces:**
- Produces: a production-ready branch whose code can be merged before the Google Cloud IAM resources are configured.

- [ ] **Step 1: Run full verification**

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Expected: all pass. If local execution is unavailable, require a Vercel branch build to compile and typecheck and inspect GitHub CI/test status separately; do not claim the full Vitest suite passed unless it actually ran.

- [ ] **Step 2: Open a PR**

Title:

```text
Use keyless Google auth for CRM calendar sync
```

Body must state that Google Cloud WIF still needs operator configuration before production sync can succeed.

- [ ] **Step 3: Merge only after branch build is READY**

Merge to `main` after the production-style branch build succeeds.

- [ ] **Step 4: Confirm production deployment is READY**

Verify `obsidianspas.com` points to the new deployment.

---

### Task 6: Configure Google Cloud and validate end-to-end

**Files:**
- No code changes unless runtime testing reveals a code defect.

**Interfaces:**
- Consumes: production code from Tasks 1-5.
- Produces: working `Sync calendar` against `jase@obsidianspas.com` with no service-account private key.

- [ ] **Step 1: Enable required APIs**

In the Obsidian Google Cloud project ensure these APIs are enabled:

```text
Google Calendar API
Security Token Service API
IAM Service Account Credentials API
```

- [ ] **Step 2: Create the WIF pool/provider**

Use the exact issuer, audience, mappings, and condition documented in `docs/google-calendar-keyless-auth.md`.

- [ ] **Step 3: Grant service-account impersonation**

Grant `roles/iam.workloadIdentityUser` on the existing CRM service account to the exact production subject:

```text
owner:jase2:project:obsidian-spa:environment:production
```

using the WIF pool's project number and pool ID in the Google principal identifier.

- [ ] **Step 4: Share Calendar**

Share `jase@obsidianspas.com` with the CRM service-account email using **See all event details**.

- [ ] **Step 5: Add Vercel production variables and redeploy**

Add the variables listed in Task 4, redeploy `main`, and do not add a private key.

- [ ] **Step 6: Run the CRM sync**

From `/admin/clients`, click **Sync calendar**.

Expected successful output includes a nonzero `eventsScanned` when completed appointments exist in the lookback window. If it fails, inspect the exact runtime error and fix the specific IAM/config boundary rather than changing unrelated integrations.