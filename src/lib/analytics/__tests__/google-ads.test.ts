import { describe, it, expect, beforeEach, vi } from "vitest";
import { CAL_SERVICES } from "@/lib/config/cal-events";

/**
 * The module reads the conversion label at import time and keeps a module-level
 * set of reported bookings, so each test re-imports it with a fresh registry.
 */
async function load(label?: string) {
  vi.resetModules();
  if (label) process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL = label;
  else delete process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL;
  return import("@/lib/analytics/google-ads");
}

/** The event name the Ads conversion action listens for. */
const EVENT = "ads_conversion_Book_appointment_1";

const gtag = vi.fn();

beforeEach(() => {
  gtag.mockClear();
  // Tests run in node; stand up just enough of window for the reporter.
  (globalThis as unknown as { window: unknown }).window = {
    dataLayer: [] as unknown[],
    gtag,
  };
});

function dataLayer() {
  return (globalThis as unknown as { window: { dataLayer: unknown[] } }).window
    .dataLayer;
}

const OBSIDIAN_60 = 6637250;

describe("booking conversions", () => {
  it("prices the conversion from the event type Cal reports", async () => {
    const { reportBookingConversion } = await load();
    reportBookingConversion({ uid: "bk_1", eventTypeId: OBSIDIAN_60 });

    expect(gtag).toHaveBeenCalledTimes(1);
    const [event, name, params] = gtag.mock.calls[0];
    expect(event).toBe("event");
    expect(name).toBe(EVENT);
    expect(params).toMatchObject({
      value: 180,
      currency: "USD",
      transaction_id: "bk_1",
    });
    // The named action needs no send_to; scoping it would narrow attribution.
    expect(params.send_to).toBeUndefined();
  });

  it("fires without a label, since the action is keyed to the event name", async () => {
    const { reportBookingConversion } = await load();
    reportBookingConversion({ uid: "bk_nolabel", eventTypeId: OBSIDIAN_60 });
    expect(gtag).toHaveBeenCalledTimes(1);
    expect(gtag.mock.calls[0][1]).toBe(EVENT);
  });

  it("scopes to a legacy action when a label is configured", async () => {
    const { reportBookingConversion } = await load("AbC-D_efGh12");
    reportBookingConversion({ uid: "bk_legacy", eventTypeId: OBSIDIAN_60 });
    expect(gtag.mock.calls[0][2]).toMatchObject({
      send_to: "AW-18369793323/AbC-D_efGh12",
    });
  });

  it("reports each booking once, however many times Cal emits it", async () => {
    const { reportBookingConversion } = await load();
    reportBookingConversion({ uid: "bk_2", eventTypeId: OBSIDIAN_60 });
    reportBookingConversion({ uid: "bk_2", eventTypeId: OBSIDIAN_60 });
    reportBookingConversion({ uid: "bk_2", eventTypeId: OBSIDIAN_60 });

    expect(gtag).toHaveBeenCalledTimes(1);
    expect(dataLayer()).toHaveLength(1);
  });

  it("also leaves a dataLayer breadcrumb for GA4 or Tag Manager", async () => {
    const { reportBookingConversion } = await load();
    reportBookingConversion({ uid: "bk_3", eventTypeId: OBSIDIAN_60 });

    expect(dataLayer()).toHaveLength(1);
    expect(dataLayer()[0]).toMatchObject({
      event: "booking_success",
      value: 180,
    });
  });

  it("still reports a booking whose event type it cannot price", async () => {
    const { reportBookingConversion } = await load();
    reportBookingConversion({ uid: "bk_4", eventTypeId: 999999 });

    expect(gtag).toHaveBeenCalledTimes(1);
    expect(gtag.mock.calls[0][2]).toMatchObject({ value: undefined });
  });

  it("covers every event type on the menu", async () => {
    const { reportBookingConversion } = await load();
    const durations = CAL_SERVICES.flatMap((s) => s.durations);

    durations.forEach((duration, i) =>
      reportBookingConversion({
        uid: `bk_all_${i}`,
        eventTypeId: duration.eventTypeId,
      })
    );

    expect(gtag).toHaveBeenCalledTimes(durations.length);
    const values = gtag.mock.calls.map((c) => c[2].value);
    expect(values).toEqual(durations.map((d) => d.price / 100));
  });
});

describe("event type ids", () => {
  it("are unique across the menu", () => {
    const ids = CAL_SERVICES.flatMap((s) =>
      s.durations.map((d) => d.eventTypeId)
    );
    expect(new Set(ids).size).toBe(ids.length);
  });
});
