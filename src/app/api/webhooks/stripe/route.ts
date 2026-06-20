import { stripe } from "@/lib/stripe/server";
import { getEnv } from "@/lib/config/env";
import { supabaseServer } from "@/lib/supabase/server";
import { confirmBooking } from "@/lib/booking/actions";
import type Stripe from "stripe";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return Response.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(
      body,
      signature,
      getEnv().stripe.webhookSecret
    );
  } catch {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = supabaseServer();

  const { data: existing } = await supabase
    .from("webhook_events")
    .select("id")
    .eq("event_id", event.id)
    .single();

  if (existing) {
    return Response.json({ received: true, duplicate: true });
  }

  await supabase.from("webhook_events").insert({
    source: "stripe",
    event_id: event.id,
    event_type: event.type,
    payload: event.data.object as unknown as Record<string, unknown>,
  });

  try {
    switch (event.type) {
      case "setup_intent.succeeded": {
        const setupIntent = event.data.object as Stripe.SetupIntent;
        try {
          await confirmBooking(setupIntent.id);
        } catch {
          // Already confirmed via success page — not an error
        }
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await supabase
          .from("payments")
          .update({ status: "succeeded" })
          .eq("stripe_payment_intent_id", paymentIntent.id);
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await supabase
          .from("payments")
          .update({ status: "failed" })
          .eq("stripe_payment_intent_id", paymentIntent.id);
        break;
      }
    }

    await supabase
      .from("webhook_events")
      .update({ processed_at: new Date().toISOString() })
      .eq("event_id", event.id);
  } catch (err) {
    console.error("Webhook processing error:", err);
    return Response.json(
      { error: "Processing failed" },
      { status: 500 }
    );
  }

  return Response.json({ received: true });
}
