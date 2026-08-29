-- Obsidian Men's Spa — client CRM
--
-- Turns the Google Calendar into a client list. Every past massage found on a
-- watched calendar becomes a row in `client_visits`, and the person it was for
-- becomes (or updates) a row in `clients`. The point is outreach: who came in,
-- what they had, what they paid, how to reach them, and how long it has been.

-- ---------------------------------------------------------------------------
-- clients: relax the identity rules
-- ---------------------------------------------------------------------------
-- Calendar events are not a booking form. Plenty of real visits are a manually
-- typed event with a first name and nothing else ("Zach massage"), so email can
-- no longer be required. Identity is now "at least one of email / phone / name",
-- enforced below.

alter table clients alter column email drop not null;

-- Replace the plain unique constraint with a case-insensitive one, so
-- Sam@x.com and sam@x.com are the same client. Partial, because several
-- clients may legitimately have no email at all.
alter table clients drop constraint if exists clients_email_key;

create unique index if not exists idx_clients_email_lower
  on clients (lower(email))
  where email is not null;

-- Same idea for phone, which is the only handle we have on some walk-ins.
-- Stored normalized (digits, leading +) by the sync — see normalizePhone().
create unique index if not exists idx_clients_phone
  on clients (phone)
  where phone is not null;

alter table clients
  add column if not exists first_seen_at timestamptz,
  add column if not exists last_visit_at timestamptz,
  add column if not exists visit_count integer not null default 0,
  add column if not exists lifetime_value_cents integer not null default 0,
  -- Where the record came from: 'cal.com' (booked online), 'manual' (typed
  -- into the calendar by hand), or 'booking' (the site's own booking flow).
  add column if not exists source text,
  add column if not exists notes text,
  -- Set by hand when someone asks not to be contacted. The outreach list and
  -- the CSV export both honour it.
  add column if not exists marketing_opt_out boolean not null default false;

alter table clients
  drop constraint if exists clients_identity_check;

alter table clients
  add constraint clients_identity_check
  check (email is not null or phone is not null or name is not null);

-- ---------------------------------------------------------------------------
-- client_visits: one row per massage found on the calendar
-- ---------------------------------------------------------------------------
-- Keyed on the Google event id so a re-sync is idempotent — re-running over the
-- same window updates rows in place instead of duplicating history.

create table if not exists client_visits (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,

  google_event_id text not null unique,
  google_calendar_id text not null,
  google_event_url text,

  -- Service as advertised. `service_id` matches an id in cal-events.ts when the
  -- event named a service we recognise; it is null for off-menu work such as
  -- the four-handed sessions, which still count as visits.
  service_id text,
  service_name text,
  duration_minutes integer,

  -- What the visit was worth, in cents. Null when we could not tell.
  price_cents integer,
  -- How we arrived at price_cents:
  --   'recorded' — an amount written on the event ("... paid 120"). Authoritative.
  --   'list'     — the menu price for that service and length. An assumption.
  --   'unknown'  — no price could be determined; price_cents is null.
  price_source text not null default 'unknown'
    check (price_source in ('recorded', 'list', 'unknown')),

  starts_at timestamptz not null,
  ends_at timestamptz not null,

  -- 'cal.com' for online bookings, 'manual' for hand-typed events.
  source text not null default 'manual',
  -- The client's own words from the booking form ("Reason for the visit").
  -- Useful outreach material: it says what they came in for.
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_client_visits_client on client_visits(client_id);
create index if not exists idx_client_visits_starts_at on client_visits(starts_at desc);
create index if not exists idx_client_visits_calendar on client_visits(google_calendar_id);

alter table client_visits enable row level security;
-- No policies: anon gets nothing. The sync and the admin API use the service
-- role key, which bypasses RLS.

-- ---------------------------------------------------------------------------
-- crm_sync_runs: a log, so a silent cron failure is visible
-- ---------------------------------------------------------------------------

create table if not exists crm_sync_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  window_start timestamptz,
  window_end timestamptz,
  events_scanned integer not null default 0,
  visits_recorded integer not null default 0,
  clients_created integer not null default 0,
  status text not null default 'running'
    check (status in ('running', 'success', 'error')),
  error text,
  trigger text
);

create index if not exists idx_crm_sync_runs_started on crm_sync_runs(started_at desc);

alter table crm_sync_runs enable row level security;
