import Stripe from "stripe";
import { getEnv } from "@/lib/config/env";

let instance: Stripe | null = null;

export function stripe(): Stripe {
  if (!instance) instance = new Stripe(getEnv().stripe.secretKey);
  return instance;
}
