import { describe, it, expect } from "vitest";
import { ACUPUNCTURE_SERVICES } from "@/lib/config/acupuncture";
import {
  BOOKABLE_SERVICES,
  CAL_NAMESPACES,
  CAL_SERVICES,
} from "@/lib/config/cal-events";

describe("acupuncture", () => {
  it("offers one-to-one acupuncture only — no electro-acupuncture", () => {
    expect(ACUPUNCTURE_SERVICES.map((service) => service.id)).toEqual([
      "acupuncture",
    ]);
  });

  it("matches the TCM event type configured in Cal.com", () => {
    // Verified against cal.com/team/obsidian-spa/tcm-60-min.
    const [duration] = ACUPUNCTURE_SERVICES[0].durations;
    expect(duration).toEqual({
      minutes: 60,
      slug: "tcm-60-min",
      namespace: "tcm-60-min",
      eventTypeId: 7388978,
      price: 180_00,
    });
  });

  it("is bookable online but kept out of the massage menu", () => {
    expect(BOOKABLE_SERVICES.some((s) => s.id === "acupuncture")).toBe(true);
    expect(CAL_NAMESPACES).toContain("tcm-60-min");
    expect(CAL_SERVICES.some((s) => s.id === "acupuncture")).toBe(false);
  });

  it("has an event type id no massage shares", () => {
    const ids = BOOKABLE_SERVICES.flatMap((s) =>
      s.durations.map((d) => d.eventTypeId)
    );
    expect(new Set(ids).size).toBe(ids.length);
  });
});
