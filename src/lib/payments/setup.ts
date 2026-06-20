import { stripe } from "@/lib/stripe/server";

export async function createSetupIntentForBooking(
  stripeCustomerId: string,
  metadata: Record<string, string>
) {
  const s = stripe();
  return s.setupIntents.create({
    customer: stripeCustomerId,
    payment_method_types: ["card"],
    metadata,
  });
}

export async function retrieveSetupIntent(setupIntentId: string) {
  const s = stripe();
  return s.setupIntents.retrieve(setupIntentId);
}
