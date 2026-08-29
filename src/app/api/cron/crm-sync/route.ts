import { timingSafeEqual } from "crypto";
import { getEnv } from "@/lib/config/env";
import { syncClientVisits } from "@/lib/crm/sync";

/** Never cached, and given room to page through a few months of calendar. */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function secretMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  // timingSafeEqual throws on a length mismatch, which is itself a non-match.
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * The scheduled sync, called by Vercel Cron (see vercel.json). Runs on a
 * shared secret rather than a staff session, since no one is signed in.
 */
export async function GET(request: Request) {
  const expected = getEnv().crm.cronSecret;

  // Fail closed: without a configured secret this endpoint would be public.
  if (!expected) {
    console.error("CRM cron called but CRON_SECRET is not set");
    return Response.json({ error: "Not configured" }, { status: 503 });
  }

  const header = request.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (!provided || !secretMatches(provided, expected)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncClientVisits({ trigger: "cron" });
    console.log(
      `CRM sync: scanned ${result.eventsScanned} events, recorded ${result.visitsRecorded} visits, ${result.clientsCreated} new clients`
    );
    return Response.json({ success: true, ...result });
  } catch (err) {
    console.error("CRM cron sync error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 }
    );
  }
}
