import { CreateSetupSessionSchema } from "@/lib/schemas/booking";
import { createSetupSession } from "@/lib/booking/actions";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = CreateSetupSessionSchema.safeParse(body);

    if (!result.success) {
      return Response.json(
        { error: "Invalid client data", details: result.error.issues },
        { status: 400 }
      );
    }

    const { clientSecret } = await createSetupSession(result.data);
    return Response.json({ clientSecret });
  } catch (err) {
    console.error("Setup session error:", err);
    return Response.json(
      { error: "Failed to create setup session" },
      { status: 500 }
    );
  }
}
