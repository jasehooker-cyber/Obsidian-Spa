import { describe, it, expect } from "vitest";
import { BUSINESS } from "@/lib/config/business-rules";
import { CAL_SERVICES } from "@/lib/config/cal-events";

const allDurations = CAL_SERVICES.flatMap((service) => service.durations);

describe("fee calculations", () => {
  it("late cancel fee is $40 (4000 cents)", () => {
    expect(BUSINESS.fees.lateCancelFee).toBe(40_00);
  });

  it("no-show fee is 50% of the booked session price", () => {
    for (const duration of allDurations) {
      const fee = Math.round(
        duration.price * (BUSINESS.fees.noShowPercent / 100)
      );
      expect(fee).toBe(duration.price / 2);
    }
  });

  it("no-show fee for the 60 minute signature is $90", () => {
    const duration = allDurations.find((d) => d.slug === "obsidian")!;
    expect(
      Math.round(duration.price * (BUSINESS.fees.noShowPercent / 100))
    ).toBe(90_00);
  });

  it("no-show fee for the 90 minute signature is $120", () => {
    const duration = allDurations.find((d) => d.slug === "obsidian-copy")!;
    expect(
      Math.round(duration.price * (BUSINESS.fees.noShowPercent / 100))
    ).toBe(120_00);
  });

  it("no-show fee for The Split is $47.50", () => {
    const duration = allDurations.find((d) => d.slug === "the-split")!;
    expect(
      Math.round(duration.price * (BUSINESS.fees.noShowPercent / 100))
    ).toBe(47_50);
  });

  it("every session price halves to whole cents", () => {
    for (const duration of allDurations) {
      expect(duration.price % 2).toBe(0);
    }
  });
});
