import { stripe } from "@/lib/stripe/server";
import { supabaseServer } from "@/lib/supabase/server";
import type Stripe from "stripe";

interface ChargeParams {
  bookingId: string;
  stripeCustomerId: string;
  paymentMethodId: string;
  amountCents: number;
  type: "service" | "late_cancel" | "no_show";
  description: string;
}

export async function chargeOffSession(
  params: ChargeParams
): Promise<Stripe.PaymentIntent> {
  const s = stripe();

  const paymentIntent = await s.paymentIntents.create({
    amount: params.amountCents,
    currency: "usd",
    customer: params.stripeCustomerId,
    payment_method: params.paymentMethodId,
    off_session: true,
    confirm: true,
    description: params.description,
    metadata: {
      booking_id: params.bookingId,
      charge_type: params.type,
    },
  });

  const supabase = supabaseServer();
  await supabase.from("payments").insert({
    booking_id: params.bookingId,
    type: params.type,
    amount_cents: params.amountCents,
    stripe_payment_intent_id: paymentIntent.id,
    status: paymentIntent.status === "succeeded" ? "succeeded" : "pending",
  });

  return paymentIntent;
}
