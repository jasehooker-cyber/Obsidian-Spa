import ICAL from "ical.js";
import { BUSINESS } from "@/lib/config/business-rules";
import { getEventsCalendarEnv } from "@/lib/config/env";

/**
 * The public events calendar: classes and workshops read from the "Obsidian
 * Events" Google Calendar, never the bookings calendar. That calendar is set
 * to public in Google, so it is read from Google's public iCal feed with no
 * credentials. Everything on it — title, time, location, description — is
 * shown on the website, so client appointments must not live there.
 */

/** How far ahead the Events page looks. */
export const EVENTS_HORIZON_DAYS = 120;

/** Safety cap when expanding a repeating event. */
const MAX_OCCURRENCES_PER_EVENT = 500;

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

/** The public iCal feed Google serves for a public calendar. */
export function publicFeedUrl(calendarId: string): string {
  return `https://calendar.google.com/calendar/ical/${encodeURIComponent(
    calendarId
  )}/public/basic.ics`;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** `YYYY-MM-DD` for an all-day date; an ISO instant for a timed one. */
function stamp(time: ICAL.Time): string {
  return time.isDate
    ? `${time.year}-${pad(time.month)}-${pad(time.day)}`
    : time.toJSDate().toISOString();
}

function isCancelled(event: ICAL.Event): boolean {
  const status = event.component.getFirstPropertyValue("status");
  return typeof status === "string" && status.toUpperCase() === "CANCELLED";
}

function text(event: ICAL.Event, name: string): string {
  const value = event.component.getFirstPropertyValue(name);
  return typeof value === "string" ? value : "";
}

/**
 * Every occurrence that overlaps [from, to), from an iCal feed. Repeating
 * events are expanded, edited and cancelled occurrences are honoured, and
 * times are converted using the time zones the feed itself defines.
 */
export function parseIcsFeed(ics: string, from: Date, to: Date): PublicEvent[] {
  const root = new ICAL.Component(ICAL.parse(ics));
  for (const zone of root.getAllSubcomponents("vtimezone")) {
    ICAL.TimezoneService.register(zone);
  }

  const masters = new Map<string, ICAL.Event>();
  const exceptions: ICAL.Event[] = [];
  for (const component of root.getAllSubcomponents("vevent")) {
    const event = new ICAL.Event(component);
    if (event.isRecurrenceException()) exceptions.push(event);
    else masters.set(event.uid, event);
  }
  for (const exception of exceptions) {
    masters.get(exception.uid)?.relateException(exception);
  }

  const fromMs = from.getTime();
  const toMs = to.getTime();
  const out: PublicEvent[] = [];

  const keep = (item: ICAL.Event, start: ICAL.Time, end: ICAL.Time) => {
    if (isCancelled(item)) return;
    const title = item.summary?.trim();
    if (!title) return;
    const startMs = start.toJSDate().getTime();
    const endMs = end.toJSDate().getTime();
    if (endMs <= fromMs || startMs >= toMs) return;
    out.push({
      id: `${item.uid}:${stamp(start)}`,
      title,
      description: plainText(text(item, "description")),
      location: text(item, "location").trim(),
      start: stamp(start),
      end: stamp(end),
      allDay: start.isDate,
    });
  };

  for (const event of masters.values()) {
    if (!event.isRecurring()) {
      keep(event, event.startDate, event.endDate);
      continue;
    }
    const iterator = event.iterator();
    for (let i = 0; i < MAX_OCCURRENCES_PER_EVENT; i++) {
      const next = iterator.next();
      if (!next || next.toJSDate().getTime() >= toMs) break;
      const details = event.getOccurrenceDetails(next);
      keep(details.item, details.startDate, details.endDate);
    }
  }

  return sortEvents(out);
}

/** Upcoming events from the events calendar, soonest first. */
export async function getUpcomingEvents(
  now: Date = new Date()
): Promise<UpcomingEvents> {
  const { calendarId } = getEventsCalendarEnv();
  if (!calendarId) {
    console.warn("Events calendar not read: no calendar id");
    return { status: "unconfigured", events: [] };
  }

  try {
    const res = await fetch(publicFeedUrl(calendarId), {
      next: { revalidate: 300 },
    });
    if (!res.ok) {
      // 404 here means the calendar is not set to public in Google.
      throw new Error(`public feed returned ${res.status}`);
    }
    const events = parseIcsFeed(
      await res.text(),
      now,
      new Date(now.getTime() + EVENTS_HORIZON_DAYS * 24 * 60 * 60 * 1000)
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
