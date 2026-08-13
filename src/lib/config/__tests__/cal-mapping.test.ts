import { describe, it, expect } from "vitest";
import {
  ADD_ONS,
  CAL_USERNAME,
  SERVICES,
  calLinkFor,
  parseAddOnIds,
  serviceByCalEventTypeId,
} from "@/lib/config/business-rules";

describe("Cal.com event type mapping", () => {
  it("gives every service a Cal.com event type and slug", () => {
    for (const service of SERVICES) {
      expect(service.calEventTypeId, service.id).toBeGreaterThan(0);
      expect(service.calEventSlug, service.id).not.toBe("");
    }
  });

  it("maps each event type id to exactly one service", () => {
    const ids = SERVICES.map((s) => s.calEventTypeId);
    expect(new Set(ids).size).toBe(SERVICES.length);
  });

  it("gives each service a distinct booking link", () => {
    const slugs = SERVICES.map((s) => s.calEventSlug);
    expect(new Set(slugs).size).toBe(SERVICES.length);
  });

  it("resolves a booked event type back to its service", () => {
    for (const service of SERVICES) {
      expect(serviceByCalEventTypeId(service.calEventTypeId)?.id).toBe(
        service.id
      );
    }
  });

  it("returns undefined for an event type we do not offer", () => {
    expect(serviceByCalEventTypeId(999_999)).toBeUndefined();
    expect(serviceByCalEventTypeId(null)).toBeUndefined();
    expect(serviceByCalEventTypeId(undefined)).toBeUndefined();
  });

  it("builds the embed link as username/slug", () => {
    const service = SERVICES[0];
    expect(calLinkFor(service)).toBe(
      `${CAL_USERNAME}/${service.calEventSlug}`
    );
  });
});

describe("parseAddOnIds", () => {
  it("parses the comma-separated list we send through Cal.com metadata", () => {
    expect(parseAddOnIds("cbd,cupping")).toEqual(["cbd", "cupping"]);
  });

  it("accepts every real add-on id", () => {
    const all = ADD_ONS.map((a) => a.id);
    expect(parseAddOnIds(all.join(","))).toEqual(all);
  });

  it("drops ids that are not real add-ons", () => {
    expect(parseAddOnIds("cbd,free-upgrade")).toEqual(["cbd"]);
  });

  it("de-duplicates repeated ids", () => {
    expect(parseAddOnIds("cbd,cbd")).toEqual(["cbd"]);
  });

  it("tolerates surrounding whitespace", () => {
    expect(parseAddOnIds(" cbd , cupping ")).toEqual(["cbd", "cupping"]);
  });

  it("returns nothing for empty or non-string metadata", () => {
    expect(parseAddOnIds("")).toEqual([]);
    expect(parseAddOnIds(undefined)).toEqual([]);
    expect(parseAddOnIds(null)).toEqual([]);
    expect(parseAddOnIds(42)).toEqual([]);
  });
});
