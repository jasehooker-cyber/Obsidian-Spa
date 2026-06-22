import { SERVICES, ADD_ONS } from "@/lib/config/business-rules";
import { supabaseServer } from "@/lib/supabase/server";
import BookingFlow from "@/components/booking/BookingFlow";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Book Now | Obsidian Men's Spa",
  description: "Choose your therapist and book your session online.",
};

export default async function BookingPage() {
  const supabase = supabaseServer();
  const { data: therapists } = await supabase
    .from("therapists")
    .select("id, name")
    .eq("active", true)
    .order("name");

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
          therapists={therapists ?? []}
        />
      </section>
    </>
  );
}
