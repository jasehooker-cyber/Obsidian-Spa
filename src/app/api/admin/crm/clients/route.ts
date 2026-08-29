import { assertStaffAuth, AuthError } from "@/lib/auth/staff";
import { ClientListQuerySchema } from "@/lib/schemas/crm";
import { fetchClients } from "@/lib/crm/clients";

/** The client list behind the admin screen. */
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
    return Response.json({ clients, count: clients.length });
  } catch (err) {
    console.error("CRM client list error:", err);
    return Response.json(
      { error: "Failed to load clients" },
      { status: 500 }
    );
  }
}
