import { assertStaffAuth, AuthError } from "@/lib/auth/staff";
import { supabaseServer } from "@/lib/supabase/server";
import { chargeOffSession } from "@/lib/payments/charge";

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
        services!inner(name, price_cents),
        booking_add_ons(add_ons!inner(price_cents)),
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
    const service = booking.services as unknown as {
      name: string;
      price_cents: number;
    };
    const addOns = booking.booking_add_ons as unknown as Array<{
      add_ons: { price_cents: number };
    }>;

    if (!client.stripe_customer_id || !booking.stripe_payment_method_id) {
      return Response.json(
        { error: "No payment method on file" },
        { status: 400 }
      );
    }

    const addOnTotal = addOns.reduce(
      (sum, ba) => sum + ba.add_ons.price_cents,
      0
    );
    const totalCents = service.price_cents + addOnTotal;

    const paymentIntent = await chargeOffSession({
      bookingId: booking.id,
      stripeCustomerId: client.stripe_customer_id,
      paymentMethodId: booking.stripe_payment_method_id,
      amountCents: totalCents,
      type: "service",
      description: `Obsidian Men's Spa — ${service.name}`,
    });

    await supabase
      .from("bookings")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", booking.id);

    return Response.json({
      success: true,
      paymentIntentId: paymentIntent.id,
      amountCents: totalCents,
    });
  } catch (err) {
    console.error("Complete payment error:", err);
    return Response.json(
      { error: "Failed to process payment" },
      { status: 500 }
    );
  }
}
