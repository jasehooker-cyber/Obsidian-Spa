# Client tracker

Turns the Google Calendar into a client list you can actually reach out to.

Once a day it reads the watched calendars, finds every massage that has already
happened, and records who it was for — name, email, phone — along with the
service, the length, and what it was worth. Repeat visits roll up into a visit
count, a last-visit date, and a lifetime value, so the question "who hasn't been
in for two months?" has an answer.

Screen: **`/admin/clients`**.

---

## Turning it on

### 1. Run the migration

Apply `supabase/migrations/002_client_crm.sql` to your Supabase project. It adds
`client_visits` and `crm_sync_runs`, and extends `clients` with the rollup
columns.

It also **makes `clients.email` nullable**. Plenty of real sessions are a
hand-typed calendar event with a first name and nothing else, and those people
are still worth having on the list. A client now needs at least one of email,
phone, or name.

### 2. Give the service account access to the calendars

The sync reuses the existing Google service account (`GOOGLE_CLIENT_EMAIL` /
`GOOGLE_PRIVATE_KEY`). It can only read calendars that have been shared with it.

For **each** calendar you want scanned, in Google Calendar → Settings → *Share
with specific people* → add the service account's email with **See all event
details**.

This matters more than it looks: Cal.com writes bookings to whichever calendar
was connected to it, which is not necessarily the one in `GOOGLE_CALENDAR_ID`.
Sessions booked online and sessions typed in by hand can easily live on two
different calendars, and both need sharing.

### 3. Environment variables

| Variable | Required | What it does |
| --- | --- | --- |
| `CRM_CALENDAR_IDS` | no | Comma-separated calendars to scan. Defaults to `GOOGLE_CALENDAR_ID`. Set this if bookings and hand-typed sessions live on different calendars. |
| `CRM_INTERNAL_EMAILS` | recommended | Comma-separated staff and owner addresses. Stops a therapist or colleague who is an attendee on a session from being filed as the client. |
| `CRON_SECRET` | yes, for the daily sync | Shared secret for `/api/cron/crm-sync`. Without it that endpoint returns 503 rather than running unauthenticated. |

The organiser and creator of each event are treated as internal automatically,
so `CRM_INTERNAL_EMAILS` is only needed for staff who attend as guests.

### 4. The daily sync

`vercel.json` schedules `/api/cron/crm-sync` for 07:00 UTC (03:00 ET), which is
after the day's last session. Vercel sends `Authorization: Bearer $CRON_SECRET`
automatically once `CRON_SECRET` is set in the project.

### 5. Backfill

The scheduled run looks back 90 days. To pull in older history once, sign in at
`/admin/clients` and use **Sync calendar**, or call the endpoint directly:

```bash
curl -X POST https://<site>/api/admin/crm/sync \
  -H "Authorization: Bearer <supabase access token>" \
  -H "Content-Type: application/json" \
  -d '{"lookbackDays": 730}'
```

Re-running is safe at any range: visits are keyed on the Google event id, so a
second pass updates rows rather than duplicating them.

---

## What counts as a session

Three kinds of event show up on a working spa calendar, and only the first two
are sessions.

**Cal.com bookings.** The description carries Cal's structured block, and the
client's name, email, phone, and their reason for the visit are read straight
out of it.

**Hand-typed sessions** — `Michael Moore - 4 hand Massage`, `Zach massage`. The
name is taken from the event title. There is usually no contact information;
the record is still created so the person is on the list, and you can fill in a
phone number on the screen afterwards.

**Everything else** is ignored: deliveries, coworking, sales calls, Yelp
verifications. Two rules do the filtering — an event either has to name a
service from the menu, or read like a session and not like an errand, so
`Order massage oil` and `Massage table delivery` stay out. Third-party Cal.com
invites (a vendor's own booking link) are ignored too, because they name no
service of ours.

A session is only recorded once it has **finished**. Cancelled events, all-day
entries, and sessions you declined are skipped.

## How a visit is priced

In order of preference:

1. **An amount written on the event** — `... paid 120` in the title. This is
   what actually changed hands, so it wins. It is common for the collected
   amount to differ from the menu price, which is why this outranks everything.
2. **The menu price** for that service at that length, from
   `src/lib/config/cal-events.ts`.
3. **Nothing.** Off-menu work such as a four-handed session is left unpriced
   rather than guessed at, so lifetime value stays honest.

The screen shows which of these it used. To correct a session's value, write
`paid <amount>` on the calendar event and re-sync.

## Reaching out

The list sorts by most recent visit, lifetime value, or visit count, and filters
down to people who have not been in for 30/60/90 days. **Export CSV** downloads
exactly what is on screen, ready for a mail-merge tool.

Unticking **Contact OK** marks someone as opted out. They stay on the screen and
are dropped from every export.

## Known limits

- A walk-in recorded by name only, who later books online with an email, becomes
  a second record. Merge them by hand by putting the email on the original.
- The identity match is email, then phone, then name — and name only for people
  with no contact details at all, so two different men called Chris are not
  merged the moment one of them books online.
- The sync only ever fills in blanks on an existing client. Anything you edit on
  the screen survives the next run.
