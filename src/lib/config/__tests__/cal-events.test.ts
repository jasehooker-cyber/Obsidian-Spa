import { describe, it, expect } from "vitest";
import {
  CAL_NAMESPACES,
  CAL_SERVICES,
  CAL_TEAM_SLUG,
  CAL_LAYOUT,
  CAL_TRIGGER_CONFIG,
  basePrice,
  calLink,
} from "@/lib/config/cal-events";

const allDurations = CAL_SERVICES.flatMap((service) => service.durations);

describe("cal.com service menu", () => {
  it("offers 6 services across 11 event types", () => {
    expect(CAL_SERVICES).toHaveLength(6);
    expect(allDurations).toHaveLength(11);
  });

  it("offers couples massage and four-handed massage", () => {
    const names = CAL_SERVICES.map((service) => service.name.toLowerCase());
    expect(names.some((name) => name.includes("couples"))).toBe(true);
    expect(names.some((name) => name.includes("four-handed"))).toBe(true);
  });

  it("has a unique slug, namespace, and event type id per event type", () => {
    const slugs = allDurations.map((duration) => duration.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(CAL_NAMESPACES).size).toBe(CAL_NAMESPACES.length);

    // Cal reports the event type id (not the slug) on a completed booking, and
    // google-ads.ts prices the conversion by looking that id up — a collision
    // here would silently mis-price a conversion rather than error.
    const eventTypeIds = allDurations.map((duration) => duration.eventTypeId);
    expect(new Set(eventTypeIds).size).toBe(eventTypeIds.length);
  });

  it("prices each length, cheapest first within a service", () => {
    for (const service of CAL_SERVICES) {
      expect(service.durations.every((d) => d.price > 0)).toBe(true);
      const prices = service.durations.map((d) => d.price);
      expect(prices).toEqual([...prices].sort((a, b) => a - b));
    }
  });

  it("matches the prices configured in Cal.com", () => {
    const bySlug = Object.fromEntries(
      allDurations.map((duration) => [duration.slug, duration])
    );
    expect(bySlug["obsidian"].price).toBe(180_00);
    expect(bySlug["obsidian-copy"].price).toBe(240_00);
    expect(bySlug["the-forge"].price).toBe(165_00);
    expect(bySlug["the-forge-copy"].price).toBe(225_00);
    expect(bySlug["blackout-copy"].price).toBe(150_00);
    expect(bySlug["blackout"].price).toBe(210_00);
    expect(bySlug["the-split"].price).toBe(95_00);
    expect(bySlug["couples-massage"].price).toBe(290_00);
    expect(bySlug["couples-massage-90-min"].price).toBe(390_00);
    expect(bySlug["four-handed-60-min"].price).toBe(260_00);
    expect(bySlug["four-handed-90-min"].price).toBe(360_00);
  });

  it("matches the session lengths configured in Cal.com", () => {
    // Verified against cal.com/team/obsidian-spa. The Split was shortened from
    // 45 to 30 minutes there; the site advertised the old length until caught.
    const bySlug = Object.fromEntries(
      allDurations.map((duration) => [duration.slug, duration.minutes])
    );
    expect(bySlug["obsidian"]).toBe(60);
    expect(bySlug["obsidian-copy"]).toBe(90);
    expect(bySlug["the-forge"]).toBe(60);
    expect(bySlug["the-forge-copy"]).toBe(90);
    expect(bySlug["blackout-copy"]).toBe(60);
    expect(bySlug["blackout"]).toBe(90);
    expect(bySlug["the-split"]).toBe(30);
    expect(bySlug["couples-massage"]).toBe(60);
    expect(bySlug["couples-massage-90-min"]).toBe(90);
    expect(bySlug["four-handed-60-min"]).toBe(60);
    expect(bySlug["four-handed-90-min"]).toBe(90);
  });

  it("keeps the reversed Blackout slugs straight", () => {
    const blackout = CAL_SERVICES.find((s) => s.id === "blackout")!;
    const bySlug = Object.fromEntries(
      blackout.durations.map((d) => [d.slug, d.minutes])
    );
    expect(bySlug["blackout"]).toBe(90);
    expect(bySlug["blackout-copy"]).toBe(60);
  });

  it("reports the lowest price as the base price", () => {
    const split = CAL_SERVICES.find((s) => s.id === "the-split")!;
    expect(basePrice(split)).toBe(95_00);

    const obsidian = CAL_SERVICES.find((s) => s.id === "obsidian-signature")!;
    expect(basePrice(obsidian)).toBe(180_00);
  });

  it("builds team booking links", () => {
    expect(calLink("the-split")).toBe(`team/${CAL_TEAM_SLUG}/the-split`);
  });

  it("tells the embed to use the slot view on small screens", () => {
    expect(JSON.parse(CAL_TRIGGER_CONFIG)).toEqual({
      layout: CAL_LAYOUT,
      useSlotsViewOnSmallScreen: "true",
    });
  });

  it("uses a layout every event type has enabled", () => {
    expect(CAL_LAYOUT).toBe("month_view");
  });
});
