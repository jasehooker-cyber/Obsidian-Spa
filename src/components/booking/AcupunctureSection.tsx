import { formatPrice } from "@/lib/config/business-rules";
import { basePrice } from "@/lib/config/cal-events";
import { ACUPUNCTURE_SERVICES } from "@/lib/config/acupuncture";
import CalDurationButton from "@/components/booking/CalDurationButton";

/**
 * Acupuncture, in its own section beneath the massage menu. Its buttons rely
 * on the Cal embed set up by CalBookingMenu on the same page.
 */
export default function AcupunctureSection() {
  return (
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
            going on with you and prescribe herbs if they&apos;re called for.
          </p>
        </div>
        <div className="mx-auto grid max-w-lg gap-6">
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
                  {formatPrice(basePrice(service))}
                </span>
              </div>
              <p className="mb-8 flex-1 text-sm leading-relaxed text-muted">
                {service.description}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                {service.durations.map((duration) => (
                  <CalDurationButton
                    key={duration.slug}
                    serviceName={service.name}
                    duration={duration}
                  />
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
