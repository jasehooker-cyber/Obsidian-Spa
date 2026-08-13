import { createHmac, timingSafeEqual } from "crypto";
import { getEnv } from "@/lib/config/env";
import { supabaseServer } from "@/lib/supabase/server";
import { getBooking } from "@/lib/cal/server";
import {
  syncCalBookingAndSendPayLink,
  UnmappedEventTypeError,
} from "@/lib/booking/cal-sync";

/** Constant-time compare so the signature check cannot be timed. */
function signatureMatches(expected: string, received: string): boolean {
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(received, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("x-cal-signature-256");

  if (!signature) {
    return Response.json({ error: "Missing signature" }, { status: 400 });
  }

  const expected = createHmac("sha256", getEnv().cal.webhookSecret)
    .update(body)
    .digest("hex");

  if (!signatureMatches(expected, signature)) {
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
      case "BOOKING_CREATED": {
        // Cal.com owns scheduling now, so this is where a booking enters our
        // system. Read the canonical booking back from the API rather than
        // trusting the webhook's payload shape, then email the pay link.
        if (event.payload.uid) {
          try {
            await syncCalBookingAndSendPayLink(
              await getBooking(event.payload.uid)
            );
          } catch (err) {
            // A booking on a non-spa event type is not ours. Acknowledge it so
            // Cal.com stops retrying something that can never succeed.
            if (!(err instanceof UnmappedEventTypeError)) throw err;
            console.warn(err.message);
          }
        }
        break;
      }

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
