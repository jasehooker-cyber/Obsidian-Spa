import { type NextRequest } from "next/server";
import { BUSINESS, SERVICES } from "@/lib/config/business-rules";
import { getAvailableSlots } from "@/lib/cal/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const serviceId = searchParams.get("serviceId");
  const therapistId = searchParams.get("therapistId");
  const date = searchParams.get("date");

  if (!serviceId || !date) {
    return Response.json(
      { error: "serviceId and date are required" },
      { status: 400 }
    );
  }

  const service = SERVICES.find((s) => s.id === serviceId);
  if (!service) {
    return Response.json({ error: "Invalid serviceId" }, { status: 400 });
  }

  if (service.bookingMode === "request") {
    return Response.json({
      slots: [],
      message:
        "This service requires coordination. Please contact us to book.",
    });
  }

  const requestedDate = new Date(`${date}T00:00:00`);
  const now = new Date();
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + BUSINESS.booking.maxAdvanceDays);

  if (requestedDate > maxDate) {
    return Response.json(
      { error: `Cannot book more than ${BUSINESS.booking.maxAdvanceDays} days ahead` },
      { status: 400 }
    );
  }

  if (!therapistId) {
    return Response.json(
      { error: "therapistId is required" },
      { status: 400 }
    );
  }

  const supabase = supabaseServer();
  const { data: therapist } = await supabase
    .from("therapists")
    .select("cal_event_type_id")
    .eq("id", therapistId)
    .eq("active", true)
    .single();

  if (!therapist) {
    return Response.json({ error: "Therapist not found" }, { status: 404 });
  }

  const startDate = `${date}T${BUSINESS.hours.open}:00`;
  const endDate = `${date}T${BUSINESS.hours.close}:00`;

  const rawSlots = await getAvailableSlots(
    therapist.cal_event_type_id,
    startDate,
    endDate
  );

  const minNotice = new Date(
    now.getTime() + BUSINESS.booking.minNoticeMinutes * 60_000
  );

  const slots = rawSlots.filter((slot) => {
    const slotStart = new Date(slot.start);
    return slotStart >= minNotice;
  });

  return Response.json({ slots });
}
