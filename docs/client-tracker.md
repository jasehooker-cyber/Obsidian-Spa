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
| `ADMIN_SECRET_PATH` | **yes** | The private URL that unlocks the admin area. Without it the admin is hidden from everyone, including you. See [Admin access](#admin-access). |
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

## Admin access

The admin area is **hidden, not just protected**. `/admin` and everything under
it returns the site's ordinary 404 page — byte for byte identical to a genuine
typo — to anyone who has not been let in. A visitor, a crawler, or someone
guessing URLs cannot tell it exists. The sign-in form is never publicly
reachable.

Two independent layers, and both matter:

| Layer | What it does | Where |
| --- | --- | --- |
| **Concealment** | Hides that an admin exists at all | `src/proxy.ts` |
| **Authentication** | Decides who may read the data | Supabase Auth + `STAFF_ALLOWED_EMAILS` |

The second is what actually guards the data, and it is enforced on every admin
API call independently. The first means nobody comes looking.

### 1. Choose your private URL

Set a server-only env var to something unguessable — treat it like a password,
not like a path:

```
ADMIN_SECRET_PATH=k3p9wq2mzt7v
```

Generate one with `openssl rand -hex 8`. It is read only on the server and
never appears in the browser bundle, the sitemap, or `robots.txt`.

Then visit **`https://<your-domain>/k3p9wq2mzt7v`** once. That sets a
long-lived, httpOnly cookie and forwards you to the client list. From then on
`/admin/clients` simply works in that browser, and stays a 404 in every other.

To revoke access — a lost laptop, a departing staff member — change
`ADMIN_SECRET_PATH`. Every existing cookie stops working immediately.

**It fails closed.** If `ADMIN_SECRET_PATH` is not set, the admin is hidden from
*everyone*, including you. That is deliberate: a missing variable must never
mean "the admin is public". If you get a 404 at your own private URL, check the
variable is set in Vercel and redeploy.

### 2. Put yourself on the staff list

```
STAFF_ALLOWED_EMAILS=jase@obsidianspas.com
```

Comma-separated, checked on **every** admin API call. For "me and only me", put
one address here. A signed-in account that is not on the list gets "Not a staff
account" and no data.

Adding staff later takes two things: give them the private URL, and add their
address here. Both are required.

### 3. Turn on email sign-in in Supabase

Supabase -> **Authentication -> Providers -> Email**. Magic links need only
*Enable email provider*; passwords can stay off.

### 4. Allow the redirect URL

Supabase -> **Authentication -> URL Configuration**:

- **Site URL** - `https://<your-domain>`
- **Redirect URLs** - add `https://<your-domain>/admin/clients` (plus
  `http://localhost:3000/admin/clients` for local work)

Miss this and the emailed link bounces you out still signed out. It is the most
common reason magic links appear to "do nothing".

### 5. Close public signup

By default Supabase creates an account for any address that asks for a link.
The allowlist still blocks them from the data, but there is no reason to allow
it: Supabase -> **Authentication -> Sign In / Providers** -> turn **Allow new
users to sign up** off, then add your own user under **Authentication -> Users**.

Do this *after* your first successful sign-in, or you will lock yourself out
before your account exists.

### Signing in on a second device

The gate cookie is per-browser. Opening the magic link on a phone that has never
visited the private URL gives a 404. Visit
`https://<your-domain>/<ADMIN_SECRET_PATH>` on that phone first, then sign in.
Bookmark the private URL on every device you use.

---

## Knowing the nightly sync actually ran

A cron that fails quietly is worse than no cron, so the screen says how it went.
At the top of `/admin/clients` you get one of:

- `Synced 6 hours ago · 3 sessions, 1 new client · automatic` — normal.
- **The calendar sync has never run** — expected before your first sync.
- **Last synced 3 days ago** — the nightly run is not firing. Check `CRON_SECRET`
  is set in Vercel and that Cron Jobs are enabled for the project.
- **Last sync failed: …** — with the reason. Most often a calendar that has not
  been shared with the service account.

Every run is also written to the `crm_sync_runs` table if you want the history.

**A missed night is not lost data.** Each run re-scans the last 90 days and is
keyed on the Google event id, so the next successful run silently picks up
everything that was missed. You only need to act if the warning persists.

### A note on cron timing

`vercel.json` schedules the run for 07:00 UTC — 3am New York — which is after
the 10pm close. On Vercel's Hobby plan crons fire roughly once a day rather than
to the minute, which is fine here; Pro schedules precisely. Either way the
"Last synced" line tells you the truth rather than the intention.

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
