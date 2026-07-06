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
    email: "info@obsidianspas.com",
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
