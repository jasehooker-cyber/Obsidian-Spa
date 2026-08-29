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

interface SyncRun {
  started_at: string;
  finished_at: string | null;
  status: "running" | "success" | "error";
  error: string | null;
  visits_recorded: number;
  clients_created: number;
  trigger: string | null;
}

type Sort = "last_visit" | "lifetime_value" | "visit_count" | "name";

/** Sentinel for a 403, which means "wrong account", not "broken". */
const NOT_STAFF = "NOT_STAFF";

/**
 * NEXT_PUBLIC_* values are inlined at build time, not read at runtime. If they
 * were absent when the site was built, the Supabase client cannot be created
 * and every sign-in throws — which the error boundary would report as
 * "Something Went Wrong". Checked up front so the page can say what is
 * actually wrong instead.
 */
const SUPABASE_CONFIGURED =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * The nightly sync runs at 3am. Past this, a run has been missed and the list
 * is no longer trustworthy — which the screen should say out loud.
 */
const STALE_AFTER_HOURS = 30;

function hoursSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60);
}

function describeAge(iso: string): string {
  const hours = hoursSince(iso);
  if (hours < 1) return "less than an hour ago";
  if (hours < 24) return `${Math.floor(hours)} hours ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

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
  const [password, setPassword] = useState("");
  const [linkSent, setLinkSent] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  // null means "not loaded yet", which is what shows the loading state — a
  // separate boolean would have to be set synchronously inside the effect.
  const [clients, setClients] = useState<ClientRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Signed in with an address that is not on STAFF_ALLOWED_EMAILS.
  const [forbidden, setForbidden] = useState(false);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sort, setSort] = useState<Sort>("last_visit");
  const [lapsedDays, setLapsedDays] = useState("");
  const [contactableOnly, setContactableOnly] = useState(false);

  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<SyncRun | null | undefined>(undefined);

  // --- auth ---------------------------------------------------------------
  useEffect(() => {
    if (!SUPABASE_CONFIGURED) return;
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

    // Signed in, but not staff — a different screen, not an error banner.
    if (res.status === 403) throw new Error(NOT_STAFF);

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
        if (err instanceof Error && err.message === NOT_STAFF) {
          setForbidden(true);
          return;
        }
        setError(err instanceof Error ? err.message : "Something went wrong");
      });

    // A filter changed before this returned; its result is already stale.
    return () => {
      cancelled = true;
    };
  }, [token, fetchClientList]);

  // Sync health, loaded once per session.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    fetch("/api/admin/crm/sync", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : { lastRun: null }))
      .then((data) => {
        if (!cancelled) setLastRun(data.lastRun ?? null);
      })
      .catch(() => {
        if (!cancelled) setLastRun(null);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  // --- actions ------------------------------------------------------------
  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);
    setSigningIn(true);

    try {
      const { error: signInError } =
        await getSupabase().auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (signInError) {
        // Supabase says "Invalid login credentials" for a wrong password and
        // for an address with no account, on purpose — saying which would let
        // someone probe for valid staff addresses.
        setAuthError(
          signInError.message === "Invalid login credentials"
            ? "That email and password do not match."
            : signInError.message
        );
        return;
      }

      // Not kept in memory a moment longer than the request needs it.
      setPassword("");
    } finally {
      setSigningIn(false);
    }
  }

  /**
   * Fallback for a forgotten password: a one-time link to the same address.
   * Cheaper than a reset flow, and it lands on this page already signed in.
   */
  async function emailSignInLink() {
    if (!email.trim()) {
      setAuthError("Enter your email address first.");
      return;
    }

    setAuthError(null);
    setSigningIn(true);

    try {
      const { error: linkError } = await getSupabase().auth.signInWithOtp({
        email: email.trim(),
        // Never create an account from this form — the only accounts that
        // should exist are the ones added deliberately in Supabase.
        options: {
          emailRedirectTo: window.location.href,
          shouldCreateUser: false,
        },
      });

      if (linkError) setAuthError(linkError.message);
      else setLinkSent(true);
    } finally {
      setSigningIn(false);
    }
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
      setLastRun({
        started_at: new Date().toISOString(),
        finished_at: new Date().toISOString(),
        status: data.errors?.length ? "error" : "success",
        error: data.errors?.length ? data.errors.join("; ") : null,
        visits_recorded: data.visitsRecorded,
        clients_created: data.clientsCreated,
        trigger: "admin",
      });
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
  if (!SUPABASE_CONFIGURED) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="mb-3 text-2xl font-bold">Not configured</h1>
        <p className="text-sm text-muted">
          <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> were missing when
          this site was built. Set them in the hosting project and redeploy —
          they are read at build time, so setting them alone is not enough.
        </p>
      </div>
    );
  }

  if (!authChecked) {
    return <p className="py-20 text-center text-muted">Loading…</p>;
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-md py-16">
        <h1 className="mb-2 text-2xl font-bold">Staff sign in</h1>
        <p className="mb-8 text-sm text-muted">
          Obsidian Men&apos;s Spa — client records.
        </p>

        {linkSent ? (
          <p className="border border-gold/30 bg-charcoal p-4 text-sm text-gold">
            Check {email} for a sign-in link. Open it in this browser.
          </p>
        ) : (
          <form onSubmit={signIn} className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-xs uppercase tracking-wider text-muted">
                Email
              </span>
              <input
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@obsidianspas.com"
                className="w-full border border-charcoal-light bg-charcoal px-4 py-3 text-foreground outline-none focus:border-gold"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs uppercase tracking-wider text-muted">
                Password
              </span>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-charcoal-light bg-charcoal px-4 py-3 text-foreground outline-none focus:border-gold"
              />
            </label>

            <button
              type="submit"
              disabled={signingIn}
              className="w-full bg-gold px-4 py-3 font-medium text-background transition hover:bg-gold-light disabled:opacity-50"
            >
              {signingIn ? "Signing in…" : "Sign in"}
            </button>

            {authError && <p className="text-sm text-red-400">{authError}</p>}

            <button
              type="button"
              onClick={emailSignInLink}
              disabled={signingIn}
              className="w-full pt-2 text-center text-xs text-muted underline transition hover:text-foreground disabled:opacity-50"
            >
              Forgot your password? Email me a sign-in link instead
            </button>
          </form>
        )}
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="mb-3 text-2xl font-bold">Not a staff account</h1>
        <p className="mb-8 text-sm text-muted">
          You are signed in as {session.user.email}, which is not on the staff
          list. Add it to <code>STAFF_ALLOWED_EMAILS</code>, or sign in with an
          address that is already on it.
        </p>
        <button
          onClick={() => getSupabase().auth.signOut()}
          className="border border-gold/40 px-4 py-2 text-sm text-gold transition hover:bg-gold/10"
        >
          Sign out
        </button>
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

      <SyncHealth lastRun={lastRun} />

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
        <>
          {/* Phones: a card each, so nothing has to be scrolled sideways. */}
          <ul className="flex flex-col gap-3 md:hidden">
            {clients.map((client) => (
              <li
                key={client.id}
                className="border border-charcoal-light bg-charcoal/40 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{client.name ?? "Unknown"}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {client.lastServiceName ?? "Service not recorded"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">
                      {client.lifetimeValueCents > 0
                        ? formatPrice(client.lifetimeValueCents)
                        : "—"}
                    </p>
                    <p className="text-xs text-muted">
                      {client.visitCount} visit
                      {client.visitCount === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>

                <p className="mt-3 text-xs text-muted">
                  Last in {formatDate(client.lastVisitAt)}
                  {client.daysSinceLastVisit !== null && (
                    <span
                      className={
                        client.daysSinceLastVisit >= 60 ? "text-gold" : ""
                      }
                    >
                      {" "}
                      · {client.daysSinceLastVisit} days ago
                    </span>
                  )}
                </p>

                {/* Big tap targets: this is the point of the screen on a phone. */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {client.phone && (
                    <a
                      href={`tel:${client.phone}`}
                      className="border border-gold/40 px-3 py-2 text-sm text-gold"
                    >
                      Call
                    </a>
                  )}
                  {client.email && (
                    <a
                      href={`mailto:${client.email}`}
                      className="border border-gold/40 px-3 py-2 text-sm text-gold"
                    >
                      Email
                    </a>
                  )}
                  {!client.email && !client.phone && (
                    <span className="py-2 text-sm text-muted">
                      No contact details
                    </span>
                  )}
                  <label className="ml-auto flex items-center gap-2 py-2 text-xs text-muted">
                    <input
                      type="checkbox"
                      checked={!client.marketingOptOut}
                      onChange={() => toggleOptOut(client)}
                      aria-label={`Allow outreach to ${client.name ?? "this client"}`}
                      className="accent-gold"
                    />
                    Contact OK
                  </label>
                </div>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-x-auto border border-charcoal-light md:block">
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
        </>
      )}

      <p className="mt-4 text-xs text-muted">
        {clients?.length ?? 0} client{clients?.length === 1 ? "" : "s"}. Prices shown
        are what was recorded on the calendar event, or the menu price for that
        service and length.
      </p>
    </div>
  );
}

/**
 * Says plainly whether the nightly sync is doing its job. Silence would let a
 * broken cron pass for "no new clients this week".
 */
function SyncHealth({ lastRun }: { lastRun: SyncRun | null | undefined }) {
  // Still loading; say nothing rather than flash a warning.
  if (lastRun === undefined) return null;

  if (lastRun === null) {
    return (
      <p className="mb-6 border border-gold/40 bg-charcoal p-4 text-sm text-gold">
        The calendar sync has never run. Press <strong>Sync calendar</strong> to
        pull in your history.
      </p>
    );
  }

  if (lastRun.status === "error") {
    return (
      <p className="mb-6 border border-red-500/40 bg-charcoal p-4 text-sm text-red-400">
        Last sync failed {describeAge(lastRun.started_at)}
        {lastRun.error ? `: ${lastRun.error}` : "."} The list below may be out
        of date.
      </p>
    );
  }

  if (hoursSince(lastRun.started_at) > STALE_AFTER_HOURS) {
    return (
      <p className="mb-6 border border-gold/40 bg-charcoal p-4 text-sm text-gold">
        Last synced {describeAge(lastRun.started_at)}. The nightly sync should
        run every night at 3am — check that <code>CRON_SECRET</code> is set and
        the cron is enabled.
      </p>
    );
  }

  return (
    <p className="mb-6 text-xs text-muted">
      Synced {describeAge(lastRun.started_at)} · {lastRun.visits_recorded}{" "}
      session{lastRun.visits_recorded === 1 ? "" : "s"},{" "}
      {lastRun.clients_created} new client
      {lastRun.clients_created === 1 ? "" : "s"}
      {lastRun.trigger === "cron" ? " · automatic" : ""}
    </p>
  );
}
