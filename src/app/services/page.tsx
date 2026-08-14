import { BUSINESS } from "@/lib/config/business-rules";
import EnsoMark from "@/components/EnsoMark";
import CalBookingMenu from "@/components/booking/CalBookingMenu";

export const metadata = {
  title: "Services & Pricing",
  description:
    "Signature, deep tissue, restorative, and express massages for men, from $100. 45, 60, and 90 minute sessions in Midtown Manhattan. Book online.",
  alternates: { canonical: "/services" },
};

export default function ServicesPage() {
  return (
    <>
      {/* Header */}
      <section className="noise-overlay relative overflow-hidden px-6 pb-16 pt-24 text-center">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(187,145,89,0.06)_0%,transparent_60%)]" />
        <p className="font-display animate-fade-up relative mb-3 text-sm tracking-[0.4em] text-gold">
          WHAT WE OFFER
        </p>
        <h1 className="font-display animate-fade-up-delay-1 relative mb-4 text-3xl uppercase tracking-[0.15em] md:text-4xl lg:text-5xl">
          Services
        </h1>
        <div className="gold-divider animate-fade-up-delay-2 relative mx-auto mb-6">
          <EnsoMark size={15} className="opacity-70" />
        </div>
        <p className="animate-fade-up-delay-2 relative mx-auto max-w-lg text-lg text-muted">
          Four sessions, each at the length that suits you. Pick one to see live
          availability and book on the spot.
        </p>
      </section>

      {/* Services — same live menu as the booking page */}
      <section className="section-glow relative px-6 py-16">
        <CalBookingMenu />
      </section>

      {/* Policies */}
      <section className="relative px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-display mb-8 text-2xl uppercase tracking-[0.12em]">
            Booking Policies
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {[
              {
                title: "Card Hold",
                text: "Booking places a hold on your card. You are not charged online — payment is taken after your session.",
              },
              {
                title: "Cancellation",
                text: `Cancel any time up to ${BUSINESS.fees.lateCancelWindowMinutes} minutes before your appointment, free of charge. Inside that window, the card on file is charged.`,
              },
              {
                title: "No-Show",
                text: "Missed appointments without notice are charged to the card on file.",
              },
              {
                title: "Changes",
                text: "To cancel or reschedule, use the link in your confirmation email or contact us directly.",
              },
            ].map((policy) => (
              <div
                key={policy.title}
                className="border-l-2 border-gold/20 py-1 pl-5"
              >
                <h3 className="mb-1.5 text-sm font-semibold tracking-wide text-foreground">
                  {policy.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted">
                  {policy.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
