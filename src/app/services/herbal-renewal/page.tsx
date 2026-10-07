import type { Metadata } from "next";
import Link from "next/link";
import { CAL_SERVICES, PAYMENT_NOTICE } from "@/lib/config/cal-events";
import { getEnv } from "@/lib/config/env-public";
import { spaEntityId } from "@/lib/seo";
import ServiceBookingButtons from "@/components/booking/ServiceBookingButtons";

const service = CAL_SERVICES.find((s) => s.id === "kiln")!;

const TITLE = "Herbal Renewal — Herbal Heat Ritual | Obsidian Men's Spa, Midtown NYC";
const DESCRIPTION =
  "Obsidian's signature herbal heat ritual: steamed compresses, a warm cocoon, head and scalp massage and deep oil bodywork. 75 or 90 minutes in Midtown.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/services/herbal-renewal" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/services/herbal-renewal",
    type: "website",
    siteName: "Obsidian Men's Spa",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: service.name,
  description: service.description,
  url: `${getEnv().siteUrl}/services/herbal-renewal`,
  provider: { "@id": spaEntityId() },
  offers: service.durations.map((duration) => ({
    "@type": "Offer",
    name: `${service.name} · ${duration.minutes} min`,
    price: (duration.price / 100).toFixed(0),
    priceCurrency: "USD",
  })),
};

export default function HerbalRenewalPage() {
  return (
    <section className="noise-overlay relative overflow-hidden px-6 pb-24 pt-28 text-center">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(187,145,89,0.06)_0%,transparent_60%)]" />

      <div className="relative mx-auto max-w-2xl">
        <p className="font-display animate-fade-up mb-3 text-sm tracking-[0.4em] text-gold">
          SIGNATURE RITUAL
        </p>
        <h1 className="font-display text-gold-gradient animate-fade-up-delay-1 mb-4 text-3xl uppercase tracking-[0.15em] md:text-5xl lg:text-6xl">
          {service.name}
        </h1>
        <p className="animate-fade-up-delay-1 mb-6 text-lg text-foreground/90">
          An herbal heat ritual, in two firings
        </p>
        <div className="gold-divider animate-fade-up-delay-2 mx-auto mb-8">
          <span className="text-xs text-gold/60">&#9670;</span>
        </div>
        <p className="animate-fade-up-delay-2 mb-12 text-base leading-relaxed text-muted md:text-lg">
          Steamed ginger, lemongrass and cedar compresses along the back, a warm
          herbal wrap, scalp and jaw work, then deep oil bodywork. It ends with
          a cool stone in each palm.
        </p>

        <div className="animate-fade-up-delay-3">
          <ServiceBookingButtons service={service} />
          <p className="mx-auto mt-8 max-w-md text-sm leading-relaxed text-muted">
            {PAYMENT_NOTICE}
          </p>
          <Link
            href="/services"
            className="mt-10 inline-block text-xs tracking-widest text-gold/80 transition-colors hover:text-gold"
          >
            &larr; ALL SERVICES
          </Link>
        </div>
      </div>
    </section>
  );
}
