import { supabaseServer } from "@/lib/supabase/server";
import { getEnv } from "@/lib/config/env";
import {
  ADD_ONS,
  SERVICES,
  type AddOn,
  type Service,
} from "@/lib/config/business-rules";

export const PAY_TOKEN_EXPIRY_HOURS = 72;

export function buildPayUrl(token: string): string {
  return `${getEnv().siteUrl}/pay/${token}`;
}

export type PayTokenFailure =
  | "not_found"
  | "expired"
  | "already_paid"
  | "cancelled"
  | "unknown_service";

export interface PayBooking {
  bookingId: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string | null;
  stripeCustomerId: string | null;
  setupIntentId: string | null;
  startsAt: string;
  endsAt: string;
  service: Service;
  addOns: AddOn[];
  totalCents: number;
}

export type PayTokenResult =
  | { valid: true; booking: PayBooking }
  | { valid: false; reason: PayTokenFailure };

/** Shape returned by the joined select below. */
interface BookingRow {
  id: string;
  status: string;
  starts_at: string;
  ends_at: string;
  pay_token_expires_at: string | null;
  stripe_setup_intent_id: string | null;
  clients: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    stripe_customer_id: string | null;
  } | null;
  services: { service_key: string } | null;
  booking_add_ons: { add_ons: { add_on_key: string } | null }[] | null;
}

/**
 * Load the booking behind a pay link, or explain why the link is not usable.
 * Everything the pay page renders comes from here so the page stays a thin view.
 */
export async function loadBookingByPayToken(
  token: string
): Promise<PayTokenResult> {
  // The column is a uuid; a malformed token would make Postgres error rather
  // than return an empty result, so screen it first.
  if (!isUuid(token)) return { valid: false, reason: "not_found" };

  const { data } = await supabaseServer()
    .from("bookings")
    .select(
      `
      id, status, starts_at, ends_at, pay_token_expires_at, stripe_setup_intent_id,
      clients(id, name, email, phone, stripe_customer_id),
      services(service_key),
      booking_add_ons(add_ons(add_on_key))
    `
    )
    .eq("pay_token", token)
    .maybeSingle<BookingRow>();

  if (!data) return { valid: false, reason: "not_found" };

  if (data.status === "cancelled" || data.status === "no_show") {
    return { valid: false, reason: "cancelled" };
  }

  // A saved card is what promotes a booking past 'draft'. Anything further
  // along means this link has already done its job.
  if (data.status !== "draft") return { valid: false, reason: "already_paid" };

  if (
    data.pay_token_expires_at &&
    new Date(data.pay_token_expires_at) < new Date()
  ) {
    return { valid: false, reason: "expired" };
  }

  const service = SERVICES.find((s) => s.id === data.services?.service_key);
  if (!service) return { valid: false, reason: "unknown_service" };

  if (!data.clients) return { valid: false, reason: "not_found" };

  const addOnKeys = new Set(
    (data.booking_add_ons ?? [])
      .map((row) => row.add_ons?.add_on_key)
      .filter((key): key is string => Boolean(key))
  );
  const addOns = ADD_ONS.filter((a) => addOnKeys.has(a.id));

  return {
    valid: true,
    booking: {
      bookingId: data.id,
      clientId: data.clients.id,
      clientName: data.clients.name,
      clientEmail: data.clients.email,
      clientPhone: data.clients.phone,
      stripeCustomerId: data.clients.stripe_customer_id,
      setupIntentId: data.stripe_setup_intent_id,
      startsAt: data.starts_at,
      endsAt: data.ends_at,
      service,
      addOns,
      totalCents:
        service.price + addOns.reduce((sum, a) => sum + a.price, 0),
    },
  };
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}
