import Link from "next/link";
import {
  SERVICES,
  ADD_ONS,
  BUSINESS,
  formatPrice,
} from "@/lib/config/business-rules";

export const metadata = {
  title: "Services | Obsidian Men's Spa",
  description:
    "Signature massages, couples sessions, four-handed massage, and luxury add-ons.",
};

export default function ServicesPage() {
  return (
    <>
      {/* Header */}
      <section className="px-6 pb-12 pt-20 text-center">
        <p className="mb-2 text-sm tracking-[0.3em] text-gold">
          WHAT WE OFFER
        </p>
        <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">
          Services
        </h1>
        <p className="mx-auto max-w-lg text-muted">
          Every session is tailored to you. Choose your service, select your
          therapist, and add enhancements to create your ideal experience.
        </p>
      </section>

      {/* Services */}
      <section className="border-t border-charcoal-light px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <div className="flex flex-col gap-6">
            {SERVICES.map((service) => (
              <div
                key={service.id}
                className="flex flex-col justify-between gap-6 border border-charcoal-light bg-charcoal p-8 md:flex-row md:items-center"
              >
                <div className="flex-1">
                  <h2 className="mb-2 text-xl font-semibold">{service.name}</h2>
                  <p className="mb-3 text-sm leading-relaxed text-muted">
                    {service.description}
                  </p>
                  <p className="text-xs text-muted">
                    {service.duration} minutes
                  </p>
                </div>
                <div className="flex items-center gap-6">
                  <span className="text-2xl font-bold text-gold">
                    {formatPrice(service.price)}
                  </span>
                  <Link
                    href="/booking"
                    className="whitespace-nowrap border border-gold px-6 py-2 text-sm tracking-wide text-gold transition-colors hover:bg-gold hover:text-background"
                  >
                    Book
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Add-ons */}
      <section className="border-t border-charcoal-light px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <p className="mb-2 text-sm tracking-[0.3em] text-gold">
            ENHANCEMENTS
          </p>
          <h2 className="mb-8 text-3xl font-bold tracking-tight">Add-Ons</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {ADD_ONS.map((addon) => (
              <div
                key={addon.id}
                className="border border-charcoal-light bg-charcoal p-6 text-center"
              >
                <h3 className="mb-2 text-lg font-semibold">{addon.name}</h3>
                <p className="text-gold">{formatPrice(addon.price)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Policies */}
      <section className="border-t border-charcoal-light px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-6 text-2xl font-bold tracking-tight">
            Booking Policies
          </h2>
          <div className="space-y-4 text-sm leading-relaxed text-muted">
            <p>
              <strong className="text-foreground">Card on file:</strong> A valid
              card is required to book. Payment is collected after your session.
            </p>
            <p>
              <strong className="text-foreground">Cancellation:</strong>{" "}
              Cancellations within {BUSINESS.fees.lateCancelWindow} hours of
              your appointment incur a{" "}
              {formatPrice(BUSINESS.fees.lateCancelFee)} fee.
            </p>
            <p>
              <strong className="text-foreground">No-show:</strong> Missed
              appointments without notice are charged{" "}
              {BUSINESS.fees.noShowPercent}% of the booked service price.
            </p>
            <p>
              <strong className="text-foreground">Changes:</strong> To cancel or
              reschedule, please contact us directly.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
