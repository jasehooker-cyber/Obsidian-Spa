import Link from "next/link";
import { loadBookingByPayToken, type PayTokenFailure } from "@/lib/booking/paylink";
import { createSetupSession } from "@/lib/booking/actions";
import { BUSINESS, formatPrice } from "@/lib/config/business-rules";
import CardForm from "@/components/booking/CardForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Secure Your Booking",
  description: "Add a card to your file to secure your appointment.",
  robots: { index: false, follow: false },
};

const FAILURE_COPY: Record<PayTokenFailure, { title: string; body: string }> = {
  not_found: {
    title: "Link Not Found",
    body: "This payment link is not valid. Check the link in your email, or contact us and we'll sort it out.",
  },
  expired: {
    title: "Link Expired",
    body: "This payment link has expired. Contact us and we'll send you a fresh one.",
  },
  already_paid: {
    title: "You're Already Set",
    body: "This booking already has a card on file. Nothing else is needed from you.",
  },
  cancelled: {
    title: "Booking Cancelled",
    body: "This booking is no longer active. Contact us if you'd like to rebook.",
  },
  unknown_service: {
    title: "Something Went Wrong",
    body: "We couldn't load the details for this booking. Please contact us directly.",
  },
};

export default async function PayPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await loadBookingByPayToken(token);

  if (!result.valid) {
    return <PayNotice {...FAILURE_COPY[result.reason]} />;
  }

  const { booking } = result;

  let clientSecret: string;
  try {
    ({ clientSecret } = await createSetupSession(booking));
  } catch (err) {
    console.error(`Setup session failed for booking ${booking.bookingId}:`, err);
    return (
      <PayNotice
        title="Payment Setup Unavailable"
        body="We couldn't start the secure card form. Please refresh, or contact us and we'll take your details directly."
      />
    );
  }

  const start = new Date(booking.startsAt);
  const date = start.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: BUSINESS.timezone,
  });
  const time = start.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: BUSINESS.timezone,
  });

  return (
    <>
      <section className="noise-overlay relative overflow-hidden px-6 pb-12 pt-28 text-center">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(201,168,76,0.06)_0%,transparent_60%)]" />
        <p className="relative mb-3 text-sm tracking-[0.4em] text-gold">
          FINAL STEP
        </p>
        <h1 className="relative mb-4 text-4xl font-bold tracking-tight md:text-5xl">
          Secure Your Booking
        </h1>
        <div className="gold-divider relative mx-auto mb-6">
          <span className="text-xs text-gold/60">&#9670;</span>
        </div>
        <p className="relative mx-auto max-w-lg text-lg text-muted">
          Your time is held. Add a card to confirm it — you won&apos;t be
          charged today.
        </p>
      </section>

      <section className="section-glow relative px-6 pb-20">
        <div className="mx-auto max-w-xl">
          <div className="mb-6 border border-charcoal-light bg-charcoal p-5">
            <h2 className="mb-3 text-sm font-semibold text-foreground">
              Booking Summary
            </h2>
            <div className="space-y-1 text-sm text-muted">
              <div className="flex justify-between">
                <span>{booking.service.name}</span>
                <span>{formatPrice(booking.service.price)}</span>
              </div>
              {booking.addOns.map((a) => (
                <div key={a.id} className="flex justify-between">
                  <span>+ {a.name}</span>
                  <span>{formatPrice(a.price)}</span>
                </div>
              ))}
              <div className="mt-2 flex justify-between border-t border-charcoal-light pt-2 text-foreground">
                <span className="font-semibold">Total</span>
                <span className="font-semibold text-gold">
                  {formatPrice(booking.totalCents)}
                </span>
              </div>
              <p className="mt-3 text-xs">
                {date} at {time} ET · {booking.service.duration} minutes
              </p>
              <p className="text-xs">Booked for {booking.clientName}</p>
            </div>
          </div>

          <CardForm clientSecret={clientSecret} />

          <div className="mt-10 border-t border-charcoal-light pt-8 text-xs leading-relaxed text-muted">
            <p className="mb-2">
              <strong className="text-foreground">Not charged today:</strong>{" "}
              Payment for your service is collected after your session.
            </p>
            <p className="mb-2">
              <strong className="text-foreground">Late cancellation:</strong>{" "}
              {formatPrice(BUSINESS.fees.lateCancelFee)} fee within{" "}
              {BUSINESS.fees.lateCancelWindow} hours of your appointment.
            </p>
            <p>
              <strong className="text-foreground">No-show:</strong>{" "}
              {BUSINESS.fees.noShowPercent}% of service price. To cancel or
              reschedule, contact us at {BUSINESS.contact.phone}.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

function PayNotice({ title, body }: { title: string; body: string }) {
  return (
    <section className="px-6 py-28">
      <div className="mx-auto max-w-lg text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center border border-gold/30 text-2xl text-gold">
          &#9670;
        </div>
        <h1 className="mb-4 text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mb-8 text-muted">{body}</p>
        <p className="mb-8 text-sm text-muted">
          <a
            href={`tel:${BUSINESS.contact.phone}`}
            className="text-gold transition-colors hover:text-gold-dark"
          >
            {BUSINESS.contact.phone}
          </a>
          {" · "}
          <a
            href={`mailto:${BUSINESS.contact.email}`}
            className="text-gold transition-colors hover:text-gold-dark"
          >
            {BUSINESS.contact.email}
          </a>
        </p>
        <Link
          href="/"
          className="inline-block border border-gold px-8 py-3 text-sm tracking-wide text-gold transition-colors hover:bg-gold hover:text-background"
        >
          Back to Home
        </Link>
      </div>
    </section>
  );
}
