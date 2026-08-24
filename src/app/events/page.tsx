import Link from "next/link";
import { BUSINESS, formatPrice } from "@/lib/config/business-rules";
import { SPA_EVENTS, type SpaEvent } from "@/lib/config/events";
import { calLink, CAL_TRIGGER_CONFIG } from "@/lib/config/cal-events";

export const metadata = {
  title: "Events & Classes — LGBTQ+ Wellness in Midtown",
  description:
    "Yoga, group acupuncture, and couples massage workshops for gay and queer men in Midtown Manhattan. Group classes and private studio hire at Obsidian Men's Spa.",
  alternates: { canonical: "/events" },
};

/** Prefilled enquiry, so an interested visitor does not have to compose one. */
function waitlistHref(event: SpaEvent) {
  const subject = `Interest: ${event.name} at ${BUSINESS.name}`;
  const body = `I'd like to hear when ${event.name} is scheduled.\n\nName:\nPhone:\nPreferred days/times:\nNumber of people:\n`;
  return `mailto:${BUSINESS.contact.email}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;
}

export default function EventsPage() {
  return (
    <>
      {/* Header */}
      <section className="noise-overlay relative overflow-hidden px-6 pb-16 pt-24 text-center">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(187,145,89,0.06)_0%,transparent_60%)]" />
        <p className="font-display animate-fade-up relative mb-3 text-sm tracking-[0.4em] text-gold">
          THE STUDIO
        </p>
        <h1 className="font-display animate-fade-up-delay-1 relative mb-4 text-3xl uppercase tracking-[0.15em] md:text-4xl lg:text-5xl">
          Events &amp; Classes
        </h1>
        <div className="gold-divider animate-fade-up-delay-2 relative mx-auto mb-6">
          <span className="text-xs text-gold/60">&#9670;</span>
        </div>
        <p className="animate-fade-up-delay-2 relative mx-auto max-w-xl text-lg text-muted">
          Beyond the treatment rooms we keep a studio for group work — movement,
          recovery, and teaching. Small numbers, same privacy, same quiet.
        </p>
      </section>

      {/* Offerings */}
      <section className="section-glow relative px-6 py-12">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-6 md:grid-cols-2">
            {SPA_EVENTS.map((event, i) => (
              <article
                key={event.id}
                className="luxury-card animate-fade-up group flex flex-col p-8"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <p className="font-display mb-3 text-[11px] tracking-[0.3em] text-gold/70">
                  {event.eyebrow}
                </p>
                <div className="mb-3 flex items-baseline justify-between gap-4">
                  <h2 className="text-xl font-semibold tracking-wide transition-colors duration-300 group-hover:text-gold">
                    {event.name}
                  </h2>
                  {event.price !== undefined && (
                    <span className="text-gold-gradient shrink-0 text-xl font-bold">
                      {formatPrice(event.price)}
                    </span>
                  )}
                </div>
                <p className="mb-5 flex-1 text-sm leading-relaxed text-muted">
                  {event.description}
                </p>
                <p className="mb-6 text-xs tracking-wider text-muted/60">
                  {event.format.toUpperCase()} &middot;{" "}
                  {event.duration.toUpperCase()}
                </p>

                {event.status === "open" && event.calSlug ? (
                  <button
                    type="button"
                    data-cal-link={calLink(event.calSlug)}
                    data-cal-namespace={event.calSlug}
                    data-cal-origin="https://app.cal.com"
                    data-cal-config={CAL_TRIGGER_CONFIG}
                    className="btn-glow relative cursor-pointer self-start border border-gold/40 px-6 py-3 text-xs font-semibold tracking-widest text-gold transition-all duration-300 hover:border-gold hover:bg-gold hover:text-background"
                  >
                    RESERVE A PLACE
                  </button>
                ) : (
                  <a
                    href={waitlistHref(event)}
                    className="self-start border border-gold/30 px-6 py-3 text-xs font-semibold tracking-widest text-gold/90 transition-all duration-300 hover:border-gold hover:text-gold"
                  >
                    JOIN THE LIST &rarr;
                  </a>
                )}
              </article>
            ))}

            {/* Private hire — the room itself, rather than a scheduled class */}
            <article
              className="luxury-card animate-fade-up group flex flex-col p-8"
              style={{ animationDelay: `${SPA_EVENTS.length * 0.1}s` }}
            >
              <p className="font-display mb-3 text-[11px] tracking-[0.3em] text-gold/70">
                PRIVATE HIRE
              </p>
              <h2 className="mb-3 text-xl font-semibold tracking-wide transition-colors duration-300 group-hover:text-gold">
                Book the Studio
              </h2>
              <p className="mb-5 flex-1 text-sm leading-relaxed text-muted">
                The room is available on its own — a team recovery session, a
                private class for a group of friends, or a practitioner looking
                for somewhere calm to teach. Tell us what you have in mind.
              </p>
              <p className="mb-6 text-xs tracking-wider text-muted/60">
                BY ARRANGEMENT &middot; MIDTOWN MANHATTAN
              </p>
              <a
                href={`mailto:${BUSINESS.contact.email}?subject=${encodeURIComponent(
                  `Studio hire enquiry — ${BUSINESS.name}`
                )}`}
                className="self-start border border-gold/30 px-6 py-3 text-xs font-semibold tracking-widest text-gold/90 transition-all duration-300 hover:border-gold hover:text-gold"
              >
                ENQUIRE &rarr;
              </a>
            </article>
          </div>

          <p className="animate-fade-up mx-auto mt-10 max-w-2xl border-l-2 border-gold/20 py-1 pl-5 text-sm leading-relaxed text-muted">
            Dates are being set now. Join the list for anything above and
            we&apos;ll come to you first with times — or call{" "}
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

      {/* Massage cross-link, so the page still routes to the bookable thing */}
      <section className="relative px-6 pb-24 pt-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="gold-divider mx-auto mb-8">
            <span className="text-xs text-gold/60">&#9670;</span>
          </div>
          <h2 className="font-display mb-4 text-2xl uppercase tracking-[0.12em]">
            Here for a Massage?
          </h2>
          <p className="mb-8 text-lg leading-relaxed text-muted">
            One-to-one sessions run daily,{" "}
            {BUSINESS.hours.open === "08:00" ? "8 AM" : BUSINESS.hours.open} to
            10 PM, and can be booked online now.
          </p>
          <Link
            href="/booking"
            className="btn-glow relative inline-block border border-gold bg-gold px-12 py-4 text-sm font-semibold tracking-widest text-background transition-all duration-300 hover:bg-gold-dark hover:shadow-[0_0_24px_rgba(187,145,89,0.25)]"
          >
            BOOK A SESSION
          </Link>
        </div>
      </section>
    </>
  );
}
