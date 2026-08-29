/**
 * Turns a Google Calendar event into a client visit.
 *
 * The calendar is the only complete record of who has been on the table: some
 * sessions arrive through Cal.com, others are typed in by hand, and the same
 * calendar also carries ordinary business events that must be left alone. This
 * module is the part that tells them apart, and it is pure — no network, no
 * database — so every shape below is covered by tests.
 *
 * Three shapes appear in practice:
 *
 * 1. Cal.com bookings. The summary reads `<Service> between <Us> and <Client>`
 *    and the description is Cal's structured block:
 *
 *      What:
 *      The Forge (90 min) between Jase Hooker and Joshua Sheppard
 *      ...
 *      Who:
 *      Jase Hooker - Organizer
 *      jase@obsidianspas.com
 *      Joshua Sheppard
 *      jpsheppa@gmail.com
 *      ...
 *      Reason for the visit:
 *      Jace expertise
 *      Phone number:
 *      +13124049065
 *
 * 2. Hand-typed sessions: `Michael Moore - 4 hand Massage`, `Zach massage`.
 *    A name, a rough service, and usually no contact details at all.
 *
 * 3. Everything else on the calendar — deliveries, coworking, sales calls, and
 *    third-party Cal.com invites that share shape 1's description format.
 *    These must not become clients.
 */

import { CAL_SERVICES, type CalService } from "@/lib/config/cal-events";
import type { GoogleCalendarEvent } from "@/lib/google/server";

export interface ParsedVisit {
  googleEventId: string;
  googleCalendarId: string;
  googleEventUrl: string | null;
  /** Matches an id in cal-events.ts, or null for off-menu work. */
  serviceId: string | null;
  serviceName: string | null;
  durationMinutes: number;
  priceCents: number | null;
  priceSource: "recorded" | "list" | "unknown";
  startsAt: string;
  endsAt: string;
  source: "cal.com" | "manual";
  notes: string | null;
  client: {
    name: string | null;
    email: string | null;
    phone: string | null;
  };
}

/** Words that mark an event as bodywork rather than admin. */
const SERVICE_KEYWORDS =
  /\b(massage|bodywork|deep\s?tissue|four[\s-]?hand(?:ed)?|4[\s-]?hand(?:ed)?|couples)\b/i;

/**
 * Words that mark a summary as spa *operations*, not a session — "Get massage
 * oil" and "Massage table delivery" both mention massage. Only ever tested
 * against the summary, never the description, because a client's own note
 * ("work desk, long calls") should not disqualify their visit. A recognised
 * menu service overrides this entirely.
 */
const OPERATIONS_TERMS =
  /\b(order|ordered|delivery|deliver|buy|bought|purchase|pick\s?up|pickup|restock|supplies|supply|inventory|oil|lotion|linen|linens|laundry|table|equipment|interview|training|onboarding|meeting|zoom|cowork|ads?|marketing|yelp|verification|wifi|install|repair|rent|lease|invoice|payroll|photoshoot|cleaning|maintenance|inspection|walkthrough)\b/i;

/** `paid 120`, `paid $120`, `PAID $1,200.50`. */
const PAID_PATTERN = /\bpaid\s*\$?\s*(\d[\d,]*(?:\.\d{1,2})?)/i;
/** A bare `$120`, trusted in a summary only. */
const DOLLAR_PATTERN = /\$\s*(\d[\d,]*(?:\.\d{1,2})?)/;

/** Cal.com appends a session length to some event names: `The Forge (90 min)`. */
const DURATION_SUFFIX = /\s*\(\s*\d+\s*min[a-z]*\s*\)\s*/gi;

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanServiceName(name: string): string {
  return name.replace(DURATION_SUFFIX, " ").replace(/\s+/g, " ").trim();
}

function parseAmountToCents(raw: string): number | null {
  const amount = Number(raw.replace(/,/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.round(amount * 100);
}

/**
 * To E.164 where we can manage it. US numbers are assumed for bare 10-digit
 * input, which is what the booking form produces. Anything we cannot make
 * sense of is dropped rather than stored badly — a wrong number in an outreach
 * list is worse than a blank one.
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;

  const trimmed = raw.trim();
  if (!trimmed || /^(undefined|null|n\/?a|none)$/i.test(trimmed)) return null;

  const hadPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");

  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (hadPlus && digits.length >= 8 && digits.length <= 15) return `+${digits}`;

  return null;
}

function isEmail(line: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(line.trim());
}

// ---------------------------------------------------------------------------
// Cal.com description block
// ---------------------------------------------------------------------------

interface WhoEntry {
  name: string;
  email: string;
  isOrganizer: boolean;
}

export interface CalDescription {
  serviceName: string | null;
  organizerName: string | null;
  clientName: string | null;
  phone: string | null;
  reason: string | null;
  who: WhoEntry[];
  isCalBooking: boolean;
}

/** Value on the line(s) after a `Label:` header. */
function labelledValue(description: string, label: string): string | null {
  const pattern = new RegExp(
    `^${label}[^\\n:]*:[ \\t]*\\r?\\n[ \\t]*(.+)$`,
    "mi"
  );
  const match = description.match(pattern);
  const value = match?.[1]?.trim();
  if (!value || /^(undefined|null)$/i.test(value)) return null;
  return value;
}

/**
 * Splits `<Service> between <Organizer> and <Client>`.
 *
 * Deliberately splits on the *first* ` and ` after ` between `, so a client
 * called "Bill and Ted" survives — the organizer is always our own single name.
 */
function splitBetween(
  line: string
): { serviceName: string; organizerName: string; clientName: string } | null {
  const betweenAt = line.indexOf(" between ");
  if (betweenAt === -1) return null;

  const rest = line.slice(betweenAt + " between ".length);
  const andAt = rest.indexOf(" and ");
  if (andAt === -1) return null;

  const serviceName = cleanServiceName(line.slice(0, betweenAt));
  const organizerName = rest.slice(0, andAt).trim();
  const clientName = rest.slice(andAt + " and ".length).trim();

  if (!serviceName || !organizerName || !clientName) return null;
  return { serviceName, organizerName, clientName };
}

/** The `Who:` block: alternating display names and the email beneath each. */
function parseWhoBlock(description: string): WhoEntry[] {
  // Deliberately not /m: with the multiline flag the trailing `$` would match
  // the end of the *first* line and the lazy capture would stop there, taking
  // only the organizer. The line anchor is spelled out instead.
  const match = description.match(
    /(?:^|\r?\n)Who:[ \t]*\r?\n([\s\S]*?)(?=\r?\n[ \t]*\r?\n|$)/i
  );
  if (!match) return [];

  const lines = match[1]
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const entries: WhoEntry[] = [];
  let pendingName: string | null = null;

  for (const line of lines) {
    if (isEmail(line)) {
      if (pendingName !== null) {
        const isOrganizer = /-\s*organizer\s*$/i.test(pendingName);
        entries.push({
          name: pendingName.replace(/\s*-\s*organizer\s*$/i, "").trim(),
          email: line.toLowerCase(),
          isOrganizer,
        });
        pendingName = null;
      }
    } else {
      pendingName = line;
    }
  }

  return entries;
}

export function parseCalDescription(
  description: string | undefined
): CalDescription {
  const empty: CalDescription = {
    serviceName: null,
    organizerName: null,
    clientName: null,
    phone: null,
    reason: null,
    who: [],
    isCalBooking: false,
  };

  if (!description) return empty;

  const whatLine = labelledValue(description, "What");
  const parts = whatLine ? splitBetween(whatLine) : null;

  return {
    serviceName: parts?.serviceName ?? null,
    organizerName: parts?.organizerName ?? null,
    clientName: parts?.clientName ?? null,
    phone: normalizePhone(labelledValue(description, "Phone number")),
    reason: labelledValue(description, "Reason for the visit"),
    who: parseWhoBlock(description),
    // Cal.com signs off every invite with its reschedule link.
    isCalBooking:
      /cal\.com\/booking\//i.test(description) || parts !== null,
  };
}

// ---------------------------------------------------------------------------
// Service and price
// ---------------------------------------------------------------------------

/**
 * Longest names first, so a service whose name contains another's still wins
 * on specificity.
 */
const SERVICES_BY_SPECIFICITY = [...CAL_SERVICES].sort(
  (a, b) => b.name.length - a.name.length
);

export function matchService(text: string | null): CalService | null {
  if (!text) return null;
  const haystack = normalize(text);
  if (!haystack) return null;

  return (
    SERVICES_BY_SPECIFICITY.find((service) =>
      haystack.includes(normalize(service.name))
    ) ?? null
  );
}

/**
 * Menu price for a service at the length actually booked. A calendar block can
 * run a few minutes long, so an exact match is preferred but a near one is
 * accepted; beyond that we would be guessing, and a guessed price pollutes
 * lifetime value.
 */
export function listPriceFor(
  service: CalService,
  minutes: number
): number | null {
  const exact = service.durations.find((d) => d.minutes === minutes);
  if (exact) return exact.price;

  const nearest = [...service.durations].sort(
    (a, b) => Math.abs(a.minutes - minutes) - Math.abs(b.minutes - minutes)
  )[0];

  if (nearest && Math.abs(nearest.minutes - minutes) <= 15) return nearest.price;
  if (service.durations.length === 1) return service.durations[0].price;
  return null;
}

/**
 * An amount written on the event by hand — `... paid 120`. This is what was
 * actually collected, so it outranks the menu price, which is frequently not
 * what changed hands.
 */
export function extractRecordedPrice(
  summary: string | undefined,
  description: string | undefined
): number | null {
  for (const text of [summary, description]) {
    if (!text) continue;
    const paid = text.match(PAID_PATTERN);
    if (paid) {
      const cents = parseAmountToCents(paid[1]);
      if (cents !== null) return cents;
    }
  }

  // A bare dollar amount is only trustworthy in the short, hand-written
  // summary; descriptions carry marketing copy and reschedule links.
  const dollars = summary?.match(DOLLAR_PATTERN);
  if (dollars) return parseAmountToCents(dollars[1]);

  return null;
}

/** Removes a trailing `paid 120` so it cannot end up inside a client's name. */
function stripPriceAnnotations(summary: string): string {
  return summary
    .replace(PAID_PATTERN, " ")
    .replace(DOLLAR_PATTERN, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------------------------------------------------------------------------
// Hand-typed events
// ---------------------------------------------------------------------------

/**
 * Pulls a name out of `Michael Moore - 4 hand Massage` or `Zach massage`.
 * Returns null when what is left over is not plausibly a person.
 */
export function parseManualSummary(
  summary: string
): { clientName: string | null; serviceName: string | null } {
  const cleaned = stripPriceAnnotations(summary);
  const segments = cleaned
    .split(/\s+[-–—|:]\s+|\s*[-–—|]\s+|\s+[-–—|]\s*/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (segments.length >= 2) {
    const serviceAt = segments.findIndex((part) => SERVICE_KEYWORDS.test(part));
    if (serviceAt !== -1) {
      const nameParts = segments.filter((_, i) => i !== serviceAt);
      return {
        clientName: nameParts.join(" ").trim() || null,
        serviceName: segments[serviceAt],
      };
    }
    return { clientName: segments[0] || null, serviceName: null };
  }

  // One segment: strip the service word and keep whatever is left.
  const keyword = cleaned.match(SERVICE_KEYWORDS);
  if (!keyword) return { clientName: cleaned || null, serviceName: null };

  const name = cleaned
    .replace(SERVICE_KEYWORDS, " ")
    .replace(/\b(for|with|the|a|an)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  return {
    clientName: name || null,
    serviceName: keyword[0],
  };
}

// ---------------------------------------------------------------------------
// Attendees
// ---------------------------------------------------------------------------

/**
 * True when an email address plausibly belongs to the named person. Guards the
 * hand-typed case, where the only attendees are often staff: without this,
 * "Michael Moore - 4 hand Massage" would file the owner's own address as
 * Michael's.
 */
function emailResembles(
  name: string,
  email: string,
  displayName?: string
): boolean {
  const nameTokens = normalize(name)
    .split(" ")
    .filter((token) => token.length >= 3);
  if (nameTokens.length === 0) return false;

  if (displayName && normalize(displayName) === normalize(name)) return true;

  const localPart = normalize(email.split("@")[0]);
  return nameTokens.some((token) => localPart.includes(token));
}

/**
 * The internal addresses for one event: configured staff, the calendars we
 * watch, and whoever organised or created the event. The last two matter most
 * — on a Cal.com booking the organiser *is* the therapist, so they are
 * excluded without anyone having to configure anything.
 */
function internalEmailsFor(
  event: GoogleCalendarEvent,
  configured: Set<string>
): Set<string> {
  const internal = new Set(configured);
  for (const email of [event.organizer?.email, event.creator?.email]) {
    if (email) internal.add(email.toLowerCase());
  }
  return internal;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export interface ParseOptions {
  calendarId: string;
  /** Staff and owner addresses, lowercased. */
  internalEmails?: Set<string>;
  /** Overridable for tests. */
  now?: Date;
}

/**
 * A visit, or null when the event is not a completed massage. Null is the
 * common case: most events on a working calendar are not sessions.
 */
export function parseVisit(
  event: GoogleCalendarEvent,
  options: ParseOptions
): ParsedVisit | null {
  if (event.status === "cancelled") return null;

  const startsAt = event.start?.dateTime;
  const endsAt = event.end?.dateTime;
  // All-day entries (`date`, no `dateTime`) are holds and holidays, not sessions.
  if (!startsAt || !endsAt) return null;

  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;

  // "Massages I've done" — a session that has not finished yet is not history.
  const now = options.now ?? new Date();
  if (end.getTime() > now.getTime()) return null;

  // We declined it, so it did not happen.
  const self = event.attendees?.find((a) => a.self);
  if (self?.responseStatus === "declined") return null;

  const summary = event.summary?.trim() ?? "";
  const description = event.description;
  const cal = parseCalDescription(description);

  const service =
    matchService(cal.serviceName) ??
    matchService(stripPriceAnnotations(summary));

  // Is this bodywork at all? A recognised menu service settles it. Otherwise
  // the summary must read like a session and not like an errand.
  const mentionsService =
    SERVICE_KEYWORDS.test(summary) ||
    (cal.serviceName ? SERVICE_KEYWORDS.test(cal.serviceName) : false);

  if (!service && !(mentionsService && !OPERATIONS_TERMS.test(summary))) {
    return null;
  }

  const durationMinutes = Math.max(
    0,
    Math.round((end.getTime() - start.getTime()) / 60000)
  );

  // --- who was it for -------------------------------------------------------
  const internal = internalEmailsFor(event, options.internalEmails ?? new Set());
  const manual = parseManualSummary(summary);

  let clientName = cal.clientName ?? manual.clientName;
  let clientEmail: string | null = null;

  if (cal.who.length > 0 && clientName) {
    // Cal.com names the parties explicitly; trust it over the attendee list.
    const target = normalize(clientName);
    const entry =
      cal.who.find((w) => !w.isOrganizer && normalize(w.name) === target) ??
      cal.who.find((w) => !w.isOrganizer && !internal.has(w.email));
    if (entry && !internal.has(entry.email)) {
      clientEmail = entry.email;
      if (entry.name) clientName = entry.name;
    }
  }

  if (!clientEmail) {
    const candidates = (event.attendees ?? []).filter(
      (attendee) =>
        attendee.email &&
        !attendee.self &&
        !attendee.organizer &&
        !attendee.resource &&
        attendee.responseStatus !== "declined" &&
        !internal.has(attendee.email.toLowerCase())
    );

    // With a name in hand, only accept an address that looks like theirs —
    // otherwise a staff guest on a hand-typed event becomes the client.
    const match = clientName
      ? candidates.find((a) =>
          emailResembles(clientName!, a.email!, a.displayName)
        )
      : candidates[0];

    if (match?.email) {
      clientEmail = match.email.toLowerCase();
      if (!clientName && match.displayName) clientName = match.displayName;
    }
  }

  clientName = clientName?.replace(/\s+/g, " ").trim() || null;
  const clientPhone = cal.phone;

  // Nothing to reach them by and no name to recognise them by: not a client.
  if (!clientName && !clientEmail && !clientPhone) return null;

  // --- what it was worth ----------------------------------------------------
  const recorded = extractRecordedPrice(summary, description);
  let priceCents: number | null = recorded;
  let priceSource: ParsedVisit["priceSource"] = recorded ? "recorded" : "unknown";

  if (priceCents === null && service) {
    const listed = listPriceFor(service, durationMinutes);
    if (listed !== null) {
      priceCents = listed;
      priceSource = "list";
    }
  }

  return {
    googleEventId: event.id,
    googleCalendarId: options.calendarId,
    googleEventUrl: event.htmlLink ?? null,
    serviceId: service?.id ?? null,
    serviceName:
      service?.name ?? cal.serviceName ?? manual.serviceName ?? null,
    durationMinutes,
    priceCents,
    priceSource,
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
    source: cal.isCalBooking ? "cal.com" : "manual",
    notes: cal.reason,
    client: {
      name: clientName,
      email: clientEmail,
      phone: clientPhone,
    },
  };
}
