"use client";

import { useEffect } from "react";
import { getCalApi } from "@calcom/embed-react";
import { CAL_NAMESPACES } from "@/lib/config/cal-events";
import { CAL_UI_CONFIG } from "@/lib/cal/embed-ui";
import {
  reportBookingConversion,
  type BookingConversion,
} from "@/lib/analytics/google-ads";

/**
 * Themes every Cal.com embed namespace and listens for completed bookings.
 * Call once on any page that renders Cal booking buttons.
 *
 * Cal's embed script attaches a global click listener for `[data-cal-link]`
 * elements, so the buttons themselves need no click handlers.
 */
export function useCalEmbed() {
  useEffect(() => {
    let active = true;
    const teardown: (() => void)[] = [];

    (async () => {
      for (const namespace of CAL_NAMESPACES) {
        const cal = await getCalApi({ namespace });
        if (!active) return;

        // forwardQueryParams is deliberately left off. It copies the visiting
        // page's query string into the booker, so an ad or campaign link
        // (?fbclid=, ?utm_=) hands Cal params it then has to parse — a
        // plausible source of the crash reported in its booker.
        cal("ui", CAL_UI_CONFIG);

        // Booking completes inside Cal's iframe, so this event is the only
        // way the page learns it happened — and the only way Google Ads can
        // be told which ad clicks turned into bookings.
        const onBooked = (event: {
          detail: { data: BookingConversion };
        }) => reportBookingConversion(event.detail.data);

        cal("on", { action: "bookingSuccessfulV2", callback: onBooked });
        teardown.push(() =>
          cal("off", { action: "bookingSuccessfulV2", callback: onBooked })
        );
      }
    })();

    return () => {
      active = false;
      teardown.forEach((off) => off());
    };
  }, []);
}
