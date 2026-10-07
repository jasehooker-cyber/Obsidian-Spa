import { describe, it, expect } from "vitest";
import {
  CAL_NAMESPACES,
  CAL_SERVICES,
  CAL_TEAM_SLUG,
  CAL_LAYOUT,
  CAL_TRIGGER_CONFIG,
  PAYMENT_NOTICE,
  basePrice,
  calLink,
} from "@/lib/config/cal-events";

const allDurations = CAL_SERVICES.flatMap((service) => service.durations);

describe("cal.com service menu", () => {
  it("offers 5 services across 10 event types", () => {
    expect(CAL_SERVICES).toHaveLength(5);
    expect(allDurations).toHaveLength(10);
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
    expect(bySlug["blackout-copy"].price).toBe(150_00);
    expect(bySlug["blackout"].price).toBe(210_00);
    // KILN runs on the event types that used to be The Forge.
    expect(bySlug["the-forge"].price).toBe(220_00);
    expect(bySlug["the-forge-copy"].price).toBe(280_00);
    expect(bySlug["couples-massage"].price).toBe(290_00);
    expect(bySlug["couples-massage-90-min"].price).toBe(390_00);
    expect(bySlug["four-handed-60-min"].price).toBe(260_00);
    expect(bySlug["four-handed-90-min"].price).toBe(360_00);
  });

  it("matches the session lengths configured in Cal.com", () => {
    // Verified against cal.com/team/obsidian-spa — a length drifting from Cal
    // is how the site once advertised a session Cal no longer offered.
    const bySlug = Object.fromEntries(
      allDurations.map((duration) => [duration.slug, duration.minutes])
    );
    expect(bySlug["obsidian"]).toBe(60);
    expect(bySlug["obsidian-copy"]).toBe(90);
    expect(bySlug["blackout-copy"]).toBe(60);
    expect(bySlug["blackout"]).toBe(90);
    expect(bySlug["the-forge"]).toBe(75);
    expect(bySlug["the-forge-copy"]).toBe(90);
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
    const kiln = CAL_SERVICES.find((s) => s.id === "kiln")!;
    expect(basePrice(kiln)).toBe(220_00);

    const obsidian = CAL_SERVICES.find((s) => s.id === "obsidian-signature")!;
    expect(basePrice(obsidian)).toBe(180_00);
  });

  it("builds team booking links", () => {
    expect(calLink("obsidian")).toBe(`team/${CAL_TEAM_SLUG}/obsidian`);
  });

  it("tells the embed to use the slot view on small screens", () => {
    expect(JSON.parse(CAL_TRIGGER_CONFIG)).toEqual({
      layout: CAL_LAYOUT,
      useSlotsViewOnSmallScreen: "true",
    });
  });

  it("no longer offers The Split or The Forge", () => {
    expect(allDurations.some((d) => d.slug === "the-split")).toBe(false);
    const ids = CAL_SERVICES.map((s) => s.id);
    expect(ids).not.toContain("the-split");
    expect(ids).not.toContain("the-forge");
  });

  it("puts the KILN booking buttons on the former Forge event types", () => {
    const kiln = CAL_SERVICES.find((s) => s.id === "kiln")!;
    expect(kiln.durations.map((d) => [d.minutes, d.eventTypeId])).toEqual([
      [75, 6640251],
      [90, 6640308],
    ]);
  });

  it("asks guests to bring a 20% cash tip wherever booking happens", () => {
    expect(PAYMENT_NOTICE).toContain("cash tip of 20%");
  });

  it("lists KILN right after the Signature", () => {
    const ids = CAL_SERVICES.map((s) => s.id);
    expect(ids.indexOf("kiln")).toBe(ids.indexOf("obsidian-signature") + 1);
  });

  it("uses a layout every event type has enabled", () => {
    expect(CAL_LAYOUT).toBe("month_view");
  });
});
