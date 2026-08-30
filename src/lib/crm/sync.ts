/**
 * Reads the watched Google Calendars and files every completed massage as a
 * client visit.
 *
 * Safe to run repeatedly: visits are keyed on the Google event id, so a second
 * pass over the same window updates rows in place instead of inventing new
 * history. That matters because the routine sync overlaps its own window, and
 * because the owner can trigger a wide backfill by hand at any time.
 */

import { getCrmEnv, getGoogleEnv } from "@/lib/config/env";
import { listCalendarEvents } from "@/lib/google/server";
import { supabaseServer } from "@/lib/supabase/server";
import { parseVisit, type ParsedVisit } from "@/lib/crm/parse";

type Supabase = ReturnType<typeof supabaseServer>;

export interface SyncResult {
  calendars: string[];
  windowStart: string;
  windowEnd: string;
  eventsScanned: number;
  visitsRecorded: number;
  clientsCreated: number;
  /** Per-calendar failures. One bad calendar must not lose the others' work. */
  errors: string[];
}

export interface SyncOptions {
  /** How far back to look. Defaults to 90 days. */
  lookbackDays?: number;
  /** Recorded on the run log: 'cron', 'admin', or whatever triggered it. */
  trigger?: string;
}

const DEFAULT_LOOKBACK_DAYS = 90;
const MAX_LOOKBACK_DAYS = 1095;

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

/** Lowercased identity for in-run deduplication. */
function clientKey(visit: ParsedVisit): string {
  const { email, phone, name } = visit.client;
  return (email ?? phone ?? name ?? "").toLowerCase();
}

/**
 * Collapses the same session appearing on more than one watched calendar.
 * Google usually reuses the event id across copies, but not always, so the
 * client-and-start-time pair is checked too. The Cal.com copy wins: it carries
 * the email, phone, and the client's own note.
 */
function dedupe(visits: ParsedVisit[]): ParsedVisit[] {
  const byEventId = new Map<string, ParsedVisit>();
  for (const visit of visits) {
    const existing = byEventId.get(visit.googleEventId);
    if (!existing || (existing.source !== "cal.com" && visit.source === "cal.com")) {
      byEventId.set(visit.googleEventId, visit);
    }
  }

  const bySession = new Map<string, ParsedVisit>();
  for (const visit of byEventId.values()) {
    const key = `${clientKey(visit)}|${visit.startsAt}`;
    const existing = bySession.get(key);
    if (!existing || (existing.source !== "cal.com" && visit.source === "cal.com")) {
      bySession.set(key, visit);
    }
  }

  return [...bySession.values()].sort((a, b) =>
    a.startsAt.localeCompare(b.startsAt)
  );
}

interface ClientRow {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
}

/**
 * Finds the person this visit belongs to, by email, then phone, then name.
 *
 * Name is the weakest signal, so it is only trusted for clients who have no
 * contact details at all — otherwise two different men called Chris would be
 * merged the moment one of them booked online.
 */
async function findClient(
  supabase: Supabase,
  visit: ParsedVisit
): Promise<ClientRow | null> {
  const columns = "id, name, email, phone, source";
  const { email, phone, name } = visit.client;

  if (email) {
    const { data } = await supabase
      .from("clients")
      .select(columns)
      .ilike("email", email)
      .limit(1)
      .maybeSingle();
    if (data) return data as ClientRow;
  }

  if (phone) {
    const { data } = await supabase
      .from("clients")
      .select(columns)
      .eq("phone", phone)
      .limit(1)
      .maybeSingle();
    if (data) return data as ClientRow;
  }

  if (name) {
    const { data } = await supabase
      .from("clients")
      .select(columns)
      .ilike("name", name)
      .is("email", null)
      .is("phone", null)
      .limit(1)
      .maybeSingle();
    if (data) return data as ClientRow;
  }

  return null;
}

/**
 * Returns the client's id, creating the record if this is the first we have
 * seen of them. An existing record is only ever filled in, never overwritten:
 * a detail entered by hand in the admin outranks anything scraped off a
 * calendar event.
 */
async function upsertClient(
  supabase: Supabase,
  visit: ParsedVisit
): Promise<{ id: string; created: boolean }> {
  const existing = await findClient(supabase, visit);

  if (!existing) {
    const { data, error } = await supabase
      .from("clients")
      .insert({
        name: visit.client.name,
        email: visit.client.email,
        phone: visit.client.phone,
        source: visit.source,
        first_seen_at: visit.startsAt,
      })
      .select("id")
      .single();

    if (error) throw new Error(`Could not create client: ${error.message}`);
    return { id: (data as { id: string }).id, created: true };
  }

  const patch: Record<string, unknown> = {};
  if (!existing.email && visit.client.email) patch.email = visit.client.email;
  if (!existing.phone && visit.client.phone) patch.phone = visit.client.phone;
  if (!existing.name && visit.client.name) patch.name = visit.client.name;
  if (!existing.source) patch.source = visit.source;

  if (Object.keys(patch).length > 0) {
    await supabase.from("clients").update(patch).eq("id", existing.id);
  }

  return { id: existing.id, created: false };
}

/**
 * Writes the visit, matching an existing row on the Google event id first and
 * falling back to the same client at the same start time — which is the same
 * session re-created on the calendar after a reschedule.
 */
async function upsertVisit(
  supabase: Supabase,
  clientId: string,
  visit: ParsedVisit
): Promise<void> {
  const row = {
    client_id: clientId,
    google_event_id: visit.googleEventId,
    google_calendar_id: visit.googleCalendarId,
    google_event_url: visit.googleEventUrl,
    service_id: visit.serviceId,
    service_name: visit.serviceName,
    duration_minutes: visit.durationMinutes,
    price_cents: visit.priceCents,
    price_source: visit.priceSource,
    starts_at: visit.startsAt,
    ends_at: visit.endsAt,
    source: visit.source,
    notes: visit.notes,
    updated_at: new Date().toISOString(),
  };

  const { data: byEvent } = await supabase
    .from("client_visits")
    .select("id")
    .eq("google_event_id", visit.googleEventId)
    .limit(1)
    .maybeSingle();

  if (byEvent) {
    await supabase
      .from("client_visits")
      .update(row)
      .eq("id", (byEvent as { id: string }).id);
    return;
  }

  const { data: bySession } = await supabase
    .from("client_visits")
    .select("id")
    .eq("client_id", clientId)
    .eq("starts_at", visit.startsAt)
    .limit(1)
    .maybeSingle();

  if (bySession) {
    await supabase
      .from("client_visits")
      .update(row)
      .eq("id", (bySession as { id: string }).id);
    return;
  }

  const { error } = await supabase.from("client_visits").insert(row);
  if (error) throw new Error(`Could not record visit: ${error.message}`);
}

/**
 * Recalculates a client's totals from their visits, rather than adding to a
 * running count — so a re-sync, a corrected price, or a deleted event all
 * settle to the right number instead of compounding.
 */
async function refreshClientTotals(
  supabase: Supabase,
  clientId: string
): Promise<void> {
  const { data } = await supabase
    .from("client_visits")
    .select("starts_at, price_cents")
    .eq("client_id", clientId);

  const visits = (data ?? []) as Array<{
    starts_at: string;
    price_cents: number | null;
  }>;

  if (visits.length === 0) return;

  const times = visits.map((v) => v.starts_at).sort();

  await supabase
    .from("clients")
    .update({
      visit_count: visits.length,
      first_seen_at: times[0],
      last_visit_at: times[times.length - 1],
      lifetime_value_cents: visits.reduce(
        (total, v) => total + (v.price_cents ?? 0),
        0
      ),
    })
    .eq("id", clientId);
}

export async function syncClientVisits(
  options: SyncOptions = {}
): Promise<SyncResult> {
  const crm = getCrmEnv();
  const google = getGoogleEnv();
  const calendars = crm.calendarIds;

  if (calendars.length === 0) {
    throw new Error(
      "No calendars configured. Set CRM_CALENDAR_IDS (or GOOGLE_CALENDAR_ID)."
    );
  }
  if (!google.configured) {
    throw new Error(
      "Google service account not configured. Set GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY and GOOGLE_CALENDAR_ID."
    );
  }

  const lookbackDays = Math.min(
    Math.max(1, options.lookbackDays ?? DEFAULT_LOOKBACK_DAYS),
    MAX_LOOKBACK_DAYS
  );
  const windowStart = daysAgo(lookbackDays).toISOString();
  const windowEnd = new Date().toISOString();

  const supabase = supabaseServer();
  const internalEmails = new Set([
    ...crm.internalEmails,
    ...calendars.map((id) => id.toLowerCase()),
  ]);

  const { data: runRow } = await supabase
    .from("crm_sync_runs")
    .insert({
      window_start: windowStart,
      window_end: windowEnd,
      trigger: options.trigger ?? "manual",
    })
    .select("id")
    .single();

  const runId = (runRow as { id: string } | null)?.id ?? null;

  const result: SyncResult = {
    calendars,
    windowStart,
    windowEnd,
    eventsScanned: 0,
    visitsRecorded: 0,
    clientsCreated: 0,
    errors: [],
  };

  try {
    const parsed: ParsedVisit[] = [];

    for (const calendarId of calendars) {
      try {
        const events = await listCalendarEvents({
          calendarId,
          timeMin: windowStart,
          timeMax: windowEnd,
        });
        result.eventsScanned += events.length;

        for (const event of events) {
          const visit = parseVisit(event, { calendarId, internalEmails });
          if (visit) parsed.push(visit);
        }
      } catch (err) {
        // A calendar the service account cannot see should not sink the run.
        result.errors.push(
          `${calendarId}: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    const touchedClients = new Set<string>();

    for (const visit of dedupe(parsed)) {
      try {
        const { id, created } = await upsertClient(supabase, visit);
        await upsertVisit(supabase, id, visit);
        touchedClients.add(id);
        result.visitsRecorded += 1;
        if (created) result.clientsCreated += 1;
      } catch (err) {
        result.errors.push(
          `${visit.googleEventId}: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    for (const clientId of touchedClients) {
      await refreshClientTotals(supabase, clientId);
    }

    if (runId) {
      await supabase
        .from("crm_sync_runs")
        .update({
          finished_at: new Date().toISOString(),
          events_scanned: result.eventsScanned,
          visits_recorded: result.visitsRecorded,
          clients_created: result.clientsCreated,
          status: result.errors.length > 0 ? "error" : "success",
          error: result.errors.length > 0 ? result.errors.join("; ") : null,
        })
        .eq("id", runId);
    }

    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    if (runId) {
      await supabase
        .from("crm_sync_runs")
        .update({
          finished_at: new Date().toISOString(),
          status: "error",
          error: message,
        })
        .eq("id", runId);
    }

    throw err;
  }
}
