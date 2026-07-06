import { getEnv } from "@/lib/config/env";

const CAL_BASE = "https://api.cal.com/v2";

interface CalSlot {
  start: string;
  end: string;
}

interface CalSlotsResponse {
  data: Record<string, CalSlot[]>;
}

interface CalBookingInput {
  eventTypeId: number;
  start: string;
  attendee: {
    name: string;
    email: string;
    timeZone: string;
  };
  metadata?: Record<string, string>;
}

interface CalBookingResponse {
  data: {
    uid: string;
    status: string;
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

export async function getAvailableSlots(
  eventTypeId: number,
  startDate: string,
  endDate: string
): Promise<CalSlot[]> {
  const params = new URLSearchParams({
    eventTypeId: String(eventTypeId),
    start: startDate,
    end: endDate,
  });

  const data = await calFetch<CalSlotsResponse>(
    `/slots?${params}`,
    { method: "GET", apiVersion: getEnv().cal.versions.slots }
  );

  return Object.values(data.data).flat();
}

export async function createBooking(
  input: CalBookingInput
): Promise<CalBookingResponse["data"]> {
  const data = await calFetch<CalBookingResponse>("/bookings", {
    method: "POST",
    apiVersion: getEnv().cal.versions.bookings,
    body: JSON.stringify(input),
  });

  return data.data;
}

export async function cancelBooking(bookingUid: string): Promise<void> {
  await calFetch(`/bookings/${bookingUid}/cancel`, {
    method: "POST",
    apiVersion: getEnv().cal.versions.bookings,
  });
}
