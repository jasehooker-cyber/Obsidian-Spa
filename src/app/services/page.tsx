import { BUSINESS } from "@/lib/config/business-rules";
import CalBookingMenu from "@/components/booking/CalBookingMenu";
import { CAL_SERVICES } from "@/lib/config/cal-events";

export const metadata = {
  title: "Services & Pricing — Gay Men's Massage NYC",
  description:
    "Gay men's massage in Midtown Manhattan — signature, deep tissue, restorative, and express sessions from $100. Male therapists, 30, 60, and 90 minutes. Book online.",
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

      {/* Choosing between them — the question people actually arrive with */}
      <section className="relative px-6 py-12">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-display mb-3 text-2xl uppercase tracking-[0.12em]">
            Which One?
          </h2>
          <p className="mb-10 max-w-2xl text-sm leading-relaxed text-muted">
            All four are full-body massage by the same licensed therapists. What
            changes is the pressure and the intent — how hard we work, and
            whether the aim is to fix something or to switch you off.
          </p>
          <div className="flex flex-col gap-px overflow-hidden border border-charcoal-light bg-charcoal-light">
            {CAL_SERVICES.map((service) => (
              <div
                key={service.id}
                className="grid gap-2 bg-background/95 p-6 md:grid-cols-[minmax(0,14rem)_1fr] md:items-baseline md:gap-8"
              >
                <div>
                  <p className="font-display text-[10px] tracking-[0.3em] text-gold/70">
                    {service.eyebrow}
                  </p>
                  <p className="mt-1 font-semibold tracking-wide text-foreground">
                    {service.name}
                  </p>
                  <p className="mt-1 text-xs tracking-wider text-muted/60">
                    {service.durations
                      .map((duration) => `${duration.minutes} MIN`)
                      .join(" · ")}
                  </p>
                </div>
                <p className="text-sm leading-relaxed text-muted">
                  {service.bestFor}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm leading-relaxed text-muted">
            Still unsure? Book the Signature and tell your therapist what hurts
            — it is built to adapt.
          </p>
        </div>
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
