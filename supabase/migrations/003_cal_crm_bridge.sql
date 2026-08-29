-- Keep production CRM schema reproducible from the repository.
-- Adds optional Cal.com/booking identifiers to calendar visits and mirrors the
-- legacy site booking table into the same CRM history. The primary CRM source
-- remains the Google Calendar sync in src/lib/crm/sync.ts.

alter table public.client_visits
  alter column google_event_id drop not null,
  alter column google_calendar_id drop not null;

alter table public.client_visits
  add column if not exists cal_booking_uid text,
  add column if not exists cal_booking_id bigint,
  add column if not exists cal_event_type_id integer,
  add column if not exists cal_event_type_slug text,
  add column if not exists booking_status text not null default 'confirmed',
  add column if not exists booked_at timestamptz,
  add column if not exists booking_id uuid references public.bookings(id) on delete cascade;

create unique index if not exists idx_client_visits_cal_booking_uid
  on public.client_visits(cal_booking_uid)
  where cal_booking_uid is not null;
create unique index if not exists idx_client_visits_booking_id
  on public.client_visits(booking_id);
create index if not exists idx_client_visits_status
  on public.client_visits(booking_status);

alter table public.services
  add column if not exists cal_event_type_id integer,
  add column if not exists cal_event_type_slug text;

create unique index if not exists idx_services_cal_event_type_id
  on public.services(cal_event_type_id)
  where cal_event_type_id is not null;
create unique index if not exists idx_services_cal_event_type_slug
  on public.services(lower(cal_event_type_slug))
  where cal_event_type_slug is not null;

-- Mirror the same event types/prices used by src/lib/config/cal-events.ts.
update public.services
set name = 'Obsidian Signature Massage — 60 Min', duration_minutes = 60,
    price_cents = 18000, active = true, cal_event_type_id = 6637250,
    cal_event_type_slug = 'obsidian'
where service_key = 'signature-60';

update public.services
set name = 'Obsidian Signature Massage — 90 Min', duration_minutes = 90,
    price_cents = 24000, active = true, cal_event_type_id = 6640200,
    cal_event_type_slug = 'obsidian-copy'
where service_key = 'signature-90';

insert into public.services
  (service_key, name, duration_minutes, price_cents, requires_multiple_therapists,
   active, cal_event_type_id, cal_event_type_slug)
values
  ('forge-60', 'The Forge — 60 Min', 60, 16500, false, true, 6640251, 'the-forge'),
  ('forge-90', 'The Forge — 90 Min', 90, 22500, false, true, 6640308, 'the-forge-copy'),
  ('blackout-60', 'Blackout — 60 Min', 60, 15000, false, true, 6640690, 'blackout-copy'),
  ('blackout-90', 'Blackout — 90 Min', 90, 21000, false, true, 6640453, 'blackout'),
  ('split-30', 'The Split — 30 Min', 30, 9500, false, true, 6640747, 'the-split')
on conflict (service_key) do update set
  name = excluded.name,
  duration_minutes = excluded.duration_minutes,
  price_cents = excluded.price_cents,
  requires_multiple_therapists = excluded.requires_multiple_therapists,
  active = excluded.active,
  cal_event_type_id = excluded.cal_event_type_id,
  cal_event_type_slug = excluded.cal_event_type_slug;

-- Retire stale catalog rows that are no longer bookable.
update public.services
set active = false
where service_key in ('couples', 'four-handed', 'split-45');

create or replace function public.refresh_client_crm_metrics(p_client_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.clients c
  set first_seen_at = stats.first_seen_at,
      last_visit_at = stats.last_visit_at,
      visit_count = stats.visit_count,
      lifetime_value_cents = stats.lifetime_value_cents
  from (
    select
      min(v.starts_at) filter (
        where v.booking_status not in ('cancelled','rejected')
      ) as first_seen_at,
      max(v.starts_at) filter (
        where v.booking_status not in ('cancelled','rejected')
          and v.starts_at <= now()
      ) as last_visit_at,
      count(*) filter (
        where v.booking_status not in ('cancelled','rejected')
          and v.starts_at <= now()
      )::integer as visit_count,
      coalesce(sum(v.price_cents) filter (
        where v.booking_status not in ('cancelled','rejected')
          and v.starts_at <= now()
      ), 0)::integer as lifetime_value_cents
    from public.client_visits v
    where v.client_id = p_client_id
  ) stats
  where c.id = p_client_id;
end;
$$;

create or replace function public.client_visits_refresh_metrics_trigger()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_client_crm_metrics(old.client_id);
    return old;
  end if;
  perform public.refresh_client_crm_metrics(new.client_id);
  if tg_op = 'UPDATE' and old.client_id is distinct from new.client_id then
    perform public.refresh_client_crm_metrics(old.client_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_client_visits_refresh_metrics on public.client_visits;
create trigger trg_client_visits_refresh_metrics
after insert or update or delete on public.client_visits
for each row execute function public.client_visits_refresh_metrics_trigger();

create or replace function public.sync_booking_to_client_visit()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  svc public.services%rowtype;
begin
  if new.client_id is null then
    if tg_op = 'UPDATE' and old.client_id is not null then
      delete from public.client_visits where booking_id = new.id;
    end if;
    return new;
  end if;

  select * into svc from public.services where id = new.service_id;

  insert into public.client_visits (
    booking_id, client_id, google_event_id, cal_booking_uid,
    service_id, service_name, duration_minutes, price_cents, price_source,
    starts_at, ends_at, source, booking_status, booked_at, updated_at
  ) values (
    new.id, new.client_id, new.google_event_id, new.cal_booking_uid,
    svc.service_key, svc.name, svc.duration_minutes, svc.price_cents,
    case when svc.id is null then 'unknown' else 'list' end,
    new.starts_at, new.ends_at, 'cal.com', new.status::text, new.created_at, now()
  )
  on conflict (booking_id) do update set
    client_id = excluded.client_id,
    google_event_id = excluded.google_event_id,
    cal_booking_uid = excluded.cal_booking_uid,
    service_id = excluded.service_id,
    service_name = excluded.service_name,
    duration_minutes = excluded.duration_minutes,
    price_cents = excluded.price_cents,
    price_source = excluded.price_source,
    starts_at = excluded.starts_at,
    ends_at = excluded.ends_at,
    source = excluded.source,
    booking_status = excluded.booking_status,
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_sync_booking_to_client_visit on public.bookings;
create trigger trg_sync_booking_to_client_visit
after insert or update of client_id, service_id, status, cal_booking_uid,
  google_event_id, starts_at, ends_at
on public.bookings
for each row execute function public.sync_booking_to_client_visit();
