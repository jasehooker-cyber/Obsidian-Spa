"use client";

import Link from "next/link";

export default function BookingError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center border border-red-500/30 text-2xl text-red-400">
        ✕
      </div>
      <h1 className="mb-4 text-3xl font-bold tracking-tight">
        Booking Error
      </h1>
      <p className="mb-8 max-w-md text-muted">
        Something went wrong with the booking process. Please try again.
      </p>
      <div className="flex gap-4">
        <button
          onClick={reset}
          className="border border-gold px-8 py-3 text-sm tracking-wide text-gold transition-colors hover:bg-gold hover:text-background"
        >
          Try Again
        </button>
        <Link
          href="/"
          className="border border-charcoal-light px-8 py-3 text-sm tracking-wide text-muted transition-colors hover:border-gold hover:text-gold"
        >
          Back to Home
        </Link>
      </div>
    </section>
  );
}
