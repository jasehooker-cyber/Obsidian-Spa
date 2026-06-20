import { supabaseServer } from "@/lib/supabase/server";
import { generateIntakeToken, buildIntakeUrl } from "@/lib/booking/intake";

export async function POST(request: Request) {
  try {
    const { bookingId } = (await request.json()) as {
      bookingId?: string;
    };

    if (!bookingId) {
      return Response.json(
        { error: "bookingId is required" },
        { status: 400 }
      );
    }

    const supabase = supabaseServer();
    const { data: booking } = await supabase
      .from("bookings")
      .select("id, status, clients!inner(email, name)")
      .eq("id", bookingId)
      .single();

    if (!booking) {
      return Response.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    const token = await generateIntakeToken(bookingId);
    const intakeUrl = buildIntakeUrl(token);

    const client = booking.clients as unknown as {
      email: string;
      name: string;
    };

    // TODO: Send email via Resend or similar service
    // For v1, log the URL and return it so staff can send manually
    console.log(
      `[INTAKE] Send to ${client.name} (${client.email}): ${intakeUrl}`
    );

    return Response.json({ intakeUrl, clientEmail: client.email });
  } catch (err) {
    console.error("Intake send error:", err);
    return Response.json(
      { error: "Failed to send intake" },
      { status: 500 }
    );
  }
}
