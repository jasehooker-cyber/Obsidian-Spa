import { assertStaffAuth, AuthError } from "@/lib/auth/staff";
import { SyncRequestSchema } from "@/lib/schemas/crm";
import { syncClientVisits } from "@/lib/crm/sync";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Runs the calendar sync on demand. The nightly cron covers the routine case;
 * this is for backfilling history and for seeing the result immediately after
 * correcting an event.
 */
export async function POST(request: Request) {
  try {
    await assertStaffAuth(request);
  } catch (err) {
    if (err instanceof AuthError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    return Response.json({ error: "Auth failed" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = SyncRequestSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Invalid request", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const result = await syncClientVisits({
      lookbackDays: parsed.data.lookbackDays,
      trigger: "admin",
    });

    return Response.json({ success: true, ...result });
  } catch (err) {
    console.error("CRM sync error:", err);
    return Response.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to sync client visits",
      },
      { status: 500 }
    );
  }
}

/**
 * When the sync last ran, and how it went.
 *
 * A cron that fails quietly is worse than no cron, so the admin screen shows
 * this and complains when it goes stale.
 */
export async function GET(request: Request) {
  try {
    await assertStaffAuth(request);
  } catch (err) {
    if (err instanceof AuthError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    return Response.json({ error: "Auth failed" }, { status: 401 });
  }

  try {
    const { data } = await supabaseServer()
      .from("crm_sync_runs")
      .select(
        "started_at, finished_at, status, error, events_scanned, visits_recorded, clients_created, trigger"
      )
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return Response.json({ lastRun: data ?? null });
  } catch (err) {
    console.error("CRM sync status error:", err);
    return Response.json(
      { error: "Failed to read sync status" },
      { status: 500 }
    );
  }
}
