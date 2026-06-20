import { IntakeSubmissionSchema } from "@/lib/schemas/booking";
import { submitIntake } from "@/lib/booking/intake";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();

    const result = IntakeSubmissionSchema.safeParse({ ...body, token });

    if (!result.success) {
      return Response.json(
        { error: "Invalid intake data", details: result.error.issues },
        { status: 400 }
      );
    }

    const { token: validatedToken, ...intakeData } = result.data;
    await submitIntake(validatedToken, intakeData);

    return Response.json({ success: true });
  } catch (err) {
    console.error("Intake submission error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to submit intake";
    return Response.json({ error: message }, { status: 500 });
  }
}
