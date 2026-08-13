import Link from "next/link";
import { redirect } from "next/navigation";
import { syncCalBookingByUid } from "@/lib/booking/cal-sync";
import { BUSINESS } from "@/lib/config/business-rules";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Securing Your Booking",
  robots: { index: false, follow: false },
};

/**
 * Landing point straight after a client books in the Cal.com embed.
 *
 * The embed only hands us a Cal.com booking uid, so this mirrors the booking
 * into Supabase and forwards to its pay link. It does the same work as the
 * BOOKING_CREATED webhook and is idempotent, so whichever arrives first wins
 * and the client never waits on webhook delivery.
 */
export default async function PayResolvePage({
  searchParams,
}: {
  searchParams: Promise<{ uid?: string }>;
}) {
  const { uid } = await searchParams;

  if (!uid) {
    return (
      <ResolveNotice body="We couldn't tell which booking to load. Check your email — we've sent your payment link there." />
    );
  }

  let payToken: string;
  try {
    ({ payToken } = await syncCalBookingByUid(uid));
  } catch (err) {
    console.error(`Could not resolve Cal.com booking ${uid}:`, err);
    return (
      <ResolveNotice body="Your appointment is booked, but we couldn't open the card form just yet. Check your email for your payment link, or contact us and we'll take your details directly." />
    );
  }

  redirect(`/pay/${payToken}`);
}

function ResolveNotice({ body }: { body: string }) {
  return (
    <section className="px-6 py-28">
      <div className="mx-auto max-w-lg text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center border border-gold/30 text-2xl text-gold">
          &#10003;
        </div>
        <h1 className="mb-4 text-3xl font-bold tracking-tight">
          Your Time Is Booked
        </h1>
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
