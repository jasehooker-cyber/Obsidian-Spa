import { getEnv } from "@/lib/config/env";

const CAL_BASE = "https://api.cal.com/v2";

/**
 * A Cal.com booking, normalised to the handful of fields we store.
 * Cal.com's webhook payload and its REST response use different field names,
 * so every code path fetches the booking from the API and normalises here.
 */
export interface CalBooking {
  uid: string;
  eventTypeId: number | null;
  start: string;
  end: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone: string | null;
  metadata: Record<string, unknown>;
}

interface CalBookingResponse {
  data?: {
    uid?: string;
    eventTypeId?: number;
    eventType?: { id?: number };
    start?: string;
    end?: string;
    startTime?: string;
    endTime?: string;
    duration?: number;
    attendees?: {
      name?: string;
      email?: string;
      phoneNumber?: string;
      timeZone?: string;
    }[];
    metadata?: Record<string, unknown>;
  };
}

async function calFetch<T>(
  path: string,
  options: RequestInit & { apiVersion: string }
): Promise<T> {
  const { apiVersion, ...fetchOptions } = options;
  const res = await fetch(`${CAL_BASE}${path}`, {
    ...fetchOptions,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${getEnv().cal.apiKey}`,
      "Content-Type": "application/json",
      "cal-api-version": apiVersion,
      ...fetchOptions.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Cal.com API error ${res.status}: ${body}`);
  }

  return res.json() as Promise<T>;
}

/**
 * Fetch a booking by its Cal.com uid. This is the single source of truth for
 * booking details: webhooks only hand us a uid, and a redirected client only
 * knows a uid, so both read the real booking through here.
 */
export async function getBooking(bookingUid: string): Promise<CalBooking> {
  const body = await calFetch<CalBookingResponse>(
    `/bookings/${encodeURIComponent(bookingUid)}`,
    { method: "GET", apiVersion: getEnv().cal.versions.bookings }
  );

  const data = body.data;
  if (!data) throw new Error(`Cal.com booking ${bookingUid} has no data`);

  const start = data.start ?? data.startTime;
  if (!start) throw new Error(`Cal.com booking ${bookingUid} has no start time`);

  // Cal.com omits `end` on some event types; derive it from the duration.
  const end =
    data.end ??
    data.endTime ??
    (data.duration
      ? new Date(new Date(start).getTime() + data.duration * 60_000).toISOString()
      : undefined);
  if (!end) throw new Error(`Cal.com booking ${bookingUid} has no end time`);

  const attendee = data.attendees?.[0];
  if (!attendee?.email) {
    throw new Error(`Cal.com booking ${bookingUid} has no attendee email`);
  }

  return {
    uid: data.uid ?? bookingUid,
    eventTypeId: data.eventTypeId ?? data.eventType?.id ?? null,
    start: new Date(start).toISOString(),
    end: new Date(end).toISOString(),
    attendeeName: attendee.name?.trim() || attendee.email,
    attendeeEmail: attendee.email.toLowerCase(),
    attendeePhone: attendee.phoneNumber ?? null,
    metadata: data.metadata ?? {},
  };
}

export async function cancelBooking(bookingUid: string): Promise<void> {
  await calFetch(`/bookings/${encodeURIComponent(bookingUid)}/cancel`, {
    method: "POST",
    apiVersion: getEnv().cal.versions.bookings,
  });
}
