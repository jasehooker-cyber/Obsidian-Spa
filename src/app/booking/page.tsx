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
      <section className="noise-overlay relative overflow-hidden px-6 pb-16 pt-28 text-center">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(201,168,76,0.06)_0%,transparent_60%)]" />
        <p className="animate-fade-up relative mb-3 text-sm tracking-[0.4em] text-gold">
          RESERVATIONS
        </p>
        <h1 className="animate-fade-up-delay-1 relative mb-4 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
          Book Your Session
        </h1>
        <div className="gold-divider animate-fade-up-delay-2 relative mx-auto mb-6">
          <span className="text-xs text-gold/60">&#9670;</span>
        </div>
        <p className="animate-fade-up-delay-2 relative mx-auto max-w-lg text-lg text-muted">
          Select a service, pick an available time, and you&apos;re all set. A
          card on file is required to secure your booking.
        </p>
      </section>

      <section className="section-glow relative px-6 py-16">
        <BookingFlow
          services={SERVICES}
          addOns={ADD_ONS}
          therapists={therapists ?? []}
        />
      </section>
    </>
  );
}
