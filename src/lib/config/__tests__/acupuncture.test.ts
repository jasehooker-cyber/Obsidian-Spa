import { describe, it, expect } from "vitest";
import { ACUPUNCTURE_SERVICES, HAS_BOOKABLE_ACUPUNCTURE } from "@/lib/config/acupuncture";

describe("acupuncture menu", () => {
  it("offers acupuncture and electro-acupuncture", () => {
    expect(ACUPUNCTURE_SERVICES).toHaveLength(2);
    const ids = ACUPUNCTURE_SERVICES.map((service) => service.id);
    expect(ids).toContain("acupuncture");
    expect(ids).toContain("electro-acupuncture");
  });

  it("prices acupuncture at $180 and electro-acupuncture at $200", () => {
    const bySlug = Object.fromEntries(
      ACUPUNCTURE_SERVICES.map((service) => [service.id, service.price])
    );
    expect(bySlug["acupuncture"]).toBe(180_00);
    expect(bySlug["electro-acupuncture"]).toBe(200_00);
  });

  it("is not bookable online until a Cal.com event type is set", () => {
    expect(HAS_BOOKABLE_ACUPUNCTURE).toBe(false);
    for (const service of ACUPUNCTURE_SERVICES) {
      expect(service.calSlug).toBeUndefined();
    }
  });
});
