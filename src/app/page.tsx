import Link from "next/link";
import { SERVICES, formatPrice, BUSINESS } from "@/lib/config/business-rules";
import { formatTime } from "@/lib/config/format";

export const metadata = {
  alternates: { canonical: "/" },
};

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="noise-overlay relative flex min-h-[90vh] flex-col items-center justify-center overflow-hidden px-6 text-center">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(201,168,76,0.08)_0%,transparent_60%)]" />
        <div className="pointer-events-none absolute top-1/4 left-1/2 h-[500px] w-[800px] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(ellipse,rgba(201,168,76,0.05)_0%,transparent_70%)] blur-3xl" />

        <p className="animate-fade-up mb-6 text-sm tracking-[0.4em] text-gold">
          PREMIUM MEN&apos;S SPA
        </p>
        <h1 className="text-gold-gradient animate-fade-up-delay-1 mb-2 text-6xl font-bold tracking-tight md:text-8xl lg:text-9xl">
          OBSIDIAN
        </h1>
        <div className="animate-expand-line mx-auto mb-8 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
        <p className="animate-fade-up-delay-2 mb-12 max-w-lg text-lg leading-relaxed text-muted">
          A private, refined space designed for men who value quality,
          comfort, and genuine relaxation.
        </p>
        <div className="animate-fade-up-delay-3 flex gap-4">
          <Link
            href="/booking"
            className="btn-glow relative border border-gold bg-gold px-10 py-3.5 text-sm font-semibold tracking-widest text-background transition-all duration-300 hover:bg-gold-dark hover:shadow-[0_0_24px_rgba(201,168,76,0.25)]"
          >
            BOOK NOW
          </Link>
          <Link
            href="/services"
            className="border border-charcoal-light px-10 py-3.5 text-sm tracking-widest text-muted transition-all duration-300 hover:border-gold/50 hover:text-gold"
          >
            SERVICES
          </Link>
        </div>

        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* Services preview */}
      <section className="section-glow relative px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="animate-fade-up mb-4 text-center">
            <p className="mb-3 text-sm tracking-[0.4em] text-gold">
              OUR SERVICES
            </p>
            <h2 className="mb-3 text-3xl font-bold tracking-tight md:text-4xl">
              Tailored Experiences
            </h2>
            <div className="gold-divider mx-auto mb-12">
              <span className="text-xs text-gold/60">&#9670;</span>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {SERVICES.map((service, i) => (
              <div
                key={service.id}
                className="luxury-card group p-8"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold tracking-wide transition-colors duration-300 group-hover:text-gold">
                      {service.name}
                    </h3>
                    <p className="mt-1 text-xs tracking-wider text-muted">
                      {service.duration} MINUTES
                    </p>
                  </div>
                  <span className="text-gold-gradient text-xl font-bold">
                    {formatPrice(service.price)}
                  </span>
                </div>
                <p className="mb-5 text-sm leading-relaxed text-muted">
                  {service.description}
                </p>
                <div className="h-px w-full bg-gradient-to-r from-charcoal-light via-gold/20 to-charcoal-light transition-all duration-500 group-hover:via-gold/40" />
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/services"
              className="group inline-flex items-center gap-2 text-sm tracking-widest text-gold transition-all duration-300 hover:text-gold-light"
            >
              VIEW ALL SERVICES
              <span className="transition-transform duration-300 group-hover:translate-x-1">
                &rarr;
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Experience strip */}
      <section className="relative overflow-hidden border-y border-charcoal-light px-6 py-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(201,168,76,0.04)_0%,transparent_70%)]" />
        <div className="relative mx-auto grid max-w-4xl gap-8 text-center md:grid-cols-3">
          {[
            { value: "Certified", label: "Expert Therapist" },
            { value: `${formatTime(BUSINESS.hours.open)} – ${formatTime(BUSINESS.hours.close)}`, label: "Open Daily" },
            { value: "100%", label: "Private & Discreet" },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-gold-gradient mb-1 text-2xl font-bold md:text-3xl">
                {stat.value}
              </p>
              <p className="text-sm tracking-wider text-muted">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="section-glow relative px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <div className="gold-divider mx-auto mb-8">
            <span className="text-xs text-gold/60">&#9670;</span>
          </div>
          <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
            Ready to Unwind?
          </h2>
          <p className="mb-10 text-lg leading-relaxed text-muted">
            Choose your therapist, pick your time, and let us handle the rest.
            Your card is kept securely on file — payment is collected only after
            your session.
          </p>
          <Link
            href="/booking"
            className="btn-glow relative inline-block border border-gold bg-gold px-12 py-4 text-sm font-semibold tracking-widest text-background transition-all duration-300 hover:bg-gold-dark hover:shadow-[0_0_24px_rgba(201,168,76,0.25)]"
          >
            BOOK YOUR SESSION
          </Link>
        </div>
      </section>
    </>
  );
}
