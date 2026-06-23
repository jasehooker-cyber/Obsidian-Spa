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

  const supabase = supabaseServer();

  const startDate = `${date}T${BUSINESS.hours.open}:00`;
  const endDate = `${date}T${BUSINESS.hours.close}:00`;

  const minNotice = new Date(
    now.getTime() + BUSINESS.booking.minNoticeMinutes * 60_000
  );

  if (therapistId) {
    const { data: therapist } = await supabase
      .from("therapists")
      .select("cal_event_type_id")
      .eq("id", therapistId)
      .eq("active", true)
      .single();

    if (!therapist) {
      return Response.json({ error: "Therapist not found" }, { status: 404 });
    }

    const rawSlots = await getAvailableSlots(
      therapist.cal_event_type_id,
      startDate,
      endDate
    );

    const slots = rawSlots
      .filter((slot) => new Date(slot.start) >= minNotice)
      .map((slot) => {
        const endTime = new Date(
          new Date(slot.start).getTime() + service.duration * 60_000
        );
        return { start: slot.start, end: endTime.toISOString(), therapistId };
      });

    return Response.json({ slots });
  }

  const { data: allTherapists } = await supabase
    .from("therapists")
    .select("id, cal_event_type_id")
    .eq("active", true);

  if (!allTherapists?.length) {
    return Response.json({ error: "No therapists available" }, { status: 404 });
  }

  const slotResults = await Promise.all(
    allTherapists.map(async (t) => {
      const rawSlots = await getAvailableSlots(
        t.cal_event_type_id,
        startDate,
        endDate
      );
      return rawSlots.map((slot) => ({ ...slot, therapistId: t.id }));
    })
  );

  const seen = new Set<string>();
  const slots = slotResults
    .flat()
    .filter((slot) => new Date(slot.start) >= minNotice)
    .filter((slot) => {
      if (seen.has(slot.start)) return false;
      seen.add(slot.start);
      return true;
    })
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .map((slot) => {
      const endTime = new Date(
        new Date(slot.start).getTime() + service.duration * 60_000
      );
      return { start: slot.start, end: endTime.toISOString(), therapistId: slot.therapistId };
    });

  return Response.json({ slots });
}
