import { type NextRequest } from "next/server";
import { BUSINESS, SERVICES } from "@/lib/config/business-rules";
import { supabaseServer } from "@/lib/supabase/server";

// Convert a local date+time in the given timezone to a UTC ISO string.
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

// Generate one UTC ISO string per hour from open through the last valid start time.
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

interface Booking {
  therapist_id: string;
  starts_at: string;
  ends_at: string;
}

function hasConflict(
  slotStartMs: number,
  durationMs: number,
  bufferMs: number,
  bookings: Booking[]
): boolean {
  const slotEnd = slotStartMs + durationMs + bufferMs;
  return bookings.some((b) => {
    const bStart = new Date(b.starts_at).getTime();
    const bEnd = new Date(b.ends_at).getTime() + bufferMs;
    return bStart < slotEnd && bEnd > slotStartMs;
  });
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

  const now = new Date();
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + BUSINESS.booking.maxAdvanceDays);

  if (new Date(`${date}T00:00:00`) > maxDate) {
    return Response.json(
      { error: `Cannot book more than ${BUSINESS.booking.maxAdvanceDays} days ahead` },
      { status: 400 }
    );
  }

  const supabase = supabaseServer();
  const durationMs = service.duration * 60_000;
  const bufferMs = BUSINESS.booking.bufferMinutes * 60_000;
  const minNotice = new Date(now.getTime() + BUSINESS.booking.minNoticeMinutes * 60_000);

  // Widen the query window by one buffer on each side to catch edge-case overlaps.
  const windowStart = new Date(
    new Date(toUtcIso(date, BUSINESS.hours.open, BUSINESS.timezone)).getTime() - bufferMs
  ).toISOString();
  const windowEnd = new Date(
    new Date(toUtcIso(date, BUSINESS.hours.close, BUSINESS.timezone)).getTime() + bufferMs
  ).toISOString();

  // Only confirmed bookings block slots; drafts are ephemeral.
  const { data: existingBookings } = await supabase
    .from("bookings")
    .select("therapist_id, starts_at, ends_at")
    .in("status", ["confirmed", "completed"])
    .gte("ends_at", windowStart)
    .lte("starts_at", windowEnd);

  const allBookings: Booking[] = existingBookings ?? [];

  const hourlySlots = generateHourlySlots(
    date,
    BUSINESS.hours.open,
    BUSINESS.hours.close,
    service.duration,
    BUSINESS.timezone
  );

  if (therapistId) {
    const { data: therapist } = await supabase
      .from("therapists")
      .select("id")
      .eq("id", therapistId)
      .eq("active", true)
      .single();

    if (!therapist) {
      return Response.json({ error: "Therapist not found" }, { status: 404 });
    }

    const therapistBookings = allBookings.filter(
      (b) => b.therapist_id === therapistId
    );

    const slots = hourlySlots
      .filter((start) => new Date(start) >= minNotice)
      .filter(
        (start) =>
          !hasConflict(new Date(start).getTime(), durationMs, bufferMs, therapistBookings)
      )
      .map((start) => ({
        start,
        end: new Date(new Date(start).getTime() + durationMs).toISOString(),
        therapistId,
      }));

    return Response.json({ slots }, { headers: { "Cache-Control": "no-store" } });
  }

  const { data: allTherapists } = await supabase
    .from("therapists")
    .select("id")
    .eq("active", true);

  if (!allTherapists?.length) {
    return Response.json({ error: "No therapists available" }, { status: 404 });
  }

  // For each hourly slot, pick the first therapist with no conflict.
  const slots = hourlySlots
    .filter((start) => new Date(start) >= minNotice)
    .flatMap((start) => {
      const slotStartMs = new Date(start).getTime();
      for (const t of allTherapists) {
        const bookings = allBookings.filter((b) => b.therapist_id === t.id);
        if (!hasConflict(slotStartMs, durationMs, bufferMs, bookings)) {
          return [
            {
              start,
              end: new Date(slotStartMs + durationMs).toISOString(),
              therapistId: t.id,
            },
          ];
        }
      }
      return [];
    });

  return Response.json({ slots }, { headers: { "Cache-Control": "no-store" } });
}
