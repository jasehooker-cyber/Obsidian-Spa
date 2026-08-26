import { describe, it, expect } from "vitest";
import { BUSINESS, ADD_ONS, formatPrice } from "@/lib/config/business-rules";

describe("business rules", () => {
  it("has correct operating hours", () => {
    expect(BUSINESS.hours.open).toBe("08:00");
    expect(BUSINESS.hours.close).toBe("22:00");
  });

  it("has correct booking constraints", () => {
    expect(BUSINESS.booking.bufferMinutes).toBe(20);
    expect(BUSINESS.booking.minNoticeMinutes).toBe(0);
    expect(BUSINESS.booking.maxAdvanceDays).toBe(7);
    expect(BUSINESS.booking.allowSelfCancel).toBe(false);
    expect(BUSINESS.booking.cardOnFileRequired).toBe(false);
  });

  it("has correct fee structure", () => {
    expect(BUSINESS.fees.lateCancelFee).toBe(40_00);
    expect(BUSINESS.fees.lateCancelWindowMinutes).toBe(30);
    expect(BUSINESS.fees.noShowPercent).toBe(50);
  });

  it("uses America/New_York timezone", () => {
    expect(BUSINESS.timezone).toBe("America/New_York");
  });
});

describe("add-ons", () => {
  it("keeps the retired add-on config for legacy bookings", () => {
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
