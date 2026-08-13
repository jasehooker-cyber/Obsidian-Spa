-- Cal.com embed booking flow.
--
-- Scheduling moved into the Cal.com embed, so a booking now exists in Cal.com
-- before we have a card on file. Those bookings land here as 'draft' and are
-- promoted to 'confirmed' once the client saves a card via the pay link below.

alter table bookings
  add column pay_token uuid unique not null default gen_random_uuid(),
  add column pay_token_expires_at timestamptz;

-- Looked up on every visit to /pay/<token> and on every Cal.com webhook.
create index idx_bookings_pay_token on bookings(pay_token);
create index idx_bookings_cal_booking_uid on bookings(cal_booking_uid);
