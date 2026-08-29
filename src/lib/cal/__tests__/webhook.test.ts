import { describe, expect, it } from "vitest";
import { verifyCalWebhookSignature } from "@/lib/cal/webhook";

const body =
  '{"triggerEvent":"BOOKING_CREATED","payload":{"uid":"abc123"}}';
const signature =
  "929b6649690ba688c80ca85ee4b81f1f4b9a2b9a6091f1081bc41716887f4bf6";

describe("Cal.com webhook signature verification", () => {
  it("accepts a signature made with the webhook secret", () => {
    expect(
      verifyCalWebhookSignature(body, signature, "webhook-secret")
    ).toBe(true);
  });

  it("rejects the same signature when the Cal.com API key is used instead", () => {
    expect(verifyCalWebhookSignature(body, signature, "cal-api-key")).toBe(
      false
    );
  });

  it("rejects malformed or missing signatures", () => {
    expect(verifyCalWebhookSignature(body, null, "webhook-secret")).toBe(false);
    expect(verifyCalWebhookSignature(body, "not-hex", "webhook-secret")).toBe(
      false
    );
  });
});
