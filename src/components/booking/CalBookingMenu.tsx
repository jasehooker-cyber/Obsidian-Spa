"use client";

import Link from "next/link";
import {
  CAL_SERVICES,
  PAYMENT_NOTICE,
  basePrice,
} from "@/lib/config/cal-events";
import { formatPrice } from "@/lib/config/business-rules";
import CalDurationButton from "@/components/booking/CalDurationButton";
import { useCalEmbed } from "@/components/booking/useCalEmbed";

/** Service menu that opens the Cal.com booking popup on click. */
export default function CalBookingMenu() {
  useCalEmbed();

  return (
    <div className="mx-auto max-w-5xl">
      <div className="grid gap-6 md:grid-cols-2">
        {CAL_SERVICES.map((service, i) => (
          <article
            key={service.id}
            className={`luxury-card animate-fade-up group flex flex-col p-8 ${
              service.featured ? "signature-card" : ""
            }`}
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <p className="font-display mb-3 text-[11px] tracking-[0.3em] text-gold/70">
              {service.eyebrow}
            </p>
            <div className="mb-3 flex items-baseline justify-between gap-4">
              <h2 className="text-xl font-semibold tracking-wide transition-colors duration-300 group-hover:text-gold">
                {service.href ? (
                  <Link href={service.href}>{service.name}</Link>
                ) : (
                  service.name
                )}
              </h2>
              <p className="shrink-0 text-right">
                {service.durations.length > 1 && (
                  <span className="mr-1.5 text-[10px] tracking-[0.2em] text-muted/60">
                    FROM
                  </span>
                )}
                <span className="text-gold-gradient text-xl font-bold">
                  {formatPrice(basePrice(service))}
                </span>
              </p>
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

      <p className="animate-fade-up mx-auto mt-10 max-w-2xl border-l-2 border-gold/20 py-1 pl-5 text-sm leading-relaxed text-muted">
        {PAYMENT_NOTICE}
      </p>
    </div>
  );
}
