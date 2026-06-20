import { assertStaffAuth, AuthError } from "@/lib/auth/staff";
import { supabaseServer } from "@/lib/supabase/server";
import { chargeOffSession } from "@/lib/payments/charge";
import { BUSINESS } from "@/lib/config/business-rules";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await assertStaffAuth(request);
  } catch (err) {
    if (err instanceof AuthError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    return Response.json({ error: "Auth failed" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const supabase = supabaseServer();

    const { data: booking } = await supabase
      .from("bookings")
      .select(`
        id, status, stripe_payment_method_id,
        services!inner(price_cents),
        clients!inner(stripe_customer_id)
      `)
      .eq("id", id)
      .eq("status", "confirmed")
      .single();

    if (!booking) {
      return Response.json(
        { error: "Confirmed booking not found" },
        { status: 404 }
      );
    }

    const client = booking.clients as unknown as {
      stripe_customer_id: string;
    };
    const service = booking.services as unknown as { price_cents: number };

    if (!client.stripe_customer_id || !booking.stripe_payment_method_id) {
      return Response.json(
        { error: "No payment method on file" },
        { status: 400 }
      );
    }

    const feeCents = Math.round(
      service.price_cents * (BUSINESS.fees.noShowPercent / 100)
    );

    const paymentIntent = await chargeOffSession({
      bookingId: booking.id,
      stripeCustomerId: client.stripe_customer_id,
      paymentMethodId: booking.stripe_payment_method_id,
      amountCents: feeCents,
      type: "no_show",
      description: "Obsidian Men's Spa — No-show fee",
    });

    await supabase
      .from("bookings")
      .update({ status: "no_show" })
      .eq("id", booking.id);

    return Response.json({
      success: true,
      paymentIntentId: paymentIntent.id,
      feeCents,
    });
  } catch (err) {
    console.error("No-show error:", err);
    return Response.json(
      { error: "Failed to process no-show fee" },
      { status: 500 }
    );
  }
}
