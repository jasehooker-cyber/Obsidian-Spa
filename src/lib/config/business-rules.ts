export const BUSINESS = {
  name: "Obsidian Men's Spa",
  tagline: "Premium Men's Spa Experience",
  timezone: "America/New_York",

  hours: {
    open: "08:00",
    close: "22:00",
  },

  booking: {
    bufferMinutes: 20,
    minNoticeMinutes: 0,
    maxAdvanceDays: 7,
    allowSelfCancel: false,
    autoConfirm: true,
    cardOnFileRequired: true,
    paymentTiming: "after-service" as const,
  },

  fees: {
    lateCancelWindow: 2,
    lateCancelFee: 40_00,
    noShowPercent: 50,
  },

  therapistCount: 1,

  contact: {
    email: "booking@obsidianspas.com",
    phone: "(201) 540-8621",
  },

  address: {
    street: "850 7th Ave, Suite 1105",
    city: "New York",
    state: "NY",
    zip: "10019",
    neighborhood: "Midtown Manhattan",
  },
} as const;

/**
 * Cal.com account that hosts every booking calendar.
 * Public booking links are `cal.com/<CAL_USERNAME>/<service.calEventSlug>`.
 */
export const CAL_USERNAME = "jase-hooker-krkdwx";

export type BookingMode = "instant" | "request";

export type ServiceId =
  | "signature-60"
  | "signature-90"
  | "couples"
  | "four-handed";

export type AddOnId = "cbd" | "hot-stones" | "cupping";

export interface Service {
  id: ServiceId;
  name: string;
  duration: number;
  price: number;
  description: string;
  bookingMode: BookingMode;
  requiresMultipleTherapists: boolean;
  /** Cal.com event type this service books, so the calendar shows the right session */
  calEventTypeId: number;
  /** Slug half of the public Cal.com link: cal.com/<CAL_USERNAME>/<calEventSlug> */
  calEventSlug: string;
}

export interface AddOn {
  id: AddOnId;
  name: string;
  price: number;
}

export const SERVICES: Service[] = [
  {
    id: "signature-60",
    name: "60 Min Signature Massage",
    duration: 60,
    price: 150_00,
    description:
      "A focused, full-body massage tailored to your needs. Deep tissue, Swedish, or a custom blend.",
    bookingMode: "instant",
    requiresMultipleTherapists: false,
    calEventTypeId: 6071949,
    calEventSlug: "60-min-signature-massage",
  },
  {
    id: "signature-90",
    name: "90 Min Signature Massage",
    duration: 90,
    price: 210_00,
    description:
      "An extended session for complete relaxation. More time for targeted work on problem areas.",
    bookingMode: "instant",
    requiresMultipleTherapists: false,
    calEventTypeId: 6071948,
    calEventSlug: "90-min-signature-massage",
  },
  {
    id: "couples",
    name: "Couples Massage",
    duration: 60,
    price: 260_00,
    description:
      "A shared experience in our couples suite. Two therapists, side by side.",
    bookingMode: "instant",
    requiresMultipleTherapists: true,
    calEventTypeId: 6071950,
    calEventSlug: "couples-massage",
  },
  {
    id: "four-handed",
    name: "Four-Handed Massage",
    duration: 60,
    price: 260_00,
    description:
      "Two therapists work in synchronized harmony for a deeply immersive experience.",
    bookingMode: "instant",
    requiresMultipleTherapists: true,
    calEventTypeId: 6101697,
    calEventSlug: "four-handed-massage",
  },
];

export const ADD_ONS: AddOn[] = [
  { id: "cbd", name: "CBD", price: 30_00 },
  { id: "hot-stones", name: "Hot Stones", price: 30_00 },
  { id: "cupping", name: "Cupping", price: 30_00 },
];

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

/** The `username/slug` pair the Cal.com embed needs for a service. */
export function calLinkFor(service: Service): string {
  return `${CAL_USERNAME}/${service.calEventSlug}`;
}

/**
 * Map a Cal.com booking back to the service it belongs to. Cal.com only tells
 * us which event type was booked, so the event type id is our join key.
 */
export function serviceByCalEventTypeId(
  eventTypeId: number | null | undefined
): Service | undefined {
  if (eventTypeId == null) return undefined;
  return SERVICES.find((s) => s.calEventTypeId === eventTypeId);
}

/** Parse the comma-separated add-on list we pass through Cal.com metadata. */
export function parseAddOnIds(raw: unknown): AddOnId[] {
  if (typeof raw !== "string" || raw.length === 0) return [];
  const valid = new Set<string>(ADD_ONS.map((a) => a.id));
  return [...new Set(raw.split(","))]
    .map((id) => id.trim())
    .filter((id): id is AddOnId => valid.has(id));
}
