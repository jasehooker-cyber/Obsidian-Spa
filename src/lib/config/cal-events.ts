/**
 * Cal.com team event types for Obsidian Spa.
 *
 * Source of truth for the booking menu. Slugs, durations, and descriptions
 * mirror the event types configured on the Cal.com team `obsidian-spa`.
 * Changing a name here only changes the website copy — the Cal.com booking
 * screen shows whatever is set in the Cal.com dashboard.
 */

/** Cal.com team slug. Booking links are `team/<slug>/<event-slug>`. */
export const CAL_TEAM_SLUG = "obsidian-spa";

/**
 * Booker layout. `week_view` shows a week of days side by side with each day's
 * open times under it — more of the schedule visible than a month grid, and
 * more context than a single day. Swap to "month_view" or "column_view" here
 * and the embed follows everywhere.
 */
export const CAL_LAYOUT = "week_view" as const;

/**
 * Config handed to each click-to-open trigger. `useSlotsViewOnSmallScreen`
 * keeps phones on a plain list of times.
 */
export const CAL_TRIGGER_CONFIG = JSON.stringify({
  layout: CAL_LAYOUT,
  useSlotsViewOnSmallScreen: "true",
});

export interface CalDuration {
  /** Session length in minutes, as configured in Cal.com. */
  minutes: number;
  /** Cal.com event type slug. */
  slug: string;
  /** Embed namespace — one per event type, matching Cal's generated snippets. */
  namespace: string;
  /**
   * Base price in cents, mirroring the event type's price in Cal.com. Shown so
   * clients see the cost before opening the booker. Cal.com holds this amount
   * on the card rather than charging it — see CARD_HOLD_NOTICE.
   */
  price: number;
}

export interface CalService {
  id: string;
  /** Small uppercase label above the service name. */
  eyebrow: string;
  name: string;
  description: string;
  durations: CalDuration[];
  /** Quiet bronze emphasis on the service card — border, glow, and badge. */
  featured?: boolean;
}

/**
 * The seven Cal.com event types, grouped into the four services they represent.
 * Three services are offered at two lengths; The Split is a single 45-minute
 * session.
 *
 * Note the Blackout slugs: `blackout` is the 90-minute event and
 * `blackout-copy` is the 60-minute one, which is the reverse of the other pairs.
 */
export const CAL_SERVICES: CalService[] = [
  {
    id: "obsidian-signature",
    featured: true,
    eyebrow: "THE SIGNATURE",
    name: "Obsidian Signature Massage",
    description:
      "Our signature. Built around wherever you're sore. Swedish, deep tissue, and stretch blended to the body on the table that day.",
    durations: [
      { minutes: 60, slug: "obsidian", namespace: "obsidian", price: 180_00 },
      {
        minutes: 90,
        slug: "obsidian-copy",
        namespace: "obsidian-copy",
        price: 240_00,
      },
    ],
  },
  {
    id: "the-forge",
    eyebrow: "DEEP TISSUE",
    name: "The Forge",
    description:
      "Slow, heavy, deliberate pressure. For men who lift, sit, or carry stress in their back.",
    durations: [
      { minutes: 60, slug: "the-forge", namespace: "the-forge", price: 165_00 },
      {
        minutes: 90,
        slug: "the-forge-copy",
        namespace: "the-forge-copy",
        price: 225_00,
      },
    ],
  },
  {
    id: "blackout",
    eyebrow: "RESTORATIVE",
    name: "Blackout",
    description:
      "Slow, enveloping, and completely unhurried. Built to quiet everything down — most men are asleep long before the halfway mark.",
    durations: [
      {
        minutes: 60,
        slug: "blackout-copy",
        namespace: "blackout-copy",
        price: 150_00,
      },
      { minutes: 90, slug: "blackout", namespace: "blackout", price: 210_00 },
    ],
  },
  {
    id: "the-split",
    eyebrow: "EXPRESS",
    name: "The Split",
    description:
      "Our shortest session. Focused, targeted work on the areas that need it most, for when time is tight.",
    durations: [
      // Cal.com still has this event type priced at $150. The site price is the
      // correct one — update the event type in Cal.com so the card hold matches.
      { minutes: 45, slug: "the-split", namespace: "the-split", price: 100_00 },
    ],
  },
];

/**
 * Every event type is configured in Cal.com with Stripe `paymentOption: "HOLD"`,
 * so booking places a hold on the card instead of taking payment. Stated up
 * front so the card step in the booker is not a surprise.
 */
export const CARD_HOLD_NOTICE =
  "Booking places a hold on your card — you are not charged online. Payment is taken after your session; the card is only charged for last-minute cancellations or no-shows.";

/** Lowest price across a service's lengths, for the “from” price on its card. */
export function basePrice(service: CalService): number {
  return Math.min(...service.durations.map((duration) => duration.price));
}

/** Every embed namespace on the page, for one-time UI theming on mount. */
export const CAL_NAMESPACES: string[] = CAL_SERVICES.flatMap((service) =>
  service.durations.map((duration) => duration.namespace)
);

/** Builds the `data-cal-link` value for a team event type. */
export function calLink(slug: string): string {
  return `team/${CAL_TEAM_SLUG}/${slug}`;
}
