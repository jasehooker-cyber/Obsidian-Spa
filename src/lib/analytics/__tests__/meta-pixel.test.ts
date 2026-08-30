import { beforeEach, describe, expect, it, vi } from "vitest";
import { CAL_SERVICES } from "@/lib/config/cal-events";

async function load() {
  vi.resetModules();
  return import("@/lib/analytics/meta-pixel");
}

const fbq = vi.fn();

beforeEach(() => {
  fbq.mockClear();
  (globalThis as unknown as { window: unknown }).window = { fbq };
});

const OBSIDIAN_60 = 6637250;

describe("Meta booking conversions", () => {
  it("reports a completed booking as Schedule with value and currency", async () => {
    const { reportMetaBooking } = await load();

    reportMetaBooking({ uid: "bk_1", eventTypeId: OBSIDIAN_60 });

    expect(fbq).toHaveBeenCalledTimes(1);
    expect(fbq).toHaveBeenCalledWith(
      "track",
      "Schedule",
      { value: 180, currency: "USD" },
      { eventID: "bk_1" }
    );
  });

  it("reports each booking uid only once", async () => {
    const { reportMetaBooking } = await load();

    reportMetaBooking({ uid: "bk_2", eventTypeId: OBSIDIAN_60 });
    reportMetaBooking({ uid: "bk_2", eventTypeId: OBSIDIAN_60 });
    reportMetaBooking({ uid: "bk_2", eventTypeId: OBSIDIAN_60 });

    expect(fbq).toHaveBeenCalledTimes(1);
  });

  it("still reports Schedule when the event type cannot be priced", async () => {
    const { reportMetaBooking } = await load();

    reportMetaBooking({ uid: "bk_unknown", eventTypeId: 999999 });

    expect(fbq).toHaveBeenCalledWith(
      "track",
      "Schedule",
      { currency: "USD" },
      { eventID: "bk_unknown" }
    );
  });

  it("covers every event type on the booking menu", async () => {
    const { reportMetaBooking } = await load();
    const durations = CAL_SERVICES.flatMap((service) => service.durations);

    durations.forEach((duration, index) =>
      reportMetaBooking({
        uid: `bk_all_${index}`,
        eventTypeId: duration.eventTypeId,
      })
    );

    expect(fbq).toHaveBeenCalledTimes(durations.length);
    const values = fbq.mock.calls.map((call) => call[2].value);
    expect(values).toEqual(durations.map((duration) => duration.price / 100));
  });
});
