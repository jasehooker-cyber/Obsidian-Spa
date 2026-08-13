import { z } from "zod/v4";
import { confirmBooking } from "@/lib/booking/actions";

const ConfirmSchema = z.object({
  setupIntentId: z.string().min(1).max(255),
});

/**
 * Called after Stripe redirects the client back from the card form.
 * Verifies the SetupIntent with Stripe before promoting the booking, so the
 * client-supplied id alone can never confirm anything.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = ConfirmSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const { bookingId } = await confirmBooking(parsed.data.setupIntentId);
    return Response.json({ bookingId });
  } catch (err) {
    console.error("Booking confirmation failed:", err);
    return Response.json(
      { error: "Could not confirm your booking. Please contact us." },
      { status: 500 }
    );
  }
}
