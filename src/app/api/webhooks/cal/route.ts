import { createHmac } from "crypto";
import { getEnv } from "@/lib/config/env";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("x-cal-signature-256");

  if (!signature) {
    return Response.json({ error: "Missing signature" }, { status: 400 });
  }

  const expected = createHmac("sha256", getEnv().cal.apiKey)
    .update(body)
    .digest("hex");

  if (signature !== expected) {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(body) as {
    triggerEvent: string;
    payload: {
      uid?: string;
      status?: string;
      startTime?: string;
      endTime?: string;
      [key: string]: unknown;
    };
  };

  const supabase = supabaseServer();

  const eventId = `cal_${event.triggerEvent}_${event.payload.uid ?? Date.now()}`;

  const { data: existing } = await supabase
    .from("webhook_events")
    .select("id")
    .eq("event_id", eventId)
    .single();

  if (existing) {
    return Response.json({ received: true, duplicate: true });
  }

  await supabase.from("webhook_events").insert({
    source: "cal",
    event_id: eventId,
    event_type: event.triggerEvent,
    payload: event.payload as Record<string, unknown>,
  });

  try {
    switch (event.triggerEvent) {
      case "BOOKING_CANCELLED": {
        if (event.payload.uid) {
          await supabase
            .from("bookings")
            .update({ status: "cancelled" })
            .eq("cal_booking_uid", event.payload.uid);
        }
        break;
      }

      case "BOOKING_RESCHEDULED": {
        if (event.payload.uid) {
          await supabase
            .from("bookings")
            .update({
              starts_at: event.payload.startTime,
              ends_at: event.payload.endTime,
            })
            .eq("cal_booking_uid", event.payload.uid);
        }
        break;
      }
    }

    await supabase
      .from("webhook_events")
      .update({ processed_at: new Date().toISOString() })
      .eq("event_id", eventId);
  } catch (err) {
    console.error("Cal webhook processing error:", err);
    return Response.json(
      { error: "Processing failed" },
      { status: 500 }
    );
  }

  return Response.json({ received: true });
}
