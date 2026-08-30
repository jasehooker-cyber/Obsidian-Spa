# Keyless Google Calendar Authentication Design

**Date:** 2026-08-29

## Context

The CRM sync reads completed Obsidian appointments from Google Calendar. Production currently expects a Google service-account JSON private key. The Google Workspace organization enforces `iam.managed.disableServiceAccountKeyCreation`, so a JSON key cannot be created and should not be required.

The Vercel project already runs the CRM sync inside Vercel Functions. Vercel issues a short-lived OIDC token to deployments. Google Cloud Workload Identity Federation (WIF) can trust that token and allow the deployment to impersonate the existing keyless Google service account.

## Goals

- Keep Google service-account key creation disabled.
- Let the production Vercel deployment read the configured Google Calendar.
- Restrict Google trust to the Obsidian Vercel project in the production environment.
- Keep the current Google Calendar REST adapter and CRM behavior unchanged after authentication.
- Preserve the existing private-key flow as an optional local/legacy fallback, but always prefer WIF when WIF is configured.
- Never expose Vercel OIDC, Google STS, or Google access tokens to the browser.

## Non-goals

- No changes to Cal.com authentication or webhook verification.
- No Google OAuth consent flow for a human user.
- No Google service-account private key in Vercel.
- No change to which calendar is scanned; `GOOGLE_CALENDAR_ID` / `CRM_CALENDAR_IDS` remain the calendar source of truth.

## Recommended Architecture

Production authentication is:

1. A Vercel Function receives the automatically injected `VERCEL_OIDC_TOKEN`.
2. The server exchanges that JWT at Google Security Token Service (STS) for a short-lived federated token.
3. The server calls Google IAM Service Account Credentials `generateAccessToken` with the federated token to impersonate the Obsidian CRM service account.
4. Google returns a short-lived access token scoped to Google Calendar.
5. The existing Calendar REST calls use that access token.
6. The Calendar token is cached in-memory until shortly before expiry, matching the existing token-cache behavior.

No long-lived Google credential is stored in the application.

## Vercel Identity Restriction

The production Vercel OIDC identity is expected to use:

- Issuer: `https://oidc.vercel.com/jase2`
- Default audience: `https://vercel.com/jase2`
- Subject: `owner:jase2:project:obsidian-spa:environment:production`

Google WIF must map:

- `google.subject = assertion.sub`
- `attribute.owner = assertion.owner`
- `attribute.project = assertion.project`
- `attribute.environment = assertion.environment`

The provider must require an attribute condition equivalent to:

```text
assertion.owner == 'jase2' && assertion.project == 'obsidian-spa' && assertion.environment == 'production'
```

The service account receives `roles/iam.workloadIdentityUser` only for the exact federated production identity (or an equivalently restrictive principal set plus the provider condition).

## Google Cloud Resources

Use one workload identity pool and one OIDC provider dedicated to this deployment. Suggested IDs:

- Pool ID: `vercel-obsidian`
- Provider ID: `vercel-production`

The provider issuer is `https://oidc.vercel.com/jase2`.

Because the application uses Vercel's automatically supplied default OIDC token instead of minting a custom-audience token, the provider's allowed audience is:

```text
https://vercel.com/jase2
```

The Google STS exchange request itself uses the provider resource audience:

```text
//iam.googleapis.com/projects/<PROJECT_NUMBER>/locations/global/workloadIdentityPools/vercel-obsidian/providers/vercel-production
```

## Runtime Configuration

Existing values retained:

- `GOOGLE_CLIENT_EMAIL`: email of the keyless service account. This is still useful as the impersonation target.
- `GOOGLE_CALENDAR_ID`: calendar to access.
- `CRM_CALENDAR_IDS`: calendar(s) scanned by CRM.
- `GOOGLE_PRIVATE_KEY`: optional legacy/local fallback only; not required for production WIF.

New production values:

- `GCP_PROJECT_NUMBER`: numeric Google Cloud project number containing the pool.
- `GCP_WORKLOAD_IDENTITY_POOL_ID`: `vercel-obsidian` unless a different ID is chosen in Google Cloud.
- `GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID`: `vercel-production` unless a different ID is chosen.

`VERCEL_OIDC_TOKEN` is a Vercel system variable and must not be manually copied into project environment variables.

## Configuration Semantics

`getGoogleEnv()` exposes two independent auth capabilities:

- `wifConfigured`: service-account email + project number + pool ID + provider ID are present.
- `privateKeyConfigured`: service-account email + private key are present.

The Calendar integration is considered configured only when a calendar ID is present and at least one auth capability is available.

Authentication preference is:

1. WIF when `wifConfigured` is true.
2. Private-key JWT fallback when WIF is not configured and `privateKeyConfigured` is true.
3. A clear configuration error otherwise.

If WIF is configured but `VERCEL_OIDC_TOKEN` is absent at runtime, the request fails with an explicit OIDC-token error instead of silently falling back to a long-lived key. This prevents production misconfiguration from weakening the intended auth model.

## Google Token Exchange

The STS request is server-to-server:

```text
POST https://sts.googleapis.com/v1/token
```

with:

- `audience`: `//iam.googleapis.com/projects/<number>/locations/global/workloadIdentityPools/<pool>/providers/<provider>`
- `grantType`: `urn:ietf:params:oauth:grant-type:token-exchange`
- `requestedTokenType`: `urn:ietf:params:oauth:token-type:access_token`
- `scope`: `https://www.googleapis.com/auth/cloud-platform`
- `subjectTokenType`: `urn:ietf:params:oauth:token-type:jwt`
- `subjectToken`: the Vercel OIDC JWT

The returned federated token is then sent to:

```text
POST https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/<SERVICE_ACCOUNT_EMAIL>:generateAccessToken
```

requesting:

```text
https://www.googleapis.com/auth/calendar
```

The resulting access token is used for Calendar REST requests.

## Calendar Permission

The service-account email must be shared onto `jase@obsidianspas.com` with **See all event details**. It does not need permission to modify the calendar for CRM reads. Existing application functions that create or delete Calendar events may require a stronger Calendar share if those flows are still used; this design does not broaden permissions automatically.

## Code Structure

### `src/lib/google/auth.ts`

New focused authentication module.

Responsibilities:

- Build the WIF provider resource audience.
- Exchange Vercel OIDC token for a Google STS federated token.
- Impersonate the service account for a Calendar access token.
- Retain the current private-key JWT implementation as fallback.
- Cache the final Google Calendar access token until shortly before expiry.
- Return actionable errors without logging secret token bodies.

Public interface:

```ts
export async function getGoogleCalendarAccessToken(): Promise<string>
```

### `src/lib/google/server.ts`

Stops implementing credential signing itself. It calls `getGoogleCalendarAccessToken()` and remains responsible only for Google Calendar REST operations.

### `src/lib/config/env.ts`

Adds WIF fields and explicit auth-mode configuration while preserving lazy validation and CRM isolation.

### Tests

Add focused Vitest coverage for:

- WIF configuration is recognized without `GOOGLE_PRIVATE_KEY`.
- WIF is preferred over a private key when both exist.
- Missing `VERCEL_OIDC_TOKEN` produces a clear failure when WIF is configured.
- STS request contains the expected provider audience and Vercel subject token.
- Service-account impersonation requests Calendar scope.
- STS and impersonation errors are surfaced without exposing token contents.
- Private-key fallback remains available when WIF is absent.

Network calls are mocked; tests do not use real Vercel or Google credentials.

## Operational Setup

After the code deploys, Google Cloud configuration is completed manually because the connected tools in this chat do not manage Google Cloud IAM:

1. Enable **IAM Service Account Credentials API** if it is not already enabled.
2. Open **IAM & Admin → Workload Identity Federation**.
3. Create pool `vercel-obsidian`.
4. Add OIDC provider `vercel-production` with the issuer, allowed audience, mappings, and production-only condition above.
5. Grant the exact federated identity `Workload Identity User` on the existing Obsidian CRM service account.
6. Share `jase@obsidianspas.com` with the service-account email using **See all event details**.
7. Add `GCP_PROJECT_NUMBER`, `GCP_WORKLOAD_IDENTITY_POOL_ID`, `GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID`, and `GOOGLE_CLIENT_EMAIL` to Vercel Production.
8. Redeploy production.
9. Run **Sync calendar** and inspect the CRM result/runtime logs.

## Security Properties

- Google service-account key creation remains disabled.
- The Vercel OIDC JWT is short-lived and supplied only at runtime.
- Google federated and Calendar tokens are short-lived and server-side only.
- The Google provider rejects tokens outside `jase2 / obsidian-spa / production`.
- The service account is not granted to the entire Vercel issuer or entire WIF pool.
- Error messages never include Vercel OIDC JWTs, STS access tokens, or Google Calendar access tokens.

## Rollback

The code preserves private-key authentication as a fallback. If WIF must be rolled back, remove the WIF environment variables and supply the legacy service-account key variables. This is an emergency compatibility path, not the desired production configuration.