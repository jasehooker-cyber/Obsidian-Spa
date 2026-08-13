import { ADD_ONS, BUSINESS, formatPrice } from "@/lib/config/business-rules";
import CalBookingMenu from "@/components/booking/CalBookingMenu";

export const metadata = {
  title: "Services & Pricing",
  description:
    "Signature, deep tissue, full body, and express massages for men, from $100. 45, 60, and 90 minute sessions in Midtown Manhattan. Book online.",
  alternates: { canonical: "/services" },
};

export default function ServicesPage() {
  return (
    <>
      {/* Header */}
      <section className="noise-overlay relative overflow-hidden px-6 pb-16 pt-24 text-center">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(201,168,76,0.06)_0%,transparent_60%)]" />
        <p className="animate-fade-up relative mb-3 text-sm tracking-[0.4em] text-gold">
          WHAT WE OFFER
        </p>
        <h1 className="animate-fade-up-delay-1 relative mb-4 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
          Services
        </h1>
        <div className="gold-divider animate-fade-up-delay-2 relative mx-auto mb-6">
          <span className="text-xs text-gold/60">&#9670;</span>
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

      {/* Add-ons */}
      <section className="relative px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <p className="mb-3 text-sm tracking-[0.4em] text-gold">
            ENHANCEMENTS
          </p>
          <h2 className="mb-2 text-3xl font-bold tracking-tight">Add-Ons</h2>
          <div className="gold-divider mb-4 justify-start">
            <span className="text-xs text-gold/60">&#9670;</span>
          </div>
          <p className="mb-10 max-w-xl text-sm leading-relaxed text-muted">
            Added to any session — just ask your therapist when you arrive.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {ADD_ONS.map((addon) => (
              <div key={addon.id} className="luxury-card group p-8 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-gold/20 transition-all duration-300 group-hover:border-gold/50 group-hover:shadow-[0_0_16px_rgba(201,168,76,0.1)]">
                  <span className="text-lg text-gold">+</span>
                </div>
                <h3 className="mb-2 text-lg font-semibold tracking-wide">
                  {addon.name}
                </h3>
                <p className="text-gold-gradient font-bold">
                  {formatPrice(addon.price)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Policies */}
      <section className="relative px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-8 text-2xl font-bold tracking-tight">
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
                text: `Cancellations within ${BUSINESS.fees.lateCancelWindow} hours of your appointment are charged to the card on file.`,
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
