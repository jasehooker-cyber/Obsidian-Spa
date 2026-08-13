import { supabaseServer } from "@/lib/supabase/server";
import { getBooking, type CalBooking } from "@/lib/cal/server";
import { sendPayLinkEmail } from "@/lib/email/server";
import { buildPayUrl, PAY_TOKEN_EXPIRY_HOURS } from "@/lib/booking/paylink";
import {
  parseAddOnIds,
  serviceByCalEventTypeId,
  type AddOnId,
} from "@/lib/config/business-rules";

/** Postgres unique-violation. Two concurrent syncs of the same booking race here. */
const UNIQUE_VIOLATION = "23505";

/**
 * The Cal.com account can host event types that are not spa services. Bookings
 * for those are not ours to record, and retrying will never help — callers
 * should acknowledge and move on rather than fail.
 */
export class UnmappedEventTypeError extends Error {
  constructor(uid: string, eventTypeId: number | null) {
    super(`Cal.com booking ${uid} uses unmapped event type ${eventTypeId}`);
    this.name = "UnmappedEventTypeError";
  }
}

export interface SyncedBooking {
  bookingId: string;
  payToken: string;
  /** False when the booking already existed, so callers can skip re-emailing. */
  created: boolean;
}

interface ExistingRow {
  id: string;
  pay_token: string;
}

/**
 * Create the Supabase record for a booking that already exists in Cal.com.
 *
 * Idempotent and safe to call concurrently: the Cal.com webhook and the client
 * redirect both land here for the same booking, and `bookings.cal_booking_uid`
 * is unique, so whichever loses the insert race re-reads the winner's row.
 */
export async function syncCalBooking(cal: CalBooking): Promise<SyncedBooking> {
  const supabase = supabaseServer();

  const existing = await findByCalUid(cal.uid);
  if (existing) {
    return { bookingId: existing.id, payToken: existing.pay_token, created: false };
  }

  // Cal.com only tells us which event type was booked; that is our join key
  // back to the service, its price, and its duration.
  const service = serviceByCalEventTypeId(cal.eventTypeId);
  if (!service) throw new UnmappedEventTypeError(cal.uid, cal.eventTypeId);

  const { data: serviceRow } = await supabase
    .from("services")
    .select("id")
    .eq("service_key", service.id)
    .single();

  if (!serviceRow) throw new Error(`Service ${service.id} is missing from the database`);

  // Cal.com assigns the host, so we record the booking against the active
  // therapist rather than asking the client to choose one.
  const { data: therapistRow } = await supabase
    .from("therapists")
    .select("id")
    .eq("active", true)
    .order("name")
    .limit(1)
    .maybeSingle();

  if (!therapistRow) throw new Error("No active therapist to attach the booking to");

  const clientId = await upsertClient(cal);

  const expiresAt = new Date(
    Date.now() + PAY_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000
  ).toISOString();

  const { data: inserted, error } = await supabase
    .from("bookings")
    .insert({
      client_id: clientId,
      therapist_id: therapistRow.id,
      service_id: serviceRow.id,
      // Booked in Cal.com but no card yet; /pay promotes this to 'confirmed'.
      status: "draft",
      cal_booking_uid: cal.uid,
      starts_at: cal.start,
      ends_at: cal.end,
      pay_token_expires_at: expiresAt,
    })
    .select("id, pay_token")
    .single();

  if (error) {
    // Lost the race against a concurrent sync of the same Cal.com booking.
    if (error.code === UNIQUE_VIOLATION) {
      const winner = await findByCalUid(cal.uid);
      if (winner) {
        return { bookingId: winner.id, payToken: winner.pay_token, created: false };
      }
    }
    throw new Error(`Failed to record Cal.com booking ${cal.uid}: ${error.message}`);
  }

  await attachAddOns(inserted.id, parseAddOnIds(cal.metadata.addOns));

  return { bookingId: inserted.id, payToken: inserted.pay_token, created: true };
}

/** Fetch a booking from Cal.com by uid and mirror it into Supabase. */
export async function syncCalBookingByUid(uid: string): Promise<SyncedBooking> {
  return syncCalBooking(await getBooking(uid));
}

/**
 * Mirror the booking and email the client their card-on-file link.
 * The email is best-effort — the booking itself is already secured.
 */
export async function syncCalBookingAndSendPayLink(
  cal: CalBooking
): Promise<SyncedBooking> {
  const result = await syncCalBooking(cal);

  if (result.created) {
    try {
      await sendPayLinkEmail({
        clientName: cal.attendeeName,
        clientEmail: cal.attendeeEmail,
        payUrl: buildPayUrl(result.payToken),
        startsAt: cal.start,
      });
    } catch (err) {
      console.error(`Pay-link email failed for booking ${result.bookingId}:`, err);
    }
  }

  return result;
}

async function findByCalUid(uid: string): Promise<ExistingRow | null> {
  const { data } = await supabaseServer()
    .from("bookings")
    .select("id, pay_token")
    .eq("cal_booking_uid", uid)
    .maybeSingle();

  return data ?? null;
}

/** Reuse the client row for a returning email so Stripe customers stay stable. */
async function upsertClient(cal: CalBooking): Promise<string> {
  const supabase = supabaseServer();

  const { data: existing } = await supabase
    .from("clients")
    .select("id")
    .eq("email", cal.attendeeEmail)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("clients")
      .update({
        name: cal.attendeeName,
        ...(cal.attendeePhone ? { phone: cal.attendeePhone } : {}),
      })
      .eq("id", existing.id);
    return existing.id;
  }

  const { data: created, error } = await supabase
    .from("clients")
    .insert({
      email: cal.attendeeEmail,
      name: cal.attendeeName,
      phone: cal.attendeePhone,
    })
    .select("id")
    .single();

  if (error || !created) {
    // A concurrent sync may have created the client between our read and write.
    if (error?.code === UNIQUE_VIOLATION) {
      const { data: winner } = await supabase
        .from("clients")
        .select("id")
        .eq("email", cal.attendeeEmail)
        .single();
      if (winner) return winner.id;
    }
    throw new Error(`Failed to create client for ${cal.attendeeEmail}`);
  }

  return created.id;
}

async function attachAddOns(bookingId: string, addOnIds: AddOnId[]): Promise<void> {
  if (addOnIds.length === 0) return;

  const supabase = supabaseServer();
  const { data: rows } = await supabase
    .from("add_ons")
    .select("id")
    .in("add_on_key", addOnIds);

  if (!rows?.length) return;

  await supabase
    .from("booking_add_ons")
    .insert(rows.map((r) => ({ booking_id: bookingId, add_on_id: r.id })));
}
