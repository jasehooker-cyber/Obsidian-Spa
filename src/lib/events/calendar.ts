import { BUSINESS } from "@/lib/config/business-rules";
import { getEventsCalendarEnv } from "@/lib/config/env";
import {
  listCalendarEvents,
  type GoogleCalendarEvent,
} from "@/lib/google/server";

/**
 * The public events calendar: classes and workshops read from a dedicated
 * Google Calendar (GOOGLE_EVENTS_CALENDAR_ID), never the bookings calendar.
 * Everything on that calendar is shown publicly — its title, time,
 * location and description — so client appointments must not live there.
 */

/** How far ahead the Events page looks. */
export const EVENTS_HORIZON_DAYS = 120;

export interface PublicEvent {
  id: string;
  title: string;
  description: string;
  location: string;
  /** ISO instant for timed events; `YYYY-MM-DD` for all-day events. */
  start: string;
  /** Exclusive end, in the same form as `start`. */
  end: string;
  allDay: boolean;
}

export type UpcomingEvents =
  | { status: "ok"; events: PublicEvent[] }
  | { status: "unconfigured" | "error"; events: [] };

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

/**
 * Google stores descriptions written in its editor as light HTML. Reduce it
 * to plain text — rendered as text, never as markup — keeping line breaks.
 */
export function plainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]*>/g, "")
    .replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (match, code: string) => {
      if (code[0] === "#") {
        const n =
          code[1].toLowerCase() === "x"
            ? parseInt(code.slice(2), 16)
            : parseInt(code.slice(1), 10);
        return Number.isFinite(n) ? String.fromCodePoint(n) : match;
      }
      return ENTITIES[code.toLowerCase()] ?? match;
    })
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/** A calendar entry as the website shows it, or null if it should not show. */
export function toPublicEvent(event: GoogleCalendarEvent): PublicEvent | null {
  if (event.status === "cancelled") return null;
  const title = event.summary?.trim();
  if (!title) return null;

  const allDay = !event.start?.dateTime && !!event.start?.date;
  const start = event.start?.dateTime ?? event.start?.date;
  const end = event.end?.dateTime ?? event.end?.date ?? start;
  if (!start || !end) return null;

  return {
    id: event.id,
    title,
    description: plainText(event.description ?? ""),
    location: event.location?.trim() ?? "",
    start,
    end,
    allDay,
  };
}

/** Upcoming events from the events calendar, soonest first. */
export async function getUpcomingEvents(
  now: Date = new Date()
): Promise<UpcomingEvents> {
  const { calendarId, authConfigured } = getEventsCalendarEnv();
  if (!calendarId || !authConfigured) {
    console.warn(
      `Events calendar not read: ${!calendarId ? "no calendar id" : "Google auth is not configured in this environment"}`
    );
    return { status: "unconfigured", events: [] };
  }

  try {
    const raw = await listCalendarEvents({
      calendarId,
      timeMin: now.toISOString(),
      timeMax: new Date(
        now.getTime() + EVENTS_HORIZON_DAYS * 24 * 60 * 60 * 1000
      ).toISOString(),
    });
    const events = sortEvents(
      raw
        .map(toPublicEvent)
        .filter((event): event is PublicEvent => event !== null)
    );
    return { status: "ok", events };
  } catch (error) {
    console.error(
      "Events calendar read failed:",
      error instanceof Error ? error.message : error
    );
    return { status: "error", events: [] };
  }
}

// ---------------------------------------------------------------------------
// Display — always in the spa's timezone, whatever the visitor's clock says
// ---------------------------------------------------------------------------

const TZ = BUSINESS.timezone;

/** All-day dates are calendar days, so they are read and shown in UTC. */
function dayOf(event: PublicEvent): Date {
  return event.allDay ? new Date(`${event.start}T00:00:00Z`) : new Date(event.start);
}

function zoneFor(event: PublicEvent): string {
  return event.allDay ? "UTC" : TZ;
}

/**
 * `2026-10-24T19:30` in the spa's timezone, so all-day and timed events sort
 * together correctly whatever timezone the server runs in. All-day events
 * sort to the top of their day.
 */
function sortKey(event: PublicEvent): string {
  if (event.allDay) return `${event.start}T00:00`;
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(event.start));
  const get = (type: string) => p.find((x) => x.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/** Soonest first. */
export function sortEvents(events: PublicEvent[]): PublicEvent[] {
  return [...events].sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
}

function part(
  date: Date,
  timeZone: string,
  options: Intl.DateTimeFormatOptions
): string {
  return new Intl.DateTimeFormat("en-US", { timeZone, ...options }).format(date);
}

/** The pieces for an event's date badge: `SAT`, `24`, `OCT`. */
export function dateBadge(event: PublicEvent) {
  const date = dayOf(event);
  const zone = zoneFor(event);
  return {
    weekday: part(date, zone, { weekday: "short" }).toUpperCase(),
    day: part(date, zone, { day: "numeric" }),
    month: part(date, zone, { month: "short" }).toUpperCase(),
  };
}

/** `7:00 – 8:30 PM`, `11:30 AM – 1:00 PM`, `All day`, or `Oct 24 – 26`. */
export function timeLabel(event: PublicEvent): string {
  if (event.allDay) {
    const first = new Date(`${event.start}T00:00:00Z`);
    const last = new Date(new Date(`${event.end}T00:00:00Z`).getTime() - 86_400_000);
    if (last.getTime() <= first.getTime()) return "All day";
    const md = (d: Date) => part(d, "UTC", { month: "short", day: "numeric" });
    return first.getUTCMonth() === last.getUTCMonth()
      ? `${md(first)} – ${part(last, "UTC", { day: "numeric" })}`
      : `${md(first)} – ${md(last)}`;
  }

  const start = new Date(event.start);
  const end = new Date(event.end);
  const time = (d: Date) =>
    part(d, TZ, { hour: "numeric", minute: "2-digit", hour12: true });
  const [startTime, startPeriod] = time(start).split(" ");
  const [endTime, endPeriod] = time(end).split(" ");
  const sameDay =
    part(start, TZ, { dateStyle: "short" }) === part(end, TZ, { dateStyle: "short" });

  if (!sameDay) {
    return `${time(start)} – ${part(end, TZ, { month: "short", day: "numeric" })}, ${time(end)}`;
  }
  return startPeriod === endPeriod
    ? `${startTime} – ${endTime} ${endPeriod}`
    : `${time(start)} – ${time(end)}`;
}

/** A full, unambiguous date and time, for the reservation email. */
export function longWhen(event: PublicEvent): string {
  const date = part(dayOf(event), zoneFor(event), {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  return event.allDay ? date : `${date}, ${timeLabel(event)}`;
}

export interface MonthGroup {
  /** `2026-10` — stable React key. */
  key: string;
  /** `October 2026` */
  label: string;
  events: PublicEvent[];
}

/** Events bucketed by the month they start in, in the spa's timezone. */
export function groupByMonth(events: PublicEvent[]): MonthGroup[] {
  const groups: MonthGroup[] = [];
  for (const event of events) {
    const date = dayOf(event);
    const zone = zoneFor(event);
    const year = part(date, zone, { year: "numeric" });
    const month = part(date, zone, { month: "2-digit" });
    const key = `${year}-${month}`;
    let group = groups.find((g) => g.key === key);
    if (!group) {
      group = {
        key,
        label: part(date, zone, { month: "long", year: "numeric" }),
        events: [],
      };
      groups.push(group);
    }
    group.events.push(event);
  }
  return groups;
}
