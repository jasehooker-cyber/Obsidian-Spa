import { validateIntakeToken } from "@/lib/booking/intake";
import { supabaseServer } from "@/lib/supabase/server";
import IntakeForm from "@/components/intake/IntakeForm";
import Link from "next/link";

export const metadata = {
  title: "Intake Form | Obsidian Men's Spa",
  description: "Complete your intake form before your visit.",
};

export default async function IntakePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const validation = await validateIntakeToken(token);

  if (!validation.valid) {
    return (
      <section className="px-6 py-20">
        <div className="mx-auto max-w-lg text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center border border-red-500/30 text-2xl text-red-400">
            ✕
          </div>
          <h1 className="mb-4 text-3xl font-bold tracking-tight">
            {validation.reason === "already_submitted"
              ? "Already Completed"
              : validation.reason === "expired"
                ? "Link Expired"
                : "Invalid Link"}
          </h1>
          <p className="mb-8 text-muted">
            {validation.reason === "already_submitted"
              ? "You've already submitted your intake form. Thank you!"
              : validation.reason === "expired"
                ? "This intake link has expired. Please contact us for a new one."
                : "This intake link is not valid. Please check your email for the correct link."}
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

  const supabase = supabaseServer();
  const { data: booking } = await supabase
    .from("bookings")
    .select(
      "starts_at, services!inner(name), therapists!inner(name), clients!inner(name)"
    )
    .eq("id", validation.bookingId)
    .single();

  const service = booking?.services as unknown as { name: string } | null;
  const therapist = booking?.therapists as unknown as { name: string } | null;
  const client = booking?.clients as unknown as { name: string } | null;

  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-2xl">
        <p className="mb-2 text-center text-sm tracking-[0.3em] text-gold">
          BEFORE YOUR VISIT
        </p>
        <h1 className="mb-4 text-center text-4xl font-bold tracking-tight">
          Intake Form
        </h1>

        {booking && (
          <div className="mb-8 border border-charcoal-light bg-charcoal p-5 text-center">
            <p className="text-sm text-muted">
              <span className="text-foreground">{client?.name}</span>
              {" — "}
              {service?.name} with {therapist?.name}
            </p>
            <p className="mt-1 text-xs text-muted">
              {new Date(booking.starts_at).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
                timeZone: "America/New_York",
              })}
            </p>
          </div>
        )}

        <p className="mb-8 text-center text-sm text-muted">
          Help your therapist personalize your session. All information is
          confidential.
        </p>

        <IntakeForm token={token} />
      </div>
    </section>
  );
}
