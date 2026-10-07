import type { CalService } from "@/lib/config/cal-events";

/**
 * One-to-one acupuncture, shown in its own section on the Services page
 * rather than in the massage menu. Same shape as CAL_SERVICES, so booking,
 * conversion pricing and CRM matching treat it like any other service.
 *
 * Distinct from the "Group Acupuncture" studio class in events.ts, which is
 * the cheaper, communal version of this.
 */
export const ACUPUNCTURE_SERVICES: CalService[] = [
  {
    id: "acupuncture",
    eyebrow: "TRADITIONAL",
    name: "Acupuncture",
    description:
      "A full Traditional Chinese Medicine consultation. We check in on what's actually going on with you, needle accordingly, and prescribe herbs if they're called for.",
    bestFor:
      "When you want a real TCM workup — not just needles, a look at the whole picture.",
    durations: [
      {
        minutes: 60,
        slug: "tcm-60-min",
        namespace: "tcm-60-min",
        eventTypeId: 7388978,
        price: 180_00,
      },
    ],
  },
];
