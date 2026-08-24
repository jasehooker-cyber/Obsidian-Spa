import { BUSINESS } from "@/lib/config/business-rules";
import { formatTime } from "@/lib/config/format";
import CalBookingMenu from "@/components/booking/CalBookingMenu";

export const metadata = {
  title: "Book a Massage — Gay Men's Spa, Midtown Manhattan",
  description:
    "Book gay male massage in Midtown Manhattan online in minutes. Same-day appointments, open daily 8 AM – 10 PM. Choose your session and length, then pick a time.",
  alternates: { canonical: "/booking" },
};

export default function BookingPage() {
  return (
    <>
      <section className="noise-overlay relative overflow-hidden px-6 pb-16 pt-28 text-center">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(187,145,89,0.06)_0%,transparent_60%)]" />
        <p className="font-display animate-fade-up relative mb-3 text-sm tracking-[0.4em] text-gold">
          RESERVATIONS
        </p>
        <h1 className="font-display animate-fade-up-delay-1 relative mb-4 text-3xl uppercase tracking-[0.15em] md:text-4xl lg:text-5xl">
          Book Your Session
        </h1>
        <div className="gold-divider animate-fade-up-delay-2 relative mx-auto mb-6">
          <span className="text-xs text-gold/60">&#9670;</span>
        </div>
        <p className="animate-fade-up-delay-2 relative mx-auto max-w-lg text-lg text-muted">
          Choose your service and the length that suits you. Live availability
          opens right here — pick a time and you&apos;re confirmed.
        </p>
      </section>

      <section className="section-glow relative px-6 pb-20">
        <CalBookingMenu />
      </section>

      {/* Visit details */}
      <section className="relative px-6 pb-24">
        <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-3">
          {[
            {
              title: "Hours",
              text: `Open daily, ${formatTime(BUSINESS.hours.open)} – ${formatTime(BUSINESS.hours.close)}.`,
            },
            {
              title: "Location",
              text: `${BUSINESS.address.street}, ${BUSINESS.address.neighborhood}.`,
            },
            {
              title: "Questions",
              text: `Call ${BUSINESS.contact.phone} or email ${BUSINESS.contact.email}.`,
            },
          ].map((item) => (
            <div
              key={item.title}
              className="border-l-2 border-gold/20 py-1 pl-5"
            >
              <h2 className="mb-1.5 text-sm font-semibold tracking-wide text-foreground">
                {item.title}
              </h2>
              <p className="text-sm leading-relaxed text-muted">{item.text}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
