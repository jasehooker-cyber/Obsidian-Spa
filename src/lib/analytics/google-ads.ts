/**
 * Google Ads conversion reporting for completed bookings.
 *
 * The tag in the root layout only reports page views. Booking finishes inside
 * Cal.com's iframe, so the parent page never sees it unless we listen for the
 * `bookingSuccessfulV2` event Cal posts out to us. That listener is wired up in
 * CalBookingMenu; this module owns what gets sent.
 */

import { CAL_SERVICES } from "@/lib/config/cal-events";

/** Same account as the tag in the root layout. */
export const GOOGLE_ADS_ID = "AW-18369793323";

/**
 * The conversion action's label, from Google Ads → Goals → Conversions. Its
 * snippet reads `send_to: 'AW-18369793323/AbC-D_efGh12_34-567'`; the half after
 * the slash is the label. Set NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL in Vercel
 * so rotating it never needs a deploy. Until it is set, bookings still reach
 * dataLayer but no conversion is reported — sending one without a label would
 * be attributed to nothing.
 */
export const CONVERSION_LABEL =
  process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL ?? "";

/** Cal identifies the booked session by event type id; we price it from there. */
const BY_EVENT_TYPE_ID = new Map(
  CAL_SERVICES.flatMap((service) =>
    service.durations.map((duration) => [
      duration.eventTypeId,
      { name: `${service.name} (${duration.minutes}m)`, price: duration.price },
    ])
  )
);

type Gtag = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
  }
}

/** Booking uids already reported, so a re-emitted event cannot double-count. */
const reported = new Set<string>();

export interface BookingConversion {
  uid?: string;
  eventTypeId?: number | null;
  paymentRequired?: boolean;
}

/**
 * Reports one completed booking to Google Ads.
 *
 * `transaction_id` is Cal's booking uid, which lets Google discard duplicates
 * if the event arrives twice — worth having, since we subscribe once per event
 * type namespace.
 */
export function reportBookingConversion(booking: BookingConversion): void {
  if (typeof window === "undefined") return;

  const uid = booking.uid;
  if (uid) {
    if (reported.has(uid)) return;
    reported.add(uid);
  }

  const service =
    booking.eventTypeId != null
      ? BY_EVENT_TYPE_ID.get(booking.eventTypeId)
      : undefined;
  const value = service ? service.price / 100 : undefined;

  // Always leave a dataLayer breadcrumb, so the booking is visible to GA4 or
  // Tag Manager later even while the Ads label is unset.
  window.dataLayer?.push({
    event: "booking_success",
    booking_uid: uid,
    service: service?.name,
    value,
    currency: "USD",
    payment_required: booking.paymentRequired ?? null,
  });

  if (!CONVERSION_LABEL || typeof window.gtag !== "function") return;

  window.gtag("event", "conversion", {
    send_to: `${GOOGLE_ADS_ID}/${CONVERSION_LABEL}`,
    value,
    currency: "USD",
    transaction_id: uid,
  });
}
