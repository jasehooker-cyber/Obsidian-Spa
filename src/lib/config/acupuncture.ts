/**
 * One-to-one acupuncture, private room, on the treatment side of the site —
 * distinct from the "Group Acupuncture" studio class in events.ts, which is
 * the cheaper, communal version of this.
 *
 * No Cal.com event type exists for either of these yet (checked against the
 * live team page before writing this file), so `calSlug` is left unset and
 * the page collects interest by email instead of opening a live calendar.
 * Set `calSlug` once the event type exists in Cal.com and the card becomes
 * bookable — same pattern as SpaEvent in events.ts.
 */

export interface AcupunctureService {
  id: string;
  /** Small uppercase label above the name. */
  eyebrow: string;
  name: string;
  description: string;
  /** The one-line answer to "which of these do I want?" */
  bestFor: string;
  duration: string;
  /** Price in cents. */
  price: number;
  calSlug?: string;
}

export const ACUPUNCTURE_SERVICES: AcupunctureService[] = [
  {
    id: "acupuncture",
    eyebrow: "TRADITIONAL",
    name: "Acupuncture",
    description:
      "A full Traditional Chinese Medicine consultation. We check in on what's actually going on with you, needle accordingly, and prescribe herbs if they're called for.",
    bestFor:
      "When you want a real TCM workup — not just needles, a look at the whole picture.",
    duration: "60 minutes",
    price: 180_00,
  },
  {
    id: "electro-acupuncture",
    eyebrow: "ELECTRO",
    name: "Electro-Acupuncture",
    description:
      "The same full consultation, needling, and herbal prescription as Acupuncture, with a light electrical pulse added so the muscle keeps working through the session rather than sitting at rest.",
    bestFor:
      "When you want more active stimulation on top of the full workup — often used for deeper muscle or nerve-related tension.",
    duration: "60 minutes",
    price: 200_00,
  },
];

/** True once either service has a real Cal.com event type behind it. */
export const HAS_BOOKABLE_ACUPUNCTURE = ACUPUNCTURE_SERVICES.some(
  (service) => service.calSlug
);
