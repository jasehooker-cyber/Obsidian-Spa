/**
 * Meta (Facebook/Instagram) Pixel.
 *
 * The base pixel in the root layout reports a PageView on every route. Booking
 * completes inside Cal.com's iframe, so a booking is not a page view here — if
 * we ever want Meta to attribute bookings the way Google Ads does, the hook is
 * the `bookingSuccessfulV2` listener in CalBookingMenu, same as google-ads.ts.
 */

/** Public by design — the pixel id ships in the page for anyone to read. */
export const META_PIXEL_ID = "2065162891032983";
