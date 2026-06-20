import { describe, it, expect } from "vitest";
import {
  BUSINESS,
  SERVICES,
  ADD_ONS,
  formatPrice,
} from "@/lib/config/business-rules";

describe("business rules", () => {
  it("has correct operating hours", () => {
    expect(BUSINESS.hours.open).toBe("08:00");
    expect(BUSINESS.hours.close).toBe("22:00");
  });

  it("has correct booking constraints", () => {
    expect(BUSINESS.booking.bufferMinutes).toBe(20);
    expect(BUSINESS.booking.minNoticeMinutes).toBe(30);
    expect(BUSINESS.booking.maxAdvanceDays).toBe(7);
    expect(BUSINESS.booking.allowSelfCancel).toBe(false);
    expect(BUSINESS.booking.cardOnFileRequired).toBe(true);
  });

  it("has correct fee structure", () => {
    expect(BUSINESS.fees.lateCancelFee).toBe(40_00);
    expect(BUSINESS.fees.lateCancelWindow).toBe(2);
    expect(BUSINESS.fees.noShowPercent).toBe(50);
  });

  it("uses America/New_York timezone", () => {
    expect(BUSINESS.timezone).toBe("America/New_York");
  });
});

describe("services", () => {
  it("has 4 services", () => {
    expect(SERVICES).toHaveLength(4);
  });

  it("single-therapist services are instant-book", () => {
    const instant = SERVICES.filter((s) => s.bookingMode === "instant");
    expect(instant).toHaveLength(2);
    expect(instant.every((s) => !s.requiresMultipleTherapists)).toBe(true);
  });

  it("multi-therapist services are request-based", () => {
    const request = SERVICES.filter((s) => s.bookingMode === "request");
    expect(request).toHaveLength(2);
    expect(request.every((s) => s.requiresMultipleTherapists)).toBe(true);
  });

  it("has correct prices in cents", () => {
    const byId = Object.fromEntries(SERVICES.map((s) => [s.id, s]));
    expect(byId["signature-60"].price).toBe(150_00);
    expect(byId["signature-90"].price).toBe(210_00);
    expect(byId["couples"].price).toBe(260_00);
    expect(byId["four-handed"].price).toBe(260_00);
  });
});

describe("add-ons", () => {
  it("has 3 add-ons all at $30", () => {
    expect(ADD_ONS).toHaveLength(3);
    expect(ADD_ONS.every((a) => a.price === 30_00)).toBe(true);
  });
});

describe("formatPrice", () => {
  it("formats cents to dollar string", () => {
    expect(formatPrice(150_00)).toBe("$150");
    expect(formatPrice(30_00)).toBe("$30");
    expect(formatPrice(40_00)).toBe("$40");
  });
});
