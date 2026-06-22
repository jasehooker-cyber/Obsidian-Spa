import { assertStaffAuth, AuthError } from "@/lib/auth/staff";
import { supabaseServer } from "@/lib/supabase/server";
import { chargeOffSession } from "@/lib/payments/charge";
import { cancelBooking } from "@/lib/cal/server";
import { deleteCalendarEvent } from "@/lib/google/server";
import { getEnv } from "@/lib/config/env";
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
        cal_booking_uid, google_event_id,
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

    if (!client.stripe_customer_id || !booking.stripe_payment_method_id) {
      return Response.json(
        { error: "No payment method on file" },
        { status: 400 }
      );
    }

    const paymentIntent = await chargeOffSession({
      bookingId: booking.id,
      stripeCustomerId: client.stripe_customer_id,
      paymentMethodId: booking.stripe_payment_method_id,
      amountCents: BUSINESS.fees.lateCancelFee,
      type: "late_cancel",
      description: "Obsidian Men's Spa — Late cancellation fee",
    });

    if (booking.cal_booking_uid) {
      try {
        await cancelBooking(booking.cal_booking_uid);
      } catch (err) {
        console.error("Cal.com cancel failed:", err);
      }
    }

    if (booking.google_event_id && getEnv().google.configured) {
      try {
        await deleteCalendarEvent(booking.google_event_id);
      } catch (err) {
        console.error("Google Calendar delete failed:", err);
      }
    }

    await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", booking.id);

    return Response.json({
      success: true,
      paymentIntentId: paymentIntent.id,
      feeCents: BUSINESS.fees.lateCancelFee,
    });
  } catch (err) {
    console.error("Late cancel error:", err);
    return Response.json(
      { error: "Failed to process late cancellation" },
      { status: 500 }
    );
  }
}
