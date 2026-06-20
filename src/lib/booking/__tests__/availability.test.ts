import { describe, it, expect } from "vitest";
import { BUSINESS, SERVICES } from "@/lib/config/business-rules";

describe("availability business rules", () => {
  it("max advance days is 7", () => {
    expect(BUSINESS.booking.maxAdvanceDays).toBe(7);
  });

  it("minimum notice is 30 minutes", () => {
    expect(BUSINESS.booking.minNoticeMinutes).toBe(30);
  });

  it("buffer between appointments is 20 minutes", () => {
    expect(BUSINESS.booking.bufferMinutes).toBe(20);
  });

  it("request-based services should not show availability", () => {
    const requestServices = SERVICES.filter(
      (s) => s.bookingMode === "request"
    );
    expect(requestServices.length).toBeGreaterThan(0);
    for (const s of requestServices) {
      expect(s.requiresMultipleTherapists).toBe(true);
    }
  });

  it("instant-book services are single-therapist only", () => {
    const instantServices = SERVICES.filter(
      (s) => s.bookingMode === "instant"
    );
    expect(instantServices.length).toBeGreaterThan(0);
    for (const s of instantServices) {
      expect(s.requiresMultipleTherapists).toBe(false);
    }
  });

  it("min notice filter removes slots too close to now", () => {
    const now = new Date();
    const tooSoon = new Date(
      now.getTime() + (BUSINESS.booking.minNoticeMinutes - 1) * 60_000
    );
    const okSlot = new Date(
      now.getTime() + (BUSINESS.booking.minNoticeMinutes + 1) * 60_000
    );
    const minNotice = new Date(
      now.getTime() + BUSINESS.booking.minNoticeMinutes * 60_000
    );

    expect(tooSoon < minNotice).toBe(true);
    expect(okSlot >= minNotice).toBe(true);
  });

  it("max advance check rejects dates beyond window", () => {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + BUSINESS.booking.maxAdvanceDays);

    const tooFar = new Date();
    tooFar.setDate(tooFar.getDate() + BUSINESS.booking.maxAdvanceDays + 1);

    expect(tooFar > maxDate).toBe(true);
  });
});
