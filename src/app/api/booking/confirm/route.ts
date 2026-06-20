import { confirmBooking } from "@/lib/booking/actions";

export async function POST(request: Request) {
  try {
    const { setupIntentId } = (await request.json()) as {
      setupIntentId?: string;
    };

    if (!setupIntentId) {
      return Response.json(
        { error: "setupIntentId is required" },
        { status: 400 }
      );
    }

    const { bookingId } = await confirmBooking(setupIntentId);
    return Response.json({ bookingId });
  } catch (err) {
    console.error("Booking confirmation error:", err);
    return Response.json(
      { error: "Failed to confirm booking" },
      { status: 500 }
    );
  }
}
