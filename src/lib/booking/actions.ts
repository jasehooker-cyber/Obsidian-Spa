import { supabaseServer } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe/server";
import { sendBookingConfirmation, sendIntakeEmail } from "@/lib/email/server";
import { generateIntakeToken, buildIntakeUrl } from "@/lib/booking/intake";
import type { PayBooking } from "@/lib/booking/paylink";

/** SetupIntent statuses that can still be completed by the client. */
const REUSABLE_SETUP_STATUSES = new Set([
  "requires_payment_method",
  "requires_confirmation",
  "requires_action",
]);

/**
 * Get the Stripe client secret for saving a card against a booking.
 *
 * Reuses the booking's existing SetupIntent when the client reloads the pay
 * page, so a refresh does not leave a trail of abandoned intents in Stripe.
 */
export async function createSetupSession(
  booking: PayBooking
): Promise<{ clientSecret: string }> {
  const supabase = supabaseServer();
  const s = stripe();

  if (booking.setupIntentId) {
    const existing = await s.setupIntents.retrieve(booking.setupIntentId);
    if (REUSABLE_SETUP_STATUSES.has(existing.status) && existing.client_secret) {
      return { clientSecret: existing.client_secret };
    }
  }

  let customerId = booking.stripeCustomerId;
  if (!customerId) {
    const customer = await s.customers.create({
      email: booking.clientEmail,
      name: booking.clientName,
      ...(booking.clientPhone ? { phone: booking.clientPhone } : {}),
    });
    customerId = customer.id;

    await supabase
      .from("clients")
      .update({ stripe_customer_id: customerId })
      .eq("id", booking.clientId);
  }

  const setupIntent = await s.setupIntents.create({
    customer: customerId,
    payment_method_types: ["card"],
    // Fees are charged after the client has left, so the card must be
    // reusable without them present.
    usage: "off_session",
    metadata: {
      booking_id: booking.bookingId,
      client_id: booking.clientId,
    },
  });

  await supabase
    .from("bookings")
    .update({ stripe_setup_intent_id: setupIntent.id })
    .eq("id", booking.bookingId);

  return { clientSecret: setupIntent.client_secret! };
}

/**
 * Promote a booking to 'confirmed' once its card is saved.
 *
 * The appointment already exists in Cal.com (and on the connected calendar) —
 * this only records the payment method and sends our own emails.
 */
export async function confirmBooking(
  setupIntentId: string
): Promise<{ bookingId: string }> {
  const supabase = supabaseServer();
  const s = stripe();

  const setupIntent = await s.setupIntents.retrieve(setupIntentId);
  if (setupIntent.status !== "succeeded") {
    throw new Error("SetupIntent has not succeeded");
  }

  const { data: booking } = await supabase
    .from("bookings")
    .select(
      `
      id, status, starts_at, ends_at,
      clients!inner(id, name, email),
      therapists!inner(name),
      services!inner(name, price_cents),
      booking_add_ons(add_ons(name, price_cents))
    `
    )
    .eq("stripe_setup_intent_id", setupIntentId)
    .single();

  if (!booking) throw new Error("Booking not found for this SetupIntent");

  // Already done — a re-submitted redirect must not re-send emails.
  if (booking.status === "confirmed") return { bookingId: booking.id };

  // A stale redirect must not resurrect a booking that was cancelled or
  // already completed in the meantime.
  if (booking.status !== "draft") {
    throw new Error(`Booking ${booking.id} is ${booking.status}, not awaiting a card`);
  }

  const paymentMethodId =
    typeof setupIntent.payment_method === "string"
      ? setupIntent.payment_method
      : setupIntent.payment_method?.id;

  if (paymentMethodId && setupIntent.customer) {
    // Already attached when the SetupIntent succeeds; tolerate the duplicate.
    try {
      await s.paymentMethods.attach(paymentMethodId, {
        customer: setupIntent.customer as string,
      });
    } catch {
      // Non-fatal: the card is on the customer either way.
    }
  }

  const client = booking.clients as unknown as { name: string; email: string };
  const therapist = booking.therapists as unknown as { name: string };
  const service = booking.services as unknown as {
    name: string;
    price_cents: number;
  };
  const bookingAddOns =
    (booking.booking_add_ons as unknown as {
      add_ons: { name: string; price_cents: number };
    }[]) ?? [];

  await supabase
    .from("bookings")
    .update({
      status: "confirmed",
      confirmed_at: new Date().toISOString(),
      stripe_payment_method_id: paymentMethodId ?? null,
    })
    .eq("id", booking.id);

  try {
    await sendBookingConfirmation({
      clientName: client.name,
      clientEmail: client.email,
      serviceName: service.name,
      servicePrice: service.price_cents,
      therapistName: therapist.name,
      startsAt: booking.starts_at,
      endsAt: booking.ends_at,
      addOns: bookingAddOns.map((ba) => ({
        name: ba.add_ons.name,
        price: ba.add_ons.price_cents,
      })),
    });
  } catch (err) {
    console.error("Confirmation email failed:", err);
  }

  try {
    const token = await generateIntakeToken(booking.id);
    await sendIntakeEmail({
      clientName: client.name,
      clientEmail: client.email,
      intakeUrl: buildIntakeUrl(token),
    });
  } catch (err) {
    console.error("Intake email failed:", err);
  }

  return { bookingId: booking.id };
}
