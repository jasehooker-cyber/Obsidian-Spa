/**
 * Cal.com team event types for Obsidian Men's Spa.
 *
 * Source of truth for the booking menu. Slugs, durations, and descriptions
 * mirror the event types configured on the Cal.com team `obsidian-spa`.
 * Changing a name here only changes the website copy — the Cal.com booking
 * screen shows whatever is set in the Cal.com dashboard.
 */

/** Cal.com team slug. Booking links are `team/<slug>/<event-slug>`. */
export const CAL_TEAM_SLUG = "obsidian-spa";

/**
 * Config handed to each click-to-open trigger. Matches the embed snippet Cal
 * generates: month grid on desktop, slot list on small screens.
 */
export const CAL_TRIGGER_CONFIG = JSON.stringify({
  layout: "month_view",
  useSlotsViewOnSmallScreen: "true",
});

export interface CalDuration {
  /** Session length in minutes, as configured in Cal.com. */
  minutes: number;
  /** Cal.com event type slug. */
  slug: string;
  /** Embed namespace — one per event type, matching Cal's generated snippets. */
  namespace: string;
}

export interface CalService {
  id: string;
  /** Small uppercase label above the service name. */
  eyebrow: string;
  name: string;
  description: string;
  durations: CalDuration[];
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
    eyebrow: "THE SIGNATURE",
    name: "Obsidian Signature Massage",
    description:
      "Our signature. Built around wherever you're sore. Swedish, deep tissue, and stretch blended to the body on the table that day.",
    durations: [
      { minutes: 60, slug: "obsidian", namespace: "obsidian" },
      { minutes: 90, slug: "obsidian-copy", namespace: "obsidian-copy" },
    ],
  },
  {
    id: "the-forge",
    eyebrow: "DEEP TISSUE",
    name: "The Forge",
    description:
      "Slow, heavy, deliberate pressure. For men who lift, sit, or carry stress in their back.",
    durations: [
      { minutes: 60, slug: "the-forge", namespace: "the-forge" },
      { minutes: 90, slug: "the-forge-copy", namespace: "the-forge-copy" },
    ],
  },
  {
    id: "blackout",
    eyebrow: "FULL BODY",
    name: "Blackout",
    description:
      "Long strokes, full body, prepare to fall asleep and experience true relaxation.",
    durations: [
      { minutes: 60, slug: "blackout-copy", namespace: "blackout-copy" },
      { minutes: 90, slug: "blackout", namespace: "blackout" },
    ],
  },
  {
    id: "the-split",
    eyebrow: "EXPRESS",
    name: "The Split",
    description:
      "A focused session for when time is short. Targeted work on the areas that need it most.",
    durations: [{ minutes: 45, slug: "the-split", namespace: "the-split" }],
  },
];

/** Every embed namespace on the page, for one-time UI theming on mount. */
export const CAL_NAMESPACES: string[] = CAL_SERVICES.flatMap((service) =>
  service.durations.map((duration) => duration.namespace)
);

/** Builds the `data-cal-link` value for a team event type. */
export function calLink(slug: string): string {
  return `team/${CAL_TEAM_SLUG}/${slug}`;
}
