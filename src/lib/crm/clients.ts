/**
 * Reading side of the client list — shared by the admin API and the CSV
 * export so the screen and the download can never disagree about who is on it.
 */

import { supabaseServer } from "@/lib/supabase/server";
import type { ClientListQueryInput } from "@/lib/schemas/crm";

export interface ClientRecord {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  visitCount: number;
  firstSeenAt: string | null;
  lastVisitAt: string | null;
  lifetimeValueCents: number;
  source: string | null;
  notes: string | null;
  marketingOptOut: boolean;
  /** Whole days since the last visit, for the "who is overdue" view. */
  daysSinceLastVisit: number | null;
  lastServiceName: string | null;
}

interface ClientRow {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  visit_count: number | null;
  first_seen_at: string | null;
  last_visit_at: string | null;
  lifetime_value_cents: number | null;
  source: string | null;
  notes: string | null;
  marketing_opt_out: boolean | null;
}

const SORT_COLUMNS: Record<
  ClientListQueryInput["sort"],
  { column: string; ascending: boolean }
> = {
  last_visit: { column: "last_visit_at", ascending: false },
  lifetime_value: { column: "lifetime_value_cents", ascending: false },
  visit_count: { column: "visit_count", ascending: false },
  name: { column: "name", ascending: true },
};

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  return Math.floor((Date.now() - then) / (24 * 60 * 60 * 1000));
}

/**
 * PostgREST's `or` filter is a comma-separated list wrapped in parentheses, so
 * those characters in a search term would change the meaning of the query
 * rather than be searched for.
 */
function sanitizeSearch(term: string): string {
  return term.replace(/[,()*\\]/g, " ").trim();
}

export async function fetchClients(
  query: ClientListQueryInput
): Promise<ClientRecord[]> {
  const supabase = supabaseServer();
  const sort = SORT_COLUMNS[query.sort];

  let request = supabase
    .from("clients")
    .select(
      "id, name, email, phone, visit_count, first_seen_at, last_visit_at, lifetime_value_cents, source, notes, marketing_opt_out"
    )
    .order(sort.column, { ascending: sort.ascending, nullsFirst: false })
    .limit(query.limit);

  const term = query.q ? sanitizeSearch(query.q) : "";
  if (term) {
    request = request.or(
      `name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`
    );
  }

  if (query.lapsedDays !== undefined) {
    const cutoff = new Date(
      Date.now() - query.lapsedDays * 24 * 60 * 60 * 1000
    ).toISOString();
    request = request.lte("last_visit_at", cutoff);
  }

  const { data, error } = await request;
  if (error) throw new Error(`Could not load clients: ${error.message}`);

  let rows = (data ?? []) as ClientRow[];

  // Applied here rather than as a second `or` filter, which PostgREST would
  // combine with the search filter in ways that are easy to get subtly wrong.
  if (query.contactableOnly) {
    rows = rows.filter((row) => row.email || row.phone);
  }

  const lastServices = await fetchLastServices(rows.map((row) => row.id));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    visitCount: row.visit_count ?? 0,
    firstSeenAt: row.first_seen_at,
    lastVisitAt: row.last_visit_at,
    lifetimeValueCents: row.lifetime_value_cents ?? 0,
    source: row.source,
    notes: row.notes,
    marketingOptOut: row.marketing_opt_out ?? false,
    daysSinceLastVisit: daysSince(row.last_visit_at),
    lastServiceName: lastServices.get(row.id) ?? null,
  }));
}

/** The service from each client's most recent visit — the outreach hook. */
async function fetchLastServices(
  clientIds: string[]
): Promise<Map<string, string>> {
  if (clientIds.length === 0) return new Map();

  const supabase = supabaseServer();
  const { data } = await supabase
    .from("client_visits")
    .select("client_id, service_name, starts_at")
    .in("client_id", clientIds)
    .order("starts_at", { ascending: false });

  const latest = new Map<string, string>();
  for (const visit of (data ?? []) as Array<{
    client_id: string;
    service_name: string | null;
  }>) {
    // Ordered newest first, so the first row seen for a client is their latest.
    if (visit.service_name && !latest.has(visit.client_id)) {
      latest.set(visit.client_id, visit.service_name);
    }
  }

  return latest;
}

function csvCell(value: string | number | null): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  // A leading =, +, - or @ makes a spreadsheet treat the cell as a formula.
  const guarded = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${guarded.replace(/"/g, '""')}"`;
}

/**
 * Outreach list as CSV, ready for a mail-merge tool. Anyone who has opted out
 * is excluded here rather than merely flagged — the export is the thing that
 * actually leaves the building.
 */
export function toCsv(clients: ClientRecord[]): string {
  const header = [
    "Name",
    "Email",
    "Phone",
    "Visits",
    "Last visit",
    "Days since last visit",
    "Last service",
    "Lifetime value",
    "First seen",
    "Source",
    "Notes",
  ];

  const rows = clients
    .filter((client) => !client.marketingOptOut)
    .map((client) =>
      [
        csvCell(client.name),
        csvCell(client.email),
        csvCell(client.phone),
        csvCell(client.visitCount),
        csvCell(client.lastVisitAt?.slice(0, 10) ?? null),
        csvCell(client.daysSinceLastVisit),
        csvCell(client.lastServiceName),
        csvCell((client.lifetimeValueCents / 100).toFixed(2)),
        csvCell(client.firstSeenAt?.slice(0, 10) ?? null),
        csvCell(client.source),
        csvCell(client.notes),
      ].join(",")
    );

  return [header.map(csvCell).join(","), ...rows].join("\r\n");
}
