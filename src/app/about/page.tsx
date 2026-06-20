import Link from "next/link";
import { BUSINESS } from "@/lib/config/business-rules";
import { formatTime } from "@/lib/config/format";

export const metadata = {
  title: "About | Obsidian Men's Spa",
  description:
    "A private, refined spa experience built for men who value discretion and quality.",
};

export default function AboutPage() {
  return (
    <>
      {/* Header */}
      <section className="px-6 pb-12 pt-20 text-center">
        <p className="mb-2 text-sm tracking-[0.3em] text-gold">WHO WE ARE</p>
        <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">
          About Obsidian
        </h1>
      </section>

      {/* Story */}
      <section className="border-t border-charcoal-light px-6 py-16">
        <div className="mx-auto max-w-3xl space-y-6 text-lg leading-relaxed text-muted">
          <p>
            Obsidian Men&apos;s Spa was built on a simple idea: men deserve a
            space that&apos;s private, professional, and unapologetically
            premium.
          </p>
          <p>
            No frills. No gimmicks. Just skilled therapists, a refined
            environment, and a booking experience that respects your time.
          </p>
          <p>
            Every detail — from the therapists we hire to the way we handle
            payments — is designed to be seamless. You pick your therapist, book
            a time that works, and walk in knowing everything is handled.
          </p>
        </div>
      </section>

      {/* Values */}
      <section className="border-t border-charcoal-light px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-10 text-center text-3xl font-bold tracking-tight">
            What Sets Us Apart
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            {VALUES.map((v) => (
              <div key={v.title} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center border border-gold/30 text-gold">
                  {v.icon}
                </div>
                <h3 className="mb-2 font-semibold">{v.title}</h3>
                <p className="text-sm leading-relaxed text-muted">
                  {v.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Hours + CTA */}
      <section className="border-t border-charcoal-light px-6 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-4 text-2xl font-bold">Visit Us</h2>
          <p className="mb-2 text-muted">Open Daily</p>
          <p className="mb-8 text-lg text-gold">
            {formatTime(BUSINESS.hours.open)} –{" "}
            {formatTime(BUSINESS.hours.close)}
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

const VALUES = [
  {
    title: "Discretion",
    icon: "◆",
    description:
      "Your privacy matters. From booking to checkout, everything is handled with care.",
  },
  {
    title: "Quality",
    icon: "◆",
    description:
      "Skilled therapists with proven technique. No shortcuts, no compromises.",
  },
  {
    title: "Simplicity",
    icon: "◆",
    description:
      "Choose your therapist, book online, show up. We handle everything else.",
  },
];

