import { getEnv } from "@/lib/config/env";
import { createPrivateKey, createSign } from "crypto";

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

/**
 * Cached service-account token. A CRM sync pages through several calendars in
 * one run, and minting a fresh JWT per request wastes a round trip each time.
 * Refreshed a minute early so a token never expires mid-flight.
 */
let tokenCache: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) {
    return tokenCache.token;
  }

  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(
    JSON.stringify({ alg: "RS256", typ: "JWT" })
  ).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      iss: getEnv().google.clientEmail,
      scope: "https://www.googleapis.com/auth/calendar",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })
  ).toString("base64url");

  const key = createPrivateKey(
    getEnv().google.privateKey.replace(/\\n/g, "\n")
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${payload}`);
  const signature = signer.sign(key, "base64url");

  const jwt = `${header}.${payload}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!res.ok) throw new Error(`Google auth failed: ${await res.text()}`);
  const data = (await res.json()) as {
    access_token: string;
    expires_in?: number;
  };

  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + ((data.expires_in ?? 3600) - 60) * 1000,
  };

  return data.access_token;
}

export async function createCalendarEvent(params: {
  summary: string;
  start: string;
  end: string;
  description?: string;
}): Promise<CalendarEvent> {
  const token = await getAccessToken();
  const calendarId = encodeURIComponent(getEnv().google.calendarId);

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
  const token = await getAccessToken();
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
  const token = await getAccessToken();
  const calendarId = encodeURIComponent(getEnv().google.calendarId);

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
