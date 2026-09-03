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
 * Booker layout. Kept at `month_view`: it is Cal's default and the layout the
 * generated embed snippets specify, so it is the one guaranteed to be enabled
 * on every event type. week_view and column_view have to be turned on per
 * event type in Cal.com under Event Type → Advanced → Layout; picking one that
 * is not enabled there leaves the booker with nothing to show.
 */
export const CAL_LAYOUT = "month_view" as const;

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
   * Cal.com's numeric id for the event type. Cal reports this — not the slug —
   * when a booking completes, so it is how a conversion gets priced.
   */
  eventTypeId: number;
  /**
   * Base price in cents, mirroring the event type's price in Cal.com. Shown so
   * clients see the cost before opening the booker. Nothing is taken online —
   * see PAYMENT_NOTICE.
   */
  price: number;
}

export interface CalService {
  id: string;
  /** Small uppercase label above the service name. */
  eyebrow: string;
  name: string;
  description: string;
  /**
   * The one-line answer to "which of these do I want?". The descriptions say
   * what a session is; this says who it is for, so the four are told apart at
   * a glance rather than read as four kinds of massage.
   */
  bestFor: string;
  durations: CalDuration[];
  /** Quiet bronze emphasis on the service card — border, glow, and badge. */
  featured?: boolean;
}

/**
 * The seven Cal.com event types, grouped into the four services they represent.
 * Three services are offered at two lengths; The Split is a single 30-minute
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
    bestFor:
      "When you are not sure what you need, or want a bit of everything.",
    durations: [
      {
        minutes: 60,
        slug: "obsidian",
        namespace: "obsidian",
        eventTypeId: 6637250,
        price: 180_00,
      },
      {
        minutes: 90,
        slug: "obsidian-copy",
        namespace: "obsidian-copy",
        eventTypeId: 6640200,
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
    bestFor:
      "When something specific hurts — a locked shoulder, a tight lower back.",
    durations: [
      {
        minutes: 60,
        slug: "the-forge",
        namespace: "the-forge",
        eventTypeId: 6640251,
        price: 165_00,
      },
      {
        minutes: 90,
        slug: "the-forge-copy",
        namespace: "the-forge-copy",
        eventTypeId: 6640308,
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
    bestFor:
      "When you do not want to be worked on. You want to switch off.",
    durations: [
      {
        minutes: 60,
        slug: "blackout-copy",
        namespace: "blackout-copy",
        eventTypeId: 6640690,
        price: 150_00,
      },
      {
        minutes: 90,
        slug: "blackout",
        namespace: "blackout",
        eventTypeId: 6640453,
        price: 210_00,
      },
    ],
  },
  {
    id: "the-split",
    eyebrow: "EXPRESS",
    name: "The Split",
    description:
      "Our shortest session. Focused, targeted work on the areas that need it most, for when time is tight.",
    bestFor:
      "When time is short, or one area needs attention and nothing else does.",
    durations: [
      {
        minutes: 30,
        slug: "the-split",
        namespace: "the-split",
        eventTypeId: 6640747,
        price: 95_00,
      },
    ],
  },
  {
    id: "couples-massage",
    eyebrow: "TOGETHER",
    name: "Couples Massage",
    description:
      "Two tables, one room, two therapists working at once. You and a partner or friend, massaged side by side.",
    bestFor:
      "When you want the room to yourself with someone else — a partner, a friend, anyone you'd rather not do this alone.",
    durations: [
      {
        minutes: 60,
        slug: "couples-massage",
        namespace: "couples-massage",
        eventTypeId: 6932688,
        price: 290_00,
      },
      {
        minutes: 90,
        slug: "couples-massage-90-min",
        namespace: "couples-massage-90-min",
        eventTypeId: 6932763,
        price: 390_00,
      },
    ],
  },
  {
    id: "four-handed",
    eyebrow: "FOUR HANDS",
    name: "Four-Handed Massage",
    description:
      "Two therapists on one table, moving in sync. Twice the hands, twice the coverage — the most intensive session we offer.",
    bestFor:
      "When one therapist isn't enough, or you just want the deepest, most complete session on the menu.",
    durations: [
      {
        minutes: 60,
        slug: "four-handed-60-min",
        namespace: "four-handed-60-min",
        eventTypeId: 6932771,
        price: 260_00,
      },
      {
        minutes: 90,
        slug: "four-handed-90-min",
        namespace: "four-handed-90-min",
        eventTypeId: 6932807,
        price: 360_00,
      },
    ],
  },
];

/**
 * Stripe is disabled on every event type in Cal.com, so booking asks for no
 * card and takes no payment. Said plainly, because "book now" often implies
 * paying now.
 */
export const PAYMENT_NOTICE =
  "No card is needed to book and nothing is charged online. Pay by card or cash at the spa after your session.";

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
