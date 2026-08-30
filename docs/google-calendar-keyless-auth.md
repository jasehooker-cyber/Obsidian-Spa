# Keyless Google Calendar Auth on Vercel

This production setup uses Vercel OIDC + Google Cloud Workload Identity Federation. It does **not** use a service-account JSON key, so `iam.managed.disableServiceAccountKeyCreation` can remain enforced.

## Obsidian Vercel identity

Use these exact Vercel identity values in Google Cloud:

```text
Issuer URL: https://oidc.vercel.com/jase2
Allowed audience: https://vercel.com/jase2
Expected subject: owner:jase2:project:obsidian-spa:environment:production
```

Suggested Google Cloud IDs:

```text
Workload Identity Pool ID: vercel-obsidian
Provider ID: vercel-production
```

## Provider attributes

Choose **OpenID Connect (OIDC)** as the provider type.

Attribute mappings:

```text
google.subject = assertion.sub
attribute.owner = assertion.owner
attribute.project = assertion.project
attribute.environment = assertion.environment
```

Attribute condition:

```text
assertion.owner == 'jase2' && assertion.project == 'obsidian-spa' && assertion.environment == 'production'
```

The condition is important because Vercel's issuer is multi-tenant. It prevents tokens for other teams, projects, or environments from being accepted.

## Service-account access

Use the existing Obsidian CRM service account. Grant **Workload Identity User** (`roles/iam.workloadIdentityUser`) only to the federated production identity from the `vercel-obsidian` pool.

The subject that must be authorized is:

```text
owner:jase2:project:obsidian-spa:environment:production
```

Use the Google Cloud **project number**, not project ID, when Google asks for a workload-identity principal identifier.

## Calendar access

Share this calendar with the CRM service-account email:

```text
jase@obsidianspas.com
```

For CRM reads, grant:

```text
See all event details
```

If the website still uses Google Calendar write/delete helpers elsewhere, those particular flows require the service account to have enough Calendar sharing permission for those actions. The CRM itself only needs event-detail read access.

## Required Google APIs

Enable these APIs in the Google Cloud project:

```text
Google Calendar API
Security Token Service API
IAM Service Account Credentials API
```

## Vercel Production environment variables

Keep the existing calendar values:

```text
GOOGLE_CALENDAR_ID=jase@obsidianspas.com
CRM_CALENDAR_IDS=jase@obsidianspas.com
```

Add:

```text
GOOGLE_CLIENT_EMAIL=<the existing CRM service-account email>
GCP_PROJECT_NUMBER=<numeric Google Cloud project number>
GCP_WORKLOAD_IDENTITY_POOL_ID=vercel-obsidian
GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID=vercel-production
```

Do **not** manually create:

```text
VERCEL_OIDC_TOKEN
```

Vercel supplies that system token automatically at runtime.

For this keyless production setup, do **not** add:

```text
GOOGLE_PRIVATE_KEY
```

The application retains private-key authentication only as a legacy/local fallback when WIF variables are absent.

## Runtime flow

1. Vercel supplies its short-lived OIDC JWT to the server function.
2. The server exchanges it at Google STS for a federated Google token.
3. The federated token impersonates the CRM service account through IAM Service Account Credentials.
4. Google issues a short-lived token scoped to Calendar.
5. The CRM reads completed events from `jase@obsidianspas.com`.

No long-lived Google credential is stored in the application.
