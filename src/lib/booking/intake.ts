import { randomUUID } from "crypto";
import { supabaseServer } from "@/lib/supabase/server";
import { getEnv } from "@/lib/config/env";

const INTAKE_EXPIRY_HOURS = 72;

export async function generateIntakeToken(bookingId: string): Promise<string> {
  const supabase = supabaseServer();
  const token = randomUUID();
  const expiresAt = new Date(
    Date.now() + INTAKE_EXPIRY_HOURS * 60 * 60 * 1000
  ).toISOString();

  const { data: existing } = await supabase
    .from("intake_submissions")
    .select("id")
    .eq("booking_id", bookingId)
    .single();

  if (existing) {
    await supabase
      .from("intake_submissions")
      .update({ token, token_expires_at: expiresAt, submitted_at: null })
      .eq("booking_id", bookingId);
  } else {
    await supabase.from("intake_submissions").insert({
      booking_id: bookingId,
      token,
      token_expires_at: expiresAt,
    });
  }

  return token;
}

export function buildIntakeUrl(token: string): string {
  const env = getEnv();
  return `${env.siteUrl}/intake/${token}`;
}

export async function validateIntakeToken(token: string) {
  const supabase = supabaseServer();

  const { data } = await supabase
    .from("intake_submissions")
    .select("id, booking_id, token_expires_at, submitted_at")
    .eq("token", token)
    .single();

  if (!data) return { valid: false, reason: "not_found" as const };

  if (data.submitted_at) {
    return { valid: false, reason: "already_submitted" as const };
  }

  if (new Date(data.token_expires_at) < new Date()) {
    return { valid: false, reason: "expired" as const };
  }

  return { valid: true, intakeId: data.id, bookingId: data.booking_id };
}

export async function submitIntake(
  token: string,
  data: Record<string, unknown>
) {
  const validation = await validateIntakeToken(token);
  if (!validation.valid) {
    throw new Error(`Intake token is ${validation.reason}`);
  }

  const supabase = supabaseServer();

  await supabase
    .from("intake_submissions")
    .update({
      data,
      submitted_at: new Date().toISOString(),
    })
    .eq("token", token);

  return { bookingId: validation.bookingId };
}
