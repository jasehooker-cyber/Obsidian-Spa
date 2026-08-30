import { getGoogleEnv } from "@/lib/config/env";
import { getGoogleCalendarAccessToken } from "@/lib/google/auth";

const GOOGLE_CALENDAR_API =
  "https://www.googleapis.com/calendar/v3/calendars";

interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime: string };
  end: { dateTime: string };
}

/**
 * An event as the Calendar API returns it on a read. Everything is optional
 * because Google omits empty fields — an all-day event has `date` and no
 * `dateTime`, an event with no guests has no `attendees`, and so on.
 */
export interface GoogleCalendarEvent {
  id: string;
  status?: string;
  summary?: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  start?: { dateTime?: string; date?: string; timeZone?: string };
  end?: { dateTime?: string; date?: string; timeZone?: string };
  organizer?: { email?: string; displayName?: string; self?: boolean };
  creator?: { email?: string; displayName?: string; self?: boolean };
  attendees?: Array<{
    email?: string;
    displayName?: string;
    organizer?: boolean;
    self?: boolean;
    resource?: boolean;
    responseStatus?: string;
  }>;
}

export async function createCalendarEvent(params: {
  summary: string;
  start: string;
  end: string;
  description?: string;
}): Promise<CalendarEvent> {
  const token = await getGoogleCalendarAccessToken();
  const calendarId = encodeURIComponent(getGoogleEnv().calendarId);

  const res = await fetch(
    `${GOOGLE_CALENDAR_API}/${calendarId}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: params.summary,
        description: params.description,
        start: { dateTime: params.start },
        end: { dateTime: params.end },
      }),
    }
  );

  if (!res.ok) throw new Error(`Google Calendar error: ${await res.text()}`);
  return res.json() as Promise<CalendarEvent>;
}

/**
 * Every event on `calendarId` that overlaps the window, following pagination
 * to the end. `singleEvents` expands recurring events into their individual
 * occurrences, which is what a visit history needs — one row per session, not
 * one row per series.
 */
export async function listCalendarEvents(params: {
  calendarId: string;
  timeMin: string;
  timeMax: string;
}): Promise<GoogleCalendarEvent[]> {
  const token = await getGoogleCalendarAccessToken();
  const calendarId = encodeURIComponent(params.calendarId);

  const events: GoogleCalendarEvent[] = [];
  let pageToken: string | undefined;

  do {
    const query = new URLSearchParams({
      timeMin: params.timeMin,
      timeMax: params.timeMax,
      singleEvents: "true",
      orderBy: "startTime",
      showDeleted: "false",
      maxResults: "250",
    });
    if (pageToken) query.set("pageToken", pageToken);

    const res = await fetch(
      `${GOOGLE_CALENDAR_API}/${calendarId}/events?${query}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!res.ok) {
      throw new Error(
        `Google Calendar list error (${params.calendarId}): ${await res.text()}`
      );
    }

    const page = (await res.json()) as {
      items?: GoogleCalendarEvent[];
      nextPageToken?: string;
    };

    events.push(...(page.items ?? []));
    pageToken = page.nextPageToken;
  } while (pageToken);

  return events;
}

export async function deleteCalendarEvent(eventId: string): Promise<void> {
  const token = await getGoogleCalendarAccessToken();
  const calendarId = encodeURIComponent(getGoogleEnv().calendarId);

  const res = await fetch(
    `${GOOGLE_CALENDAR_API}/${calendarId}/events/${eventId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!res.ok && res.status !== 404) {
    throw new Error(`Google Calendar delete error: ${await res.text()}`);
  }
}
