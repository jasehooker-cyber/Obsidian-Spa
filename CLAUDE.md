# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Obsidian Men's Spa — a high-end, discreet, masculine luxury spa website with therapist-specific booking, secure card-on-file, real availability, and minimal operational complexity.

## Tech Stack

- **Framework:** Next.js 16 (App Router) + TypeScript (strict) + Tailwind CSS v4
- **Database:** Supabase Postgres (schema in `supabase/migrations/001_initial.sql`)
- **Booking engine:** Cal.com (v2 API)
- **Payments:** Stripe (SetupIntents for card-on-file, off-session charges for fees)
- **Calendar:** Google Calendar via service account
- **Validation:** Zod v4
- **Testing:** Vitest
- **Hosting:** Vercel
- **Package manager:** npm

## Commands

- `npm run dev` — start dev server with Turbopack (http://localhost:3000)
- `npm run build` — production build
- `npm run start` — serve production build
- `npm run lint` — run ESLint
- `npm run typecheck` — TypeScript type checking
- `npm run test` — run Vitest (36 tests)

After any major change, run: `npm run lint && npm run typecheck && npm run test && npm run build`

## Architecture

- Next.js App Router (`src/app/`), not Pages Router
- Path alias `@/*` maps to `./src/*`
- Next.js 16 breaking changes: `params` is a Promise (must `await`), `cookies()`/`headers()` are async. Consult `node_modules/next/dist/docs/` before using unfamiliar APIs
- React 19 lint rules: no `setState` calls directly inside `useEffect` body — use async callbacks or derive initial state outside effects

### Key patterns

- **Server Component → Client Component prop passing:** Booking page fetches data server-side and passes to `BookingFlow` client component. Avoids client-side data fetching for initial load.
- **Lazy env validation:** `getEnv()` in `src/lib/config/env.ts` validates at first call, not at import time, so builds don't fail without env vars.
- **Lazy Stripe instance:** `stripe()` function in `src/lib/stripe/server.ts` returns a cached instance.
- **Draft-then-confirm booking pattern:** Draft created in Supabase → Stripe SetupIntent → card saved → booking confirmed in Cal.com + Google Calendar.
- **Webhook idempotency:** Events logged to `webhook_events` table; duplicate event IDs are skipped.

## Code Organization

- `src/lib/config/business-rules.ts` — central source of truth for hours, services, add-ons, fees, booking rules, timezone
- `src/lib/config/env.ts` — server env validation (`getEnv()`)
- `src/lib/config/env-public.ts` — client-safe env (`NEXT_PUBLIC_` vars only)
- `src/lib/config/format.ts` — shared `formatTime()` helper
- `src/lib/schemas/booking.ts` — Zod schemas for booking drafts, setup sessions, intake submissions
- `src/lib/booking/actions.ts` — booking orchestration (createDraft, createSetupSession, confirmBooking)
- `src/lib/booking/intake.ts` — intake token generation, validation, submission
- `src/lib/payments/charge.ts` — centralized `chargeOffSession()` for all off-session Stripe charges
- `src/lib/payments/setup.ts` — SetupIntent helpers
- `src/lib/auth/staff.ts` — staff auth via Supabase Auth + email allowlist
- `src/lib/stripe/` — server (`stripe()`) and client (`getStripe()`) adapters
- `src/lib/supabase/` — server (`supabaseServer()`) and client (`supabaseBrowser()`) adapters
- `src/lib/cal/server.ts` — Cal.com v2 API adapter (slots, create booking, cancel)
- `src/lib/google/server.ts` — Google Calendar adapter via service account JWT

## API Routes

### Public
- `GET /api/public/site-config` — services, add-ons, hours, fees
- `GET /api/booking/availability?serviceId=&therapistId=&date=` — available slots from Cal.com

### Booking flow
- `POST /api/booking/draft` — create draft booking in Supabase
- `POST /api/booking/create-setup-session` — create Stripe SetupIntent, return clientSecret
- `POST /api/booking/confirm` — finalize booking (Cal.com + Google Calendar + status update)

### Intake
- `POST /api/intake/send` — generate intake token, return URL
- `POST /api/intake/[token]` — submit intake form

### Webhooks
- `POST /api/webhooks/stripe` — signature-verified Stripe events
- `POST /api/webhooks/cal` — HMAC-verified Cal.com events

### Admin (requires Supabase Auth + email allowlist)
- `POST /api/admin/bookings/[id]/complete-payment` — charge service total
- `POST /api/admin/bookings/[id]/late-cancel` — charge $40, cancel booking
- `POST /api/admin/bookings/[id]/no-show` — charge 50% of service price
- `POST /api/admin/bookings/[id]/resend-intake` — new token, return URL

## Security Rules

- All secrets in `.env.local`, never in client bundle
- Supabase service role key used server-side only
- Stripe SetupIntents (no raw card data touches our server)
- Stripe webhook signatures verified before processing
- Cal.com webhook HMAC verified before processing
- RLS enabled on all Supabase tables; anon can only read active therapists/services/add-ons
- Admin routes protected by Supabase Auth + `STAFF_ALLOWED_EMAILS` allowlist
- Intake tokens are random UUIDs that expire after 72 hours
- All mutations validated server-side with Zod schemas

## Business Rules

- Timezone: America/New_York
- Operating hours: 8:00 AM – 10:00 PM daily
- Buffer time: 20 minutes between appointments
- Booking minimum notice: 30 minutes
- Booking max window: 1 week ahead
- No self-cancellation online
- Late cancellation (within 2 hours): $40 fee
- No-call/no-show: 50% of booked service price
- Payment collected after service; card saved on file for policy fees only
- v1 service policy: single-therapist services (Signature 60/90) are instant-book; multi-therapist services (Couples, Four-Handed) are request-based

## Workflow

- Always inspect file tree before coding
- Always read relevant files before editing
- Search for existing code before creating new code
- Present a plan before major changes — no major structural changes without approval
- Reuse existing components, utilities, and patterns — no duplicates
- When explaining changes: what file changed, why, what problem it solves, how to test it, and any risks

## Design

- Dark & luxurious: `#0a0a0a` background, `#c9a84c` gold accents, `#1a1a1a`/`#2a2a2a` charcoal cards/borders
- Fonts: Geist Sans / Geist Mono via next/font
- Pages: Home, Services, About, Booking, Booking Success, Intake Form
- Error boundaries and loading skeletons for booking and intake flows
