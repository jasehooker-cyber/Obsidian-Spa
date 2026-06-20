-- Obsidian Men's Spa — initial schema

-- Booking status enum
create type booking_status as enum (
  'draft',
  'confirmed',
  'completed',
  'cancelled',
  'no_show'
);

-- Payment type enum
create type payment_type as enum (
  'service',
  'late_cancel',
  'no_show'
);

-- Webhook source enum
create type webhook_source as enum (
  'stripe',
  'cal'
);

-- Therapists
create table therapists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cal_event_type_id integer not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Services
create table services (
  id uuid primary key default gen_random_uuid(),
  service_key text not null unique,
  name text not null,
  duration_minutes integer not null,
  price_cents integer not null,
  requires_multiple_therapists boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Add-ons
create table add_ons (
  id uuid primary key default gen_random_uuid(),
  add_on_key text not null unique,
  name text not null,
  price_cents integer not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Clients
create table clients (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  phone text,
  stripe_customer_id text unique,
  created_at timestamptz not null default now()
);

-- Bookings
create table bookings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id),
  therapist_id uuid not null references therapists(id),
  service_id uuid not null references services(id),
  status booking_status not null default 'draft',
  cal_booking_uid text unique,
  stripe_setup_intent_id text,
  stripe_payment_method_id text,
  google_event_id text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  completed_at timestamptz
);

-- Booking add-ons (junction table)
create table booking_add_ons (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  add_on_id uuid not null references add_ons(id),
  unique (booking_id, add_on_id)
);

-- Intake submissions
create table intake_submissions (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) unique,
  token uuid not null unique default gen_random_uuid(),
  token_expires_at timestamptz not null,
  submitted_at timestamptz,
  data jsonb,
  created_at timestamptz not null default now()
);

-- Payments
create table payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id),
  type payment_type not null,
  amount_cents integer not null,
  stripe_payment_intent_id text unique,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

-- Promo codes (v2, table created now for schema stability)
create table promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  discount_value integer not null,
  active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- Webhook events (idempotency tracking)
create table webhook_events (
  id uuid primary key default gen_random_uuid(),
  source webhook_source not null,
  event_id text not null unique,
  event_type text not null,
  payload jsonb not null,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Indexes
create index idx_bookings_client on bookings(client_id);
create index idx_bookings_therapist on bookings(therapist_id);
create index idx_bookings_status on bookings(status);
create index idx_bookings_starts_at on bookings(starts_at);
create index idx_payments_booking on payments(booking_id);
create index idx_intake_token on intake_submissions(token);
create index idx_webhook_event_id on webhook_events(event_id);

-- Enable RLS on all tables
alter table therapists enable row level security;
alter table services enable row level security;
alter table add_ons enable row level security;
alter table clients enable row level security;
alter table bookings enable row level security;
alter table booking_add_ons enable row level security;
alter table intake_submissions enable row level security;
alter table payments enable row level security;
alter table promo_codes enable row level security;
alter table webhook_events enable row level security;

-- Public read access for therapists, services, add-ons
create policy "Public can read active therapists"
  on therapists for select using (active = true);

create policy "Public can read active services"
  on services for select using (active = true);

create policy "Public can read active add-ons"
  on add_ons for select using (active = true);

-- All other tables: no direct anon access (server uses service role key)

-- Seed services
insert into services (service_key, name, duration_minutes, price_cents, requires_multiple_therapists) values
  ('signature-60', '60 Min Signature Massage', 60, 15000, false),
  ('signature-90', '90 Min Signature Massage', 90, 21000, false),
  ('couples', 'Couples Massage', 60, 26000, true),
  ('four-handed', 'Four-Handed Massage', 60, 26000, true);

-- Seed add-ons
insert into add_ons (add_on_key, name, price_cents) values
  ('cbd', 'CBD', 3000),
  ('hot-stones', 'Hot Stones', 3000),
  ('cupping', 'Cupping', 3000);
