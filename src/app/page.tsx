import Link from "next/link";
import { SERVICES, formatPrice } from "@/lib/config/business-rules";

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="flex min-h-[80vh] flex-col items-center justify-center px-6 text-center">
        <p className="mb-4 text-sm tracking-[0.3em] text-gold">
          PREMIUM MEN&apos;S SPA
        </p>
        <h1 className="mb-6 text-5xl font-bold tracking-tight md:text-7xl">
          OBSIDIAN
        </h1>
        <p className="mb-10 max-w-lg text-lg leading-relaxed text-muted">
          A private, refined space designed for men who value discretion,
          quality, and genuine relaxation.
        </p>
        <div className="flex gap-4">
          <Link
            href="/booking"
            className="border border-gold bg-gold px-8 py-3 text-sm font-semibold tracking-wide text-background transition-colors hover:bg-gold-dark"
          >
            Book Now
          </Link>
          <Link
            href="/services"
            className="border border-charcoal-light px-8 py-3 text-sm tracking-wide text-muted transition-colors hover:border-gold hover:text-gold"
          >
            View Services
          </Link>
        </div>
      </section>

      {/* Services preview */}
      <section className="border-t border-charcoal-light px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <p className="mb-2 text-center text-sm tracking-[0.3em] text-gold">
            OUR SERVICES
          </p>
          <h2 className="mb-12 text-center text-3xl font-bold tracking-tight">
            Tailored Experiences
          </h2>

          <div className="grid gap-6 md:grid-cols-2">
            {SERVICES.map((service) => (
              <div
                key={service.id}
                className="border border-charcoal-light bg-charcoal p-8 transition-colors hover:border-gold/30"
              >
                <div className="mb-3 flex items-baseline justify-between">
                  <h3 className="text-lg font-semibold">{service.name}</h3>
                  <span className="text-gold">
                    {formatPrice(service.price)}
                  </span>
                </div>
                <p className="mb-4 text-sm leading-relaxed text-muted">
                  {service.description}
                </p>
                <p className="text-xs text-muted">{service.duration} minutes</p>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link
              href="/services"
              className="text-sm tracking-wide text-gold transition-colors hover:text-gold-light"
            >
              View all services & add-ons →
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-charcoal-light px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight">
            Ready to Unwind?
          </h2>
          <p className="mb-8 text-muted">
            Choose your therapist, pick your time, and let us handle the rest.
            Your card is kept securely on file — payment is collected only after
            your session.
          </p>
          <Link
            href="/booking"
            className="inline-block border border-gold bg-gold px-10 py-3 text-sm font-semibold tracking-wide text-background transition-colors hover:bg-gold-dark"
          >
            Book Your Session
          </Link>
        </div>
      </section>
    </>
  );
}
