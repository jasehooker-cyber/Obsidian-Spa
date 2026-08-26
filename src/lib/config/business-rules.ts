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
    cardOnFileRequired: false,
    paymentTiming: "after-service" as const,
  },

  fees: {
    // Notice we ask for before an appointment. No card is held any more, so
    // nothing here is charged automatically — the fees below remain only for
    // the admin tools, which act on legacy bookings that do have a card.
    lateCancelWindowMinutes: 30,
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

export type AddOnId = "cbd" | "hot-stones" | "cupping";

export interface AddOn {
  id: AddOnId;
  name: string;
  price: number;
}

/**
 * No longer offered — removed from the site. Kept only so bookings recorded
 * before the change still render their add-ons correctly in emails.
 */
export const ADD_ONS: AddOn[] = [
  { id: "cbd", name: "CBD", price: 30_00 },
  { id: "hot-stones", name: "Hot Stones", price: 30_00 },
  { id: "cupping", name: "Cupping", price: 30_00 },
];

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}
