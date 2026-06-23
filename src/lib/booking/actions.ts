import { supabaseServer } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe/server";
import { createBooking as calCreateBooking } from "@/lib/cal/server";
import { createCalendarEvent } from "@/lib/google/server";
import { sendBookingConfirmation } from "@/lib/email/server";
import { getEnv } from "@/lib/config/env";
import { BUSINESS } from "@/lib/config/business-rules";
import { generateIntakeToken, buildIntakeUrl } from "@/lib/booking/intake";
import type { BookingDraftInput, CreateSetupSessionInput } from "@/lib/schemas/booking";

export async function createDraftBooking(input: BookingDraftInput) {
  const supabase = supabaseServer();

  const { data: service } = await supabase
    .from("services")
    .select("id")
    .eq("service_key", input.serviceId)
    .single();

  if (!service) throw new Error("Service not found");

  const { data: therapist } = await supabase
    .from("therapists")
    .select("id")
    .eq("id", input.therapistId)
    .eq("active", true)
    .single();

  if (!therapist) throw new Error("Therapist not found");

  const { data: booking, error } = await supabase
    .from("bookings")
    .insert({
      therapist_id: input.therapistId,
      service_id: service.id,
      status: "draft",
      starts_at: input.slotStart,
      ends_at: input.slotEnd,
    })
    .select("id")
    .single();

  if (error || !booking) throw new Error("Failed to create draft booking");

  if (input.addOnIds.length > 0) {
    const addOnRows: { booking_id: string; add_on_id: string }[] = [];

    for (const addOnKey of input.addOnIds) {
      const { data: addOn } = await supabase
        .from("add_ons")
        .select("id")
        .eq("add_on_key", addOnKey)
        .single();

      if (addOn) {
        addOnRows.push({ booking_id: booking.id, add_on_id: addOn.id });
      }
    }

    if (addOnRows.length > 0) {
      await supabase.from("booking_add_ons").insert(addOnRows);
    }
  }

  return { draftId: booking.id };
}

export async function createSetupSession(input: CreateSetupSessionInput) {
  const supabase = supabaseServer();
  const s = stripe();

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, status")
    .eq("id", input.draftId)
    .eq("status", "draft")
    .single();

  if (!booking) throw new Error("Draft booking not found");

  const { data: existingClient } = await supabase
    .from("clients")
    .select("id, stripe_customer_id")
    .eq("email", input.clientEmail.toLowerCase())
    .single();

  let clientId: string;
  let stripeCustomerId: string;

  if (existingClient?.stripe_customer_id) {
    clientId = existingClient.id;
    stripeCustomerId = existingClient.stripe_customer_id;
  } else {
    const customer = await s.customers.create({
      email: input.clientEmail.toLowerCase(),
      name: input.clientName,
      phone: input.clientPhone,
    });
    stripeCustomerId = customer.id;

    if (existingClient) {
      clientId = existingClient.id;
      await supabase
        .from("clients")
        .update({
          stripe_customer_id: stripeCustomerId,
          name: input.clientName,
          phone: input.clientPhone,
        })
        .eq("id", clientId);
    } else {
      const { data: newClient, error } = await supabase
        .from("clients")
        .insert({
          email: input.clientEmail.toLowerCase(),
          name: input.clientName,
          phone: input.clientPhone,
          stripe_customer_id: stripeCustomerId,
        })
        .select("id")
        .single();

      if (error || !newClient) throw new Error("Failed to create client");
      clientId = newClient.id;
    }
  }

  const setupIntent = await s.setupIntents.create({
    customer: stripeCustomerId,
    payment_method_types: ["card"],
    metadata: {
      booking_id: booking.id,
      client_id: clientId,
    },
  });

  await supabase
    .from("bookings")
    .update({
      client_id: clientId,
      stripe_setup_intent_id: setupIntent.id,
    })
    .eq("id", booking.id);

  return { clientSecret: setupIntent.client_secret! };
}

export async function confirmBooking(setupIntentId: string) {
  const supabase = supabaseServer();
  const s = stripe();

  const setupIntent = await s.setupIntents.retrieve(setupIntentId);
  if (setupIntent.status !== "succeeded") {
    throw new Error("SetupIntent has not succeeded");
  }

  const { data: booking } = await supabase
    .from("bookings")
    .select(`
      id, status, starts_at, ends_at, stripe_setup_intent_id,
      therapist_id, service_id,
      clients!inner(id, name, email),
      therapists!inner(name, cal_event_type_id),
      services!inner(name, duration_minutes, price_cents),
      booking_add_ons(add_ons(name, price_cents))
    `)
    .eq("stripe_setup_intent_id", setupIntentId)
    .single();

  if (!booking) throw new Error("Booking not found for this SetupIntent");
  if (booking.status === "confirmed") return { bookingId: booking.id };

  const paymentMethodId =
    typeof setupIntent.payment_method === "string"
      ? setupIntent.payment_method
      : setupIntent.payment_method?.id;

  if (paymentMethodId) {
    await s.paymentMethods.attach(paymentMethodId, {
      customer: setupIntent.customer as string,
    });
  }

  const client = booking.clients as unknown as { id: string; name: string; email: string };
  const therapist = booking.therapists as unknown as { name: string; cal_event_type_id: number };
  const service = booking.services as unknown as { name: string; duration_minutes: number; price_cents: number };
  const bookingAddOns = (booking.booking_add_ons as unknown as { add_ons: { name: string; price_cents: number } }[]) ?? [];

  let calBookingUid: string | null = null;
  try {
    const calResult = await calCreateBooking({
      eventTypeId: therapist.cal_event_type_id,
      start: booking.starts_at,
      attendee: {
        name: client.name,
        email: client.email,
        timeZone: BUSINESS.timezone,
      },
      metadata: { booking_id: booking.id },
    });
    calBookingUid = calResult.uid;
  } catch (err) {
    console.error("Cal.com booking creation failed:", err);
  }

  let googleEventId: string | null = null;
  if (getEnv().google.configured) {
    try {
      const event = await createCalendarEvent({
        summary: `${service.name} — ${client.name} w/ ${therapist.name}`,
        start: booking.starts_at,
        end: booking.ends_at,
        description: `Service: ${service.name}\nClient: ${client.name} (${client.email})`,
      });
      googleEventId = event.id;
    } catch (err) {
      console.error("Google Calendar event creation failed:", err);
    }
  }

  await supabase
    .from("bookings")
    .update({
      status: "confirmed",
      confirmed_at: new Date().toISOString(),
      stripe_payment_method_id: paymentMethodId ?? null,
      cal_booking_uid: calBookingUid,
      google_event_id: googleEventId,
    })
    .eq("id", booking.id);

  try {
    await sendBookingConfirmation({
      clientName: client.name,
      clientEmail: client.email,
      serviceName: service.name,
      servicePrice: service.price_cents,
      therapistName: therapist.name,
      startsAt: booking.starts_at,
      addOns: bookingAddOns.map((ba) => ({
        name: ba.add_ons.name,
        price: ba.add_ons.price_cents,
      })),
    });
  } catch (err) {
    console.error("Confirmation email failed:", err);
  }

  try {
    const token = await generateIntakeToken(booking.id);
    const intakeUrl = buildIntakeUrl(token);
    console.log(
      `[INTAKE] Send to ${client.name} (${client.email}): ${intakeUrl}`
    );
  } catch (err) {
    console.error("Intake generation failed:", err);
  }

  return { bookingId: booking.id };
}
