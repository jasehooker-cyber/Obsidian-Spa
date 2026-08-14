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
  it("offers 4 services across 7 event types", () => {
    expect(CAL_SERVICES).toHaveLength(4);
    expect(allDurations).toHaveLength(7);
  });

  it("no longer offers couples or four-handed", () => {
    const names = CAL_SERVICES.map((service) => service.name.toLowerCase());
    expect(names.some((name) => name.includes("couples"))).toBe(false);
    expect(names.some((name) => name.includes("four-handed"))).toBe(false);
  });

  it("has a unique slug and namespace per event type", () => {
    const slugs = allDurations.map((duration) => duration.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(CAL_NAMESPACES).size).toBe(CAL_NAMESPACES.length);
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
    expect(bySlug["the-split"].price).toBe(100_00);
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
    expect(basePrice(split)).toBe(100_00);

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

  it("shows the whole day's times rather than a month grid", () => {
    expect(CAL_LAYOUT).toBe("column_view");
  });
});
