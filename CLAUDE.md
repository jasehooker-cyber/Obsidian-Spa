# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Obsidian Men's Spa — a high-end, discreet, masculine luxury spa website with therapist-specific booking, secure card-on-file, real availability, and minimal operational complexity.

## Tech Stack

- **Framework:** Next.js 16 (App Router) + TypeScript (strict) + Tailwind CSS v4
- **Database:** Supabase Postgres (schema in `supabase/migrations/001_initial.sql`)
- **Booking engine:** Cal.com — scheduling happens in the embedded booker (`@calcom/embed-react`); the v2 API is used server-side to read bookings back
- **Payments:** Stripe (SetupIntents for card-on-file, off-session charges for fees)
- **Calendar:** Cal.com owns calendar sync (connect Google Calendar inside Cal.com). `src/lib/google/server.ts` remains only to clean up events on bookings made before this move
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
- `npm run test` — run Vitest (32 tests)

After any major change, run: `npm run lint && npm run typecheck && npm run test && npm run build`

## Architecture

- Next.js App Router (`src/app/`), not Pages Router
- Path alias `@/*` maps to `./src/*`
- Next.js 16 breaking changes: `params` is a Promise (must `await`), `cookies()`/`headers()` are async. Consult `node_modules/next/dist/docs/` before using unfamiliar APIs
- React 19 lint rules: no `setState` calls directly inside `useEffect` body — use async callbacks or derive initial state outside effects

### Key patterns

- **Server Component → Client Component prop passing:** Booking page passes static config to the `BookingFlow` client component. Avoids client-side data fetching for initial load.
- **Lazy env validation:** `getEnv()` in `src/lib/config/env.ts` validates at first call, not at import time, so builds don't fail without env vars.
- **Lazy Stripe instance:** `stripe()` function in `src/lib/stripe/server.ts` returns a cached instance.
- **Schedule-then-secure booking pattern:** Client picks service + add-ons on our site → schedules inside the Cal.com embed → booking mirrored into Supabase as `draft` → client saves a card at `/pay/<token>` → booking promoted to `confirmed`. Cal.com is the scheduling system of record and owns the calendar sync; we never create Cal.com bookings ourselves.
- **Two triggers, one idempotent sync:** `syncCalBooking()` in `src/lib/booking/cal-sync.ts` is called both by the `BOOKING_CREATED` webhook and by the client's redirect to `/pay/resolve`. Whichever arrives first wins; `bookings.cal_booking_uid` is unique, so the loser re-reads the winner's row.
- **Cal.com is re-read, never trusted:** Webhooks and redirects only supply a booking uid. Booking details are always fetched from the Cal.com API via `getBooking()`, so payload shape changes can't corrupt our records.
- **Add-ons travel as Cal.com metadata:** Selected add-on ids are passed into the embed as `metadata[addOns]` and validated against `ADD_ONS` on the way back in.
- **Webhook idempotency:** Events logged to `webhook_events` table; duplicate event IDs are skipped.

## Code Organization

- `src/lib/config/business-rules.ts` — central source of truth for hours, services, add-ons, fees, booking rules, timezone, and the Cal.com account/event-type mapping (`CAL_USERNAME`, `calEventTypeId`, `calEventSlug`)
- `src/lib/config/env.ts` — server env validation (`getEnv()`)
- `src/lib/config/env-public.ts` — client-safe env (`NEXT_PUBLIC_` vars only)
- `src/lib/config/format.ts` — shared `formatTime()` helper
- `src/lib/schemas/booking.ts` — Zod schema for intake submissions
- `src/lib/booking/cal-sync.ts` — idempotent mirror of a Cal.com booking into Supabase (`syncCalBooking`)
- `src/lib/booking/paylink.ts` — pay-token validation and the data the `/pay` page renders
- `src/lib/booking/actions.ts` — card-on-file orchestration (createSetupSession, confirmBooking)
- `src/lib/booking/intake.ts` — intake token generation, validation, submission
- `src/lib/payments/charge.ts` — centralized `chargeOffSession()` for all off-session Stripe charges
- `src/lib/payments/setup.ts` — SetupIntent helpers
- `src/lib/auth/staff.ts` — staff auth via Supabase Auth + email allowlist
- `src/lib/stripe/` — server (`stripe()`) and client (`getStripe()`) adapters
- `src/lib/supabase/` — server (`supabaseServer()`) and client (`supabaseBrowser()`) adapters
- `src/lib/cal/server.ts` — Cal.com v2 API adapter (read booking, cancel)
- `src/components/booking/CalScheduler.tsx` — Cal.com embed, themed and wired to `/pay/resolve` on success
- `src/lib/google/server.ts` — Google Calendar adapter via service account JWT

## API Routes

### Public
- `GET /api/public/site-config` — services, add-ons, hours, fees

### Booking flow
Scheduling is handled entirely by the Cal.com embed — there is no availability or
draft endpoint. Availability comes from Cal.com; the client never hits our API to book.

- `/pay/resolve?uid=` — page; mirrors a just-made Cal.com booking, redirects to its pay link
- `/pay/[token]` — page; booking summary + Stripe card form (creates/reuses the SetupIntent server-side)
- `POST /api/pay/confirm` — verifies the SetupIntent with Stripe, promotes booking to `confirmed`, sends confirmation + intake emails

### Intake
- `POST /api/intake/send` — generate intake token, return URL
- `POST /api/intake/[token]` — submit intake form

### Webhooks
- `POST /api/webhooks/stripe` — signature-verified Stripe events
- `POST /api/webhooks/cal` — HMAC-verified Cal.com events (`BOOKING_CREATED` mirrors the booking and emails the pay link; `BOOKING_CANCELLED` / `BOOKING_RESCHEDULED` keep Supabase in sync)

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
- Cal.com webhook HMAC verified before processing (`CALCOM_WEBHOOK_SECRET`, constant-time compare)
- RLS enabled on all Supabase tables; anon can only read active therapists/services/add-ons
- Admin routes protected by Supabase Auth + `STAFF_ALLOWED_EMAILS` allowlist
- Intake and pay tokens are random UUIDs that expire after 72 hours
- All mutations validated server-side with Zod schemas

## Business Rules

- Timezone: America/New_York
- Operating hours: 8:00 AM – 10:00 PM daily
- Buffer time, minimum notice, and how far ahead clients can book are configured per event type in Cal.com. The values in `BUSINESS.booking` are the intended policy and are no longer enforced by this codebase — change them in Cal.com
- No self-cancellation online
- Late cancellation (within 2 hours): $40 fee
- No-call/no-show: 50% of booked service price
- Payment collected after service; card saved on file for policy fees only
- Every service has its own Cal.com event type; availability and host assignment are managed in Cal.com, not in this codebase
- A booking is only `confirmed` once a card is on file — until then it stays `draft` with a live pay link

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
- Pages: Home, Services, About, Booking, Pay (card on file), Booking Success, Intake Form
- The Cal.com embed is themed to match via `cal-brand: #c9a84c` and `theme: "dark"`
- Error boundaries and loading skeletons for booking and intake flows
