/**
 * Meta (Facebook/Instagram) Pixel and booking conversion reporting.
 *
 * The base pixel in the root layout reports PageView. Booking completes inside
 * Cal.com's iframe, so CalBookingMenu forwards the `bookingSuccessfulV2` event
 * here and Meta receives a real Schedule event only after a booking succeeds.
 */

import { CAL_SERVICES } from "@/lib/config/cal-events";

/** Public by design — the pixel id ships in the page for anyone to read. */
export const META_PIXEL_ID = "2065162891032983";

type Fbq = (...args: unknown[]) => void;

declare global {
  interface Window {
    fbq?: Fbq;
  }
}

const PRICE_BY_EVENT_TYPE_ID = new Map(
  CAL_SERVICES.flatMap((service) =>
    service.durations.map((duration) => [duration.eventTypeId, duration.price])
  )
);

/** Booking uids already reported, so duplicate Cal events cannot double-count. */
const reported = new Set<string>();

export interface MetaBookingConversion {
  uid?: string;
  eventTypeId?: number | null;
}

/** Reports one successfully completed Cal.com booking as Meta's Schedule event. */
export function reportMetaBooking(booking: MetaBookingConversion): void {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;

  const uid = booking.uid;
  if (uid) {
    if (reported.has(uid)) return;
    reported.add(uid);
  }

  const price =
    booking.eventTypeId != null
      ? PRICE_BY_EVENT_TYPE_ID.get(booking.eventTypeId)
      : undefined;
  const params = {
    ...(price != null ? { value: price / 100 } : {}),
    currency: "USD",
  };

  // eventID also prepares browser events for deduplication if Conversions API
  // is added later and sends the same booking uid server-side.
  if (uid) {
    window.fbq("track", "Schedule", params, { eventID: uid });
  } else {
    window.fbq("track", "Schedule", params);
  }
}
