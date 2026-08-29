import { assertStaffAuth, AuthError } from "@/lib/auth/staff";
import { ClientUpdateSchema } from "@/lib/schemas/crm";
import { normalizePhone } from "@/lib/crm/parse";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Hand corrections: filling in the phone number for a walk-in the calendar
 * only had a first name for, leaving a note, or marking someone as not to be
 * contacted. The sync only ever fills blanks, so anything set here survives it.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await assertStaffAuth(request);
  } catch (err) {
    if (err instanceof AuthError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    return Response.json({ error: "Auth failed" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const parsed = ClientUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Invalid request", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const patch: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) patch.name = parsed.data.name;
    if (parsed.data.email !== undefined) {
      patch.email = parsed.data.email.toLowerCase() || null;
    }
    if (parsed.data.phone !== undefined) {
      patch.phone = normalizePhone(parsed.data.phone);
    }
    if (parsed.data.notes !== undefined) patch.notes = parsed.data.notes || null;
    if (parsed.data.marketingOptOut !== undefined) {
      patch.marketing_opt_out = parsed.data.marketingOptOut;
    }

    if (Object.keys(patch).length === 0) {
      return Response.json({ error: "Nothing to update" }, { status: 400 });
    }

    const { data, error } = await supabaseServer()
      .from("clients")
      .update(patch)
      .eq("id", id)
      .select("id, name, email, phone, notes, marketing_opt_out")
      .maybeSingle();

    if (error) {
      // 23505: the email or phone already belongs to another client.
      if (error.code === "23505") {
        return Response.json(
          { error: "Another client already has that email or phone" },
          { status: 409 }
        );
      }
      throw new Error(error.message);
    }

    if (!data) {
      return Response.json({ error: "Client not found" }, { status: 404 });
    }

    return Response.json({ success: true, client: data });
  } catch (err) {
    console.error("CRM client update error:", err);
    return Response.json({ error: "Failed to update client" }, { status: 500 });
  }
}
