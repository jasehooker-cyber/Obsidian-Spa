"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/config/business-rules";

interface ClientRecord {
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
  daysSinceLastVisit: number | null;
  lastServiceName: string | null;
}

type Sort = "last_visit" | "lifetime_value" | "visit_count" | "name";

const LAPSED_OPTIONS = [
  { label: "Everyone", value: "" },
  { label: "Not in for 30 days", value: "30" },
  { label: "Not in for 60 days", value: "60" },
  { label: "Not in for 90 days", value: "90" },
];

const SORT_OPTIONS: Array<{ label: string; value: Sort }> = [
  { label: "Most recent visit", value: "last_visit" },
  { label: "Lifetime value", value: "lifetime_value" },
  { label: "Number of visits", value: "visit_count" },
  { label: "Name", value: "name" },
];

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ClientDirectory() {
  // Created on first use rather than during render: this page is prerendered,
  // and the client needs public env vars that a build need not have.
  const supabaseRef = useRef<SupabaseClient | null>(null);
  const getSupabase = useCallback((): SupabaseClient => {
    supabaseRef.current ??= supabaseBrowser();
    return supabaseRef.current;
  }, []);

  const [session, setSession] = useState<Session | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [email, setEmail] = useState("");
  const [linkSent, setLinkSent] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // null means "not loaded yet", which is what shows the loading state — a
  // separate boolean would have to be set synchronously inside the effect.
  const [clients, setClients] = useState<ClientRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sort, setSort] = useState<Sort>("last_visit");
  const [lapsedDays, setLapsedDays] = useState("");
  const [contactableOnly, setContactableOnly] = useState(false);

  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // --- auth ---------------------------------------------------------------
  useEffect(() => {
    let active = true;

    getSupabase().auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setAuthChecked(true);
    });

    const { data: listener } = getSupabase().auth.onAuthStateChange(
      (_event, next) => {
        setSession(next);
        setAuthChecked(true);
      }
    );

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [getSupabase]);

  const token = session?.access_token ?? null;

  // --- filters ------------------------------------------------------------
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ sort, limit: "500" });
    if (debouncedSearch.trim()) params.set("q", debouncedSearch.trim());
    if (lapsedDays) params.set("lapsedDays", lapsedDays);
    if (contactableOnly) params.set("contactableOnly", "true");
    return params.toString();
  }, [sort, debouncedSearch, lapsedDays, contactableOnly]);

  /** Fetches without touching state, so the effect below stays side-effect free. */
  const fetchClientList = useCallback(async (): Promise<ClientRecord[]> => {
    if (!token) return [];

    const res = await fetch(`/api/admin/crm/clients?${queryString}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Could not load clients");

    return data.clients as ClientRecord[];
  }, [token, queryString]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    fetchClientList()
      .then((list) => {
        if (cancelled) return;
        setClients(list);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Something went wrong");
      });

    // A filter changed before this returned; its result is already stale.
    return () => {
      cancelled = true;
    };
  }, [token, fetchClientList]);

  // --- actions ------------------------------------------------------------
  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);

    const { error: signInError } = await getSupabase().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.href },
    });

    if (signInError) setAuthError(signInError.message);
    else setLinkSent(true);
  }

  async function runSync() {
    if (!token) return;

    setSyncing(true);
    setSyncMessage(null);

    try {
      const res = await fetch("/api/admin/crm/sync", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Sync failed");

      setSyncMessage(
        `Scanned ${data.eventsScanned} events — ${data.visitsRecorded} sessions, ${data.clientsCreated} new clients.` +
          (data.errors?.length ? ` Warnings: ${data.errors.join("; ")}` : "")
      );
      setClients(await fetchClientList());
    } catch (err) {
      setSyncMessage(
        err instanceof Error ? err.message : "Sync failed"
      );
    } finally {
      setSyncing(false);
    }
  }

  async function exportCsv() {
    if (!token) return;

    const res = await fetch(`/api/admin/crm/clients/export?${queryString}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      setError("Export failed");
      return;
    }

    // The endpoint needs an auth header, so the file is fetched and handed to
    // the browser as a blob rather than linked to directly.
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `obsidian-clients-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function toggleOptOut(client: ClientRecord) {
    if (!token) return;

    const next = !client.marketingOptOut;
    setClients((current) =>
      (current ?? []).map((c) =>
        c.id === client.id ? { ...c, marketingOptOut: next } : c
      )
    );

    const res = await fetch(`/api/admin/crm/clients/${client.id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ marketingOptOut: next }),
    });

    if (!res.ok) {
      // Put it back the way it was; the server is the source of truth.
      setClients((current) =>
        (current ?? []).map((c) =>
          c.id === client.id ? { ...c, marketingOptOut: !next } : c
        )
      );
      setError("Could not update that client");
    }
  }

  // --- render -------------------------------------------------------------
  if (!authChecked) {
    return <p className="py-20 text-center text-muted">Loading…</p>;
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-md py-16">
        <h1 className="mb-2 text-2xl font-bold">Staff sign in</h1>
        <p className="mb-8 text-sm text-muted">
          We&apos;ll email you a sign-in link.
        </p>

        {linkSent ? (
          <p className="border border-gold/30 bg-charcoal p-4 text-sm text-gold">
            Check {email} for your sign-in link.
          </p>
        ) : (
          <form onSubmit={signIn} className="space-y-4">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@obsidianspas.com"
              className="w-full border border-charcoal-light bg-charcoal px-4 py-3 text-foreground outline-none focus:border-gold"
            />
            <button
              type="submit"
              className="w-full bg-gold px-4 py-3 font-medium text-background transition hover:bg-gold-light"
            >
              Send sign-in link
            </button>
            {authError && (
              <p className="text-sm text-red-400">{authError}</p>
            )}
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Clients</h1>
          <p className="mt-1 text-sm text-muted">
            Everyone who has been on the table, pulled from the calendar.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={runSync}
            disabled={syncing}
            className="border border-gold/40 px-4 py-2 text-sm text-gold transition hover:bg-gold/10 disabled:opacity-50"
          >
            {syncing ? "Syncing…" : "Sync calendar"}
          </button>
          <button
            onClick={exportCsv}
            className="bg-gold px-4 py-2 text-sm font-medium text-background transition hover:bg-gold-light"
          >
            Export CSV
          </button>
          <button
            onClick={() => getSupabase().auth.signOut()}
            className="px-4 py-2 text-sm text-muted transition hover:text-foreground"
          >
            Sign out
          </button>
        </div>
      </header>

      {syncMessage && (
        <p className="mb-6 border border-gold/30 bg-charcoal p-4 text-sm text-gold">
          {syncMessage}
        </p>
      )}

      <div className="mb-6 flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, or phone"
          className="min-w-64 flex-1 border border-charcoal-light bg-charcoal px-4 py-2 text-sm outline-none focus:border-gold"
        />
        <select
          value={lapsedDays}
          onChange={(e) => setLapsedDays(e.target.value)}
          className="border border-charcoal-light bg-charcoal px-3 py-2 text-sm outline-none focus:border-gold"
        >
          {LAPSED_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          className="border border-charcoal-light bg-charcoal px-3 py-2 text-sm outline-none focus:border-gold"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 px-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={contactableOnly}
            onChange={(e) => setContactableOnly(e.target.checked)}
            className="accent-gold"
          />
          Has contact details
        </label>
      </div>

      {error && <p className="mb-6 text-sm text-red-400">{error}</p>}

      {clients === null ? (
        <p className="py-12 text-center text-muted">Loading clients…</p>
      ) : clients.length === 0 ? (
        <p className="py-12 text-center text-muted">
          No clients yet. Run a calendar sync to pull in past sessions.
        </p>
      ) : (
        <div className="overflow-x-auto border border-charcoal-light">
          <table className="w-full min-w-4xl text-left text-sm">
            <thead className="border-b border-charcoal-light bg-charcoal text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Last visit</th>
                <th className="px-4 py-3">Last service</th>
                <th className="px-4 py-3 text-right">Visits</th>
                <th className="px-4 py-3 text-right">Lifetime</th>
                <th className="px-4 py-3 text-center">Contact OK</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr
                  key={client.id}
                  className="border-b border-charcoal-light/60 last:border-0 hover:bg-charcoal/60"
                >
                  <td className="px-4 py-3">
                    <span className="font-medium">
                      {client.name ?? "Unknown"}
                    </span>
                    {client.source === "manual" && (
                      <span className="ml-2 text-xs text-muted">walk-in</span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      {client.email ? (
                        <a
                          href={`mailto:${client.email}`}
                          className="text-gold hover:text-gold-light"
                        >
                          {client.email}
                        </a>
                      ) : null}
                      {client.phone ? (
                        <a
                          href={`tel:${client.phone}`}
                          className="text-muted hover:text-foreground"
                        >
                          {client.phone}
                        </a>
                      ) : null}
                      {!client.email && !client.phone && (
                        <span className="text-muted">No contact details</span>
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div>{formatDate(client.lastVisitAt)}</div>
                    {client.daysSinceLastVisit !== null && (
                      <div
                        className={
                          client.daysSinceLastVisit >= 60
                            ? "text-xs text-gold"
                            : "text-xs text-muted"
                        }
                      >
                        {client.daysSinceLastVisit} days ago
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-3 text-muted">
                    {client.lastServiceName ?? "—"}
                  </td>

                  <td className="px-4 py-3 text-right">{client.visitCount}</td>

                  <td className="px-4 py-3 text-right">
                    {client.lifetimeValueCents > 0
                      ? formatPrice(client.lifetimeValueCents)
                      : "—"}
                  </td>

                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={!client.marketingOptOut}
                      onChange={() => toggleOptOut(client)}
                      aria-label={`Allow outreach to ${client.name ?? "this client"}`}
                      className="accent-gold"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-muted">
        {clients?.length ?? 0} client{clients?.length === 1 ? "" : "s"}. Prices shown
        are what was recorded on the calendar event, or the menu price for that
        service and length.
      </p>
    </div>
  );
}
