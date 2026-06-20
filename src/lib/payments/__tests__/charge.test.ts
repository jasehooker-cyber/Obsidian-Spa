import { describe, it, expect } from "vitest";
import { BUSINESS, SERVICES } from "@/lib/config/business-rules";

describe("fee calculations", () => {
  it("late cancel fee is $40 (4000 cents)", () => {
    expect(BUSINESS.fees.lateCancelFee).toBe(40_00);
  });

  it("no-show fee is 50% of service price", () => {
    for (const service of SERVICES) {
      const fee = Math.round(
        service.price * (BUSINESS.fees.noShowPercent / 100)
      );
      expect(fee).toBe(service.price / 2);
    }
  });

  it("no-show fee for signature-60 is $75", () => {
    const service = SERVICES.find((s) => s.id === "signature-60")!;
    const fee = Math.round(
      service.price * (BUSINESS.fees.noShowPercent / 100)
    );
    expect(fee).toBe(75_00);
  });

  it("no-show fee for signature-90 is $105", () => {
    const service = SERVICES.find((s) => s.id === "signature-90")!;
    const fee = Math.round(
      service.price * (BUSINESS.fees.noShowPercent / 100)
    );
    expect(fee).toBe(105_00);
  });

  it("no-show fee for couples is $130", () => {
    const service = SERVICES.find((s) => s.id === "couples")!;
    const fee = Math.round(
      service.price * (BUSINESS.fees.noShowPercent / 100)
    );
    expect(fee).toBe(130_00);
  });

  it("late cancel window is 2 hours", () => {
    expect(BUSINESS.fees.lateCancelWindow).toBe(2);
  });
});
