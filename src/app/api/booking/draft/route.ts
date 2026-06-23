import { BookingDraftSchema } from "@/lib/schemas/booking";
import { createDraftBooking } from "@/lib/booking/actions";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = BookingDraftSchema.safeParse(body);

    if (!result.success) {
      return Response.json(
        { error: "Invalid booking data", details: result.error.issues },
        { status: 400 }
      );
    }

    const { draftId } = await createDraftBooking(result.data);
    return Response.json({ draftId });
  } catch (err) {
    console.error("Draft booking error:", err);
    return Response.json(
      { error: "Failed to create booking draft" },
      { status: 500 }
    );
  }
}
