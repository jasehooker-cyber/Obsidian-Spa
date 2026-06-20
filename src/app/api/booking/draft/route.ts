import { BookingDraftSchema } from "@/lib/schemas/booking";
import { createDraftBooking } from "@/lib/booking/actions";
import { SERVICES } from "@/lib/config/business-rules";

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

    const service = SERVICES.find((s) => s.id === result.data.serviceId);
    if (service?.bookingMode === "request") {
      return Response.json(
        { error: "This service requires coordination. Please contact us." },
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
