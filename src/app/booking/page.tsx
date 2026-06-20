import { SERVICES, ADD_ONS } from "@/lib/config/business-rules";
import BookingFlow from "@/components/booking/BookingFlow";

export const metadata = {
  title: "Book Now | Obsidian Men's Spa",
  description: "Choose your therapist and book your session online.",
};

// TODO: fetch therapists from Supabase once database is connected
const PLACEHOLDER_THERAPISTS = [
  { id: "00000000-0000-0000-0000-000000000001", name: "Alex" },
  { id: "00000000-0000-0000-0000-000000000002", name: "Jordan" },
  { id: "00000000-0000-0000-0000-000000000003", name: "Morgan" },
  { id: "00000000-0000-0000-0000-000000000004", name: "Taylor" },
  { id: "00000000-0000-0000-0000-000000000005", name: "Casey" },
];

export default function BookingPage() {
  return (
    <>
      <section className="px-6 pb-12 pt-20 text-center">
        <p className="mb-2 text-sm tracking-[0.3em] text-gold">RESERVATIONS</p>
        <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">
          Book Your Session
        </h1>
        <p className="mx-auto max-w-lg text-muted">
          Select a service, choose your therapist, and pick an available time. A
          card on file is required to secure your booking.
        </p>
      </section>

      <section className="border-t border-charcoal-light px-6 py-16">
        <BookingFlow
          services={SERVICES}
          addOns={ADD_ONS}
          therapists={PLACEHOLDER_THERAPISTS}
        />
      </section>
    </>
  );
}
