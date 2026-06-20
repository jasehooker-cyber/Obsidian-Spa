import Link from "next/link";

export default function NotFound() {
  return (
    <section className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <p className="mb-4 text-6xl font-bold text-gold">404</p>
      <h1 className="mb-4 text-3xl font-bold tracking-tight">
        Page Not Found
      </h1>
      <p className="mb-8 max-w-md text-muted">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/"
        className="border border-gold px-8 py-3 text-sm tracking-wide text-gold transition-colors hover:bg-gold hover:text-background"
      >
        Back to Home
      </Link>
    </section>
  );
}
