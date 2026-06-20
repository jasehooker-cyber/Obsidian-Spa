"use client";

export default function GlobalError({
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
        Something Went Wrong
      </h1>
      <p className="mb-8 max-w-md text-muted">
        We hit an unexpected error. Please try again, or contact us if the
        problem continues.
      </p>
      <button
        onClick={reset}
        className="border border-gold px-8 py-3 text-sm tracking-wide text-gold transition-colors hover:bg-gold hover:text-background"
      >
        Try Again
      </button>
    </section>
  );
}
