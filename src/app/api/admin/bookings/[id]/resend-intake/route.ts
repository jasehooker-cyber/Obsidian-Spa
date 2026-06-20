import { assertStaffAuth, AuthError } from "@/lib/auth/staff";
import { supabaseServer } from "@/lib/supabase/server";
import { generateIntakeToken, buildIntakeUrl } from "@/lib/booking/intake";

export async function POST(
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
    const supabase = supabaseServer();

    const { data: booking } = await supabase
      .from("bookings")
      .select("id, clients!inner(email, name)")
      .eq("id", id)
      .single();

    if (!booking) {
      return Response.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    const client = booking.clients as unknown as {
      email: string;
      name: string;
    };

    const token = await generateIntakeToken(booking.id);
    const intakeUrl = buildIntakeUrl(token);

    // TODO: Send email via Resend or similar service
    console.log(
      `[INTAKE RESEND] Send to ${client.name} (${client.email}): ${intakeUrl}`
    );

    return Response.json({ intakeUrl, clientEmail: client.email });
  } catch (err) {
    console.error("Resend intake error:", err);
    return Response.json(
      { error: "Failed to resend intake" },
      { status: 500 }
    );
  }
}
