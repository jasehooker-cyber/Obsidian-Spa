import { BUSINESS, formatPrice } from "@/lib/config/business-rules";
import CalBookingMenu from "@/components/booking/CalBookingMenu";
import { CAL_SERVICES } from "@/lib/config/cal-events";
import { ACUPUNCTURE_SERVICES } from "@/lib/config/acupuncture";
import { waitlistHref } from "@/lib/waitlist";

export const metadata = {
  title: "Services & Pricing — Gay Men's Massage NYC",
  description:
    "Gay men's massage in Midtown Manhattan — signature, deep tissue, restorative, and express sessions from $95, plus acupuncture. Male therapists. Book online.",
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
          Massage, and one-to-one acupuncture. Pick a massage below to see
          live availability and book on the spot.
        </p>
      </section>

      {/* Massage — same live menu as the booking page */}
      <section className="section-glow relative px-6 py-16">
        <div className="mx-auto mb-10 max-w-5xl text-center">
          <p className="font-display text-sm tracking-[0.4em] text-gold">
            MASSAGE
          </p>
        </div>
        <CalBookingMenu />
      </section>

      {/* Acupuncture — full TCM consultations, not yet bookable in Cal.com */}
      <section className="relative px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 text-center">
            <p className="font-display mb-3 text-sm tracking-[0.4em] text-gold">
              ACUPUNCTURE
            </p>
            <h2 className="font-display mb-4 text-2xl uppercase tracking-[0.12em] md:text-3xl">
              Traditional Chinese Medicine
            </h2>
            <p className="mx-auto max-w-lg text-sm leading-relaxed text-muted">
              A full consultation, not just needles — we check in on what&apos;s
              going on with you and prescribe herbs if they&apos;re called
              for.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {ACUPUNCTURE_SERVICES.map((service, i) => (
              <article
                key={service.id}
                className="luxury-card animate-fade-up group flex flex-col p-8"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <p className="font-display mb-3 text-[11px] tracking-[0.3em] text-gold/70">
                  {service.eyebrow}
                </p>
                <div className="mb-3 flex items-baseline justify-between gap-4">
                  <h3 className="text-xl font-semibold tracking-wide transition-colors duration-300 group-hover:text-gold">
                    {service.name}
                  </h3>
                  <span className="text-gold-gradient shrink-0 text-xl font-bold">
                    {formatPrice(service.price)}
                  </span>
                </div>
                <p className="mb-4 text-sm leading-relaxed text-muted">
                  {service.description}
                </p>
                <p className="mb-6 flex-1 border-l-2 border-gold/25 py-0.5 pl-4 text-sm leading-relaxed text-foreground/75">
                  {service.bestFor}
                </p>
                <p className="mb-6 text-xs tracking-wider text-muted/60">
                  {service.duration.toUpperCase()}
                </p>
                <a
                  href={waitlistHref(service)}
                  className="self-start border border-gold/30 px-6 py-3 text-xs font-semibold tracking-widest text-gold/90 transition-all duration-300 hover:border-gold hover:text-gold"
                >
                  JOIN THE LIST &rarr;
                </a>
              </article>
            ))}
          </div>
          <p className="mt-6 text-sm leading-relaxed text-muted">
            Not bookable online yet — join the list and we&apos;ll reach out
            directly to schedule, or call{" "}
            <a
              href={`tel:${BUSINESS.contact.phone.replace(/[^\d+]/g, "")}`}
              className="text-gold transition-colors hover:text-gold-light"
            >
              {BUSINESS.contact.phone}
            </a>
            .
          </p>
        </div>
      </section>

      {/* Choosing between them — the question people actually arrive with */}
      <section className="relative px-6 py-12">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-display mb-3 text-2xl uppercase tracking-[0.12em]">
            Which Massage?
          </h2>
          <p className="mb-10 max-w-2xl text-sm leading-relaxed text-muted">
            Signature, The Forge, Blackout, and The Split are full-body massage
            by the same licensed therapists — what changes is the pressure,
            the tools (hot stones, essential oils, stretching), and the
            intent, whether the aim is to fix something or to switch you off.
            Couples Massage and Four-Handed change who is in the room: a
            partner alongside you, or a second therapist working with the
            first.
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
                title: "Payment",
                text: "No card is needed to book and nothing is charged online. Pay by card or cash at the spa after your session.",
              },
              {
                title: "Cancellation",
                text: `Plans change — just let us know at least ${BUSINESS.fees.lateCancelWindowMinutes} minutes before your appointment so we can offer the time to someone else.`,
              },
              {
                title: "Running Late",
                text: "Call ahead if you are delayed. We will fit in what we can, though the session may be shortened if the next booking is close behind.",
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
