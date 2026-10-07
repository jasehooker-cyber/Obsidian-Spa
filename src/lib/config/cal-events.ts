/**
 * Cal.com team event types for Obsidian Spa.
 *
 * Source of truth for the booking menu. Slugs, durations, and descriptions
 * mirror the event types configured on the Cal.com team `obsidian-spa`.
 * Changing a name here only changes the website copy — the Cal.com booking
 * screen shows whatever is set in the Cal.com dashboard.
 */

import { ACUPUNCTURE_SERVICES } from "@/lib/config/acupuncture";

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
   * The one-line answer to "which of these do I want?", shown in the Services
   * page comparison table. Optional: a service without one is left out of that
   * table rather than given invented copy.
   */
  bestFor?: string;
  durations: CalDuration[];
  /** Quiet bronze emphasis on the service card — border, glow, and badge. */
  featured?: boolean;
  /** The service's own page, when it has one; the menu card links to it. */
  href?: string;
}

/**
 * The bookable menu, in display order.
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
      "Our signature. Hot stones and essential oils to open the body, then deep, deliberate work and stretching blended to wherever you're sore — pressure, heat, and movement in one session.",
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
    // Shown as Herbal Renewal; the id stays `kiln` because the CRM stores it
    // on every synced visit.
    id: "kiln",
    eyebrow: "SIGNATURE RITUAL",
    name: "Herbal Renewal",
    href: "/services/herbal-renewal",
    description:
      "An exfoliating scrub, steamed herbal compresses along the spine, a warm cocoon of herbal towels, head and scalp massage, then slow, deep oil bodywork. Heat, cedar, stone and stillness.",
    // Herbal Renewal lives on the two event types that used to be The Forge, so the
    // slugs still read `the-forge`. Rename them in Cal.com only together with
    // a change here — the ids would survive a rename, the slugs would not.
    durations: [
      {
        minutes: 75,
        slug: "the-forge",
        namespace: "the-forge",
        eventTypeId: 6640251,
        price: 220_00,
      },
      {
        minutes: 90,
        slug: "the-forge-copy",
        namespace: "the-forge-copy",
        eventTypeId: 6640308,
        price: 280_00,
      },
    ],
  },
  {
    id: "blackout",
    eyebrow: "RESTORATIVE",
    name: "Blackout",
    description:
      "The classic spa treatment. Warm essential oils, a hot towel wipe-down, and a facial steam, worked in slow and unhurried — most men are asleep long before the halfway mark.",
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
 * Names the CRM sync must recognise beyond the current menu: services taken
 * off the website but still on past calendar events, and the titles Cal.com
 * gives bookings when they differ from the website name. Never rendered — so a
 * visit keeps its menu price instead of going unrecorded on re-sync.
 */
export const RETIRED_SERVICES: CalService[] = [
  {
    // Cal.com titles Acupuncture bookings "TCM (60 min)".
    id: "acupuncture",
    eyebrow: "TRADITIONAL",
    name: "TCM",
    description: "",
    durations: ACUPUNCTURE_SERVICES[0].durations,
  },
  {
    // Herbal Renewal's launch name. Cal.com titles its bookings "Kiln (75
    // min)" until the event types are renamed there, so the CRM must still
    // recognise it — same id, so those visits land on the same service.
    id: "kiln",
    eyebrow: "SIGNATURE RITUAL",
    name: "Kiln",
    description: "",
    durations: [
      {
        minutes: 75,
        slug: "the-forge",
        namespace: "the-forge",
        eventTypeId: 6640251,
        price: 220_00,
      },
      {
        minutes: 90,
        slug: "the-forge-copy",
        namespace: "the-forge-copy",
        eventTypeId: 6640308,
        price: 280_00,
      },
    ],
  },
  {
    // Its Cal.com event types now carry Herbal Renewal; these ids are historical and
    // nothing looks them up — retired services are matched by name only.
    id: "the-forge",
    eyebrow: "DEEP TISSUE",
    name: "The Forge",
    description: "",
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
    id: "the-split",
    eyebrow: "EXPRESS",
    name: "The Split",
    description: "",
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
];

/**
 * Stripe is disabled on every event type in Cal.com, so booking asks for no
 * card and takes no payment. Said plainly, because "book now" often implies
 * paying now.
 */
export const PAYMENT_NOTICE =
  "No card is needed to book and nothing is charged online. Pay by card or cash at the spa after your session, and please bring a cash tip of 20% of your service.";

/** Lowest price across a service's lengths, for the “from” price on its card. */
export function basePrice(service: CalService): number {
  return Math.min(...service.durations.map((duration) => duration.price));
}

/**
 * Everything bookable online: the massage menu plus acupuncture, which has its
 * own section on the Services page. Booking setup, conversion pricing and CRM
 * matching all work from this list.
 */
export const BOOKABLE_SERVICES: CalService[] = [
  ...CAL_SERVICES,
  ...ACUPUNCTURE_SERVICES,
];

/** Every embed namespace on the page, for one-time UI theming on mount. */
export const CAL_NAMESPACES: string[] = BOOKABLE_SERVICES.flatMap((service) =>
  service.durations.map((duration) => duration.namespace)
);

/** Builds the `data-cal-link` value for a team event type. */
export function calLink(slug: string): string {
  return `team/${CAL_TEAM_SLUG}/${slug}`;
}
