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

async function getAccessToken(): Promise<string> {
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
  const data = (await res.json()) as { access_token: string };
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
