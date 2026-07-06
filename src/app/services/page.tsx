import Link from "next/link";
import {
  SERVICES,
  ADD_ONS,
  BUSINESS,
  formatPrice,
} from "@/lib/config/business-rules";

export const metadata = {
  title: "Services & Pricing",
  description:
    "60 and 90 minute signature massages from $150, couples massage, four-handed massage, and luxury add-ons like CBD, hot stones, and cupping. Midtown Manhattan, book online.",
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
          Every session is tailored to you. Choose your service, select your
          therapist, and add enhancements to create your ideal experience.
        </p>
      </section>

      {/* Services */}
      <section className="section-glow relative px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <div className="flex flex-col gap-6">
            {SERVICES.map((service, i) => (
              <div
                key={service.id}
                className="luxury-card group flex flex-col justify-between gap-6 p-8 md:flex-row md:items-center"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="flex-1">
                  <h2 className="mb-2 text-xl font-semibold tracking-wide transition-colors duration-300 group-hover:text-gold">
                    {service.name}
                  </h2>
                  <p className="mb-3 text-sm leading-relaxed text-muted">
                    {service.description}
                  </p>
                  <p className="text-xs tracking-wider text-muted/60">
                    {service.duration} MINUTES
                  </p>
                </div>
                <div className="flex items-center gap-6">
                  <span className="text-gold-gradient text-2xl font-bold">
                    {formatPrice(service.price)}
                  </span>
                  <Link
                    href="/booking"
                    className="whitespace-nowrap border border-gold px-6 py-2.5 text-xs font-semibold tracking-widest text-gold transition-all duration-300 hover:bg-gold hover:text-background hover:shadow-[0_0_16px_rgba(201,168,76,0.2)]"
                  >
                    BOOK
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Add-ons */}
      <section className="relative px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <p className="mb-3 text-sm tracking-[0.4em] text-gold">
            ENHANCEMENTS
          </p>
          <h2 className="mb-2 text-3xl font-bold tracking-tight">Add-Ons</h2>
          <div className="gold-divider mb-10 justify-start">
            <span className="text-xs text-gold/60">&#9670;</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {ADD_ONS.map((addon) => (
              <div
                key={addon.id}
                className="luxury-card group p-8 text-center"
              >
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
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-8 text-2xl font-bold tracking-tight">
            Booking Policies
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {[
              {
                title: "Card on File",
                text: "A valid card is required to book. Payment is collected after your session.",
              },
              {
                title: "Cancellation",
                text: `Cancellations within ${BUSINESS.fees.lateCancelWindow} hours of your appointment incur a ${formatPrice(BUSINESS.fees.lateCancelFee)} fee.`,
              },
              {
                title: "No-Show",
                text: `Missed appointments without notice are charged ${BUSINESS.fees.noShowPercent}% of the booked service price.`,
              },
              {
                title: "Changes",
                text: "To cancel or reschedule, please contact us directly.",
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
