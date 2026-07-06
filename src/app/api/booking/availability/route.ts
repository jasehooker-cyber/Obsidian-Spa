import { type NextRequest } from "next/server";
import { BUSINESS, SERVICES } from "@/lib/config/business-rules";
import { getAvailableSlots } from "@/lib/cal/server";
import { supabaseServer } from "@/lib/supabase/server";

// Convert a local date+time in the given timezone to a UTC ISO string.
// Without this, Cal.com treats bare strings like "2026-07-06T22:00:00" as UTC,
// which cuts the day off at 6pm ET instead of 10pm ET.
function toUtcIso(dateStr: string, timeStr: string, tz: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);
  const refMs = Date.UTC(year, month - 1, day, hour, minute, 0);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const parts = formatter.formatToParts(new Date(refMs));
  const p = Object.fromEntries(parts.map(({ type, value }) => [type, Number(value)]));
  const localMs = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, 0);
  return new Date(refMs + (refMs - localMs)).toISOString();
}

// Generate one UTC ISO string per hour from open through the last possible
// start time (close minus session duration). Cal.com's 30-min slot intervals
// would otherwise produce gaps like 8am, 9:30am, 11am instead of every hour.
function generateHourlySlots(
  dateStr: string,
  openTime: string,
  closeTime: string,
  durationMinutes: number,
  tz: string
): string[] {
  const [openHour] = openTime.split(":").map(Number);
  const [closeHour, closeMin] = closeTime.split(":").map(Number);
  const lastStartHour = Math.floor(
    (closeHour * 60 + closeMin - durationMinutes) / 60
  );
  const slots: string[] = [];
  for (let h = openHour; h <= lastStartHour; h++) {
    slots.push(toUtcIso(dateStr, `${String(h).padStart(2, "0")}:00`, tz));
  }
  return slots;
}

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

  const startDate = toUtcIso(date, BUSINESS.hours.open, BUSINESS.timezone);
  const endDate = toUtcIso(date, BUSINESS.hours.close, BUSINESS.timezone);

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

    // Cal.com tells us which times are free; we normalise to hourly boundaries.
    const calAvailable = new Set(
      rawSlots.map((s) => Math.floor(new Date(s.start).getTime() / 60_000))
    );

    const slots = generateHourlySlots(
      date,
      BUSINESS.hours.open,
      BUSINESS.hours.close,
      service.duration,
      BUSINESS.timezone
    )
      .filter((start) => new Date(start) >= minNotice)
      .filter((start) =>
        calAvailable.has(Math.floor(new Date(start).getTime() / 60_000))
      )
      .map((start) => ({
        start,
        end: new Date(
          new Date(start).getTime() + service.duration * 60_000
        ).toISOString(),
        therapistId,
      }));

    return Response.json({ slots }, {
      headers: { "Cache-Control": "no-store" },
    });
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

  // Build a map of UTC-minute → therapistId from all available Cal.com slots
  const calAvailable = new Map<number, string>();
  for (const slot of slotResults.flat()) {
    const minute = Math.floor(new Date(slot.start).getTime() / 60_000);
    if (!calAvailable.has(minute)) calAvailable.set(minute, slot.therapistId);
  }

  const slots = generateHourlySlots(
    date,
    BUSINESS.hours.open,
    BUSINESS.hours.close,
    service.duration,
    BUSINESS.timezone
  )
    .filter((start) => new Date(start) >= minNotice)
    .filter((start) =>
      calAvailable.has(Math.floor(new Date(start).getTime() / 60_000))
    )
    .map((start) => {
      const minute = Math.floor(new Date(start).getTime() / 60_000);
      return {
        start,
        end: new Date(
          new Date(start).getTime() + service.duration * 60_000
        ).toISOString(),
        therapistId: calAvailable.get(minute)!,
      };
    });

  return Response.json({ slots }, {
    headers: { "Cache-Control": "no-store" },
  });
}
