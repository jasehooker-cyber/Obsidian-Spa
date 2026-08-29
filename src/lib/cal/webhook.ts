import { createHmac, timingSafeEqual } from "crypto";

/** Verify Cal.com's x-cal-signature-256 HMAC using the dedicated webhook secret. */
export function verifyCalWebhookSignature(
  body: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature || !secret || !/^[0-9a-fA-F]+$/.test(signature)) {
    return false;
  }

  const expected = createHmac("sha256", secret).update(body).digest();
  const received = Buffer.from(signature, "hex");

  if (received.length !== expected.length) return false;
  return timingSafeEqual(received, expected);
}
