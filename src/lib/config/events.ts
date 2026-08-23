/**
 * Group programming held in the studio room.
 *
 * Separate from CAL_SERVICES, which covers one-to-one massage on the treatment
 * tables. These are scheduled sessions for a group, so they run on dates rather
 * than open availability.
 *
 * Each offering carries a `calSlug` once an event type exists for it in
 * Cal.com; until then the card invites interest instead of booking, so the page
 * is honest about what can actually be reserved today.
 */

export type EventStatus = "open" | "planned";

export interface SpaEvent {
  id: string;
  /** Small uppercase label above the name. */
  eyebrow: string;
  name: string;
  description: string;
  /** Who it is for and how many — shown under the name. */
  format: string;
  /** Session length, as it would be scheduled. */
  duration: string;
  /**
   * Price per person in cents. Left undefined while an offering is still being
   * priced, which is why the card shows nothing rather than a placeholder.
   */
  price?: number;
  /**
   * Cal.com event type slug on the `obsidian-spa` team. Set this and the card
   * becomes bookable; leave it off and the card collects interest instead.
   */
  calSlug?: string;
  status: EventStatus;
}

export const SPA_EVENTS: SpaEvent[] = [
  {
    id: "yoga",
    eyebrow: "MOVEMENT",
    name: "Yoga",
    description:
      "Slow, strength-led practice with no mirrors and no performance. Built for stiff hips, tight shoulders, and men who have been told to stretch for years and never started.",
    format: "Group class",
    duration: "60 minutes",
    status: "planned",
  },
  {
    id: "group-acupuncture",
    eyebrow: "RECOVERY",
    name: "Group Acupuncture",
    description:
      "Community-style sessions in the quiet of the studio. Recline, get needled, and let an hour pass. An accessible way into acupuncture without a private-room price.",
    format: "Group session",
    duration: "60 minutes",
    status: "planned",
  },
  {
    id: "couples-massage-workshop",
    eyebrow: "WORKSHOP",
    name: "Couples Massage Class",
    description:
      "Learn to work on each other properly. Our therapists teach pressure, pacing, and the handful of techniques that actually help — so you leave able to do this at home.",
    format: "Taught in pairs",
    duration: "90 minutes",
    status: "planned",
  },
];

/** True once anything on the calendar can actually be reserved online. */
export const HAS_BOOKABLE_EVENT = SPA_EVENTS.some(
  (event) => event.status === "open" && event.calSlug
);
