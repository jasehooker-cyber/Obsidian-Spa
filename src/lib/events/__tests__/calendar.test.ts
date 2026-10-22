import { describe, expect, it } from "vitest";
import type { GoogleCalendarEvent } from "@/lib/google/server";
import {
  dateBadge,
  groupByMonth,
  longWhen,
  plainText,
  sortEvents,
  timeLabel,
  toPublicEvent,
  type PublicEvent,
} from "@/lib/events/calendar";

const timed = (
  id: string,
  start: string,
  end: string,
  extra: Partial<GoogleCalendarEvent> = {}
): GoogleCalendarEvent => ({
  id,
  summary: `Class ${id}`,
  start: { dateTime: start },
  end: { dateTime: end },
  ...extra,
});

const pub = (e: GoogleCalendarEvent) => toPublicEvent(e) as PublicEvent;

describe("toPublicEvent", () => {
  it("keeps the title, location and a plain-text description", () => {
    const event = pub(
      timed("y", "2026-10-24T23:30:00Z", "2026-10-25T00:30:00Z", {
        summary: "  Yoga  ",
        location: " Studio ",
        description: "Bring a mat.<br>No experience needed &amp; all welcome.",
      })
    );
    expect(event).toMatchObject({
      title: "Yoga",
      location: "Studio",
      description: "Bring a mat.\nNo experience needed & all welcome.",
      allDay: false,
    });
  });

  it("drops cancelled and untitled entries", () => {
    expect(toPublicEvent(timed("c", "2026-10-24T23:30:00Z", "2026-10-25T00:30:00Z", { status: "cancelled" }))).toBeNull();
    expect(toPublicEvent(timed("u", "2026-10-24T23:30:00Z", "2026-10-25T00:30:00Z", { summary: "  " }))).toBeNull();
  });

  it("recognises all-day events", () => {
    const event = pub({ id: "a", summary: "Open Studio", start: { date: "2026-11-07" }, end: { date: "2026-11-08" } });
    expect(event.allDay).toBe(true);
    expect(event.start).toBe("2026-11-07");
  });
});

describe("plainText", () => {
  it("turns Google's editor HTML into readable text", () => {
    expect(
      plainText('<p>Line one</p><p>Line <b>two</b></p><ul><li>Mat</li><li>Water</li></ul><a href="x">link</a> &#39;ok&#39;')
    ).toBe("Line one\nLine two\n• Mat\n• Water\nlink 'ok'");
  });
});

describe("display in New York time", () => {
  // 23:30 UTC on Oct 24 is 7:30 PM EDT, still Saturday Oct 24 in New York.
  const evening = pub(timed("e", "2026-10-24T23:30:00Z", "2026-10-25T01:00:00Z"));

  it("badges the New York date, not the UTC date", () => {
    expect(dateBadge(evening)).toEqual({ weekday: "SAT", day: "24", month: "OCT" });
  });

  it("shows the time range once-per-period", () => {
    expect(timeLabel(evening)).toBe("7:30 – 9:00 PM");
    const midday = pub(timed("m", "2026-10-24T15:30:00Z", "2026-10-24T17:00:00Z"));
    expect(timeLabel(midday)).toBe("11:30 AM – 1:00 PM");
  });

  it("follows the switch from daylight to standard time", () => {
    // Nov 7 2026 is after DST ends: 7 PM EST is 00:00 UTC the next day.
    const winter = pub(timed("w", "2026-11-08T00:00:00Z", "2026-11-08T01:00:00Z"));
    expect(timeLabel(winter)).toBe("7:00 – 8:00 PM");
    expect(dateBadge(winter).day).toBe("7");
  });

  it("labels all-day and multi-day events", () => {
    const one = pub({ id: "1", summary: "x", start: { date: "2026-11-07" }, end: { date: "2026-11-08" } });
    const three = pub({ id: "3", summary: "x", start: { date: "2026-11-07" }, end: { date: "2026-11-10" } });
    const across = pub({ id: "4", summary: "x", start: { date: "2026-10-30" }, end: { date: "2026-11-02" } });
    expect(timeLabel(one)).toBe("All day");
    expect(timeLabel(three)).toBe("Nov 7 – 9");
    expect(timeLabel(across)).toBe("Oct 30 – Nov 1");
    expect(dateBadge(one)).toEqual({ weekday: "SAT", day: "7", month: "NOV" });
  });

  it("gives the reservation email a full date and time", () => {
    expect(longWhen(evening)).toBe("Saturday, October 24, 2026, 7:30 – 9:00 PM");
  });
});

describe("grouping and order", () => {
  it("groups by New York month and sorts all-day before timed on the same day", () => {
    const events = sortEvents([
      pub(timed("nov-eve", "2026-11-03T00:30:00Z", "2026-11-03T01:30:00Z")), // Nov 2, 7:30 PM EST
      pub({ id: "nov-all", summary: "x", start: { date: "2026-11-02" }, end: { date: "2026-11-03" } }),
      pub(timed("oct-late", "2026-11-01T02:00:00Z", "2026-11-01T03:00:00Z")), // Oct 31, 10 PM EDT
    ]);
    expect(events.map((e) => e.id)).toEqual(["oct-late", "nov-all", "nov-eve"]);

    const groups = groupByMonth(events);
    expect(groups.map((g) => [g.label, g.events.map((e) => e.id)])).toEqual([
      ["October 2026", ["oct-late"]],
      ["November 2026", ["nov-all", "nov-eve"]],
    ]);
  });
});
