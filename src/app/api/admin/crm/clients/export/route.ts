import { assertStaffAuth, AuthError } from "@/lib/auth/staff";
import { ClientListQuerySchema } from "@/lib/schemas/crm";
import { fetchClients, toCsv } from "@/lib/crm/clients";

/**
 * The current list as CSV, for a mail-merge or campaign tool. Honours the same
 * filters as the screen, so "everyone who has not been in for 60 days" exports
 * exactly what it shows.
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
    const { searchParams } = new URL(request.url);
    const parsed = ClientListQuerySchema.safeParse(
      Object.fromEntries(searchParams)
    );

    if (!parsed.success) {
      return Response.json(
        { error: "Invalid query", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const clients = await fetchClients(parsed.data);
    const filename = `obsidian-clients-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    return new Response(toCsv(clients), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("CRM export error:", err);
    return Response.json({ error: "Failed to export clients" }, { status: 500 });
  }
}
