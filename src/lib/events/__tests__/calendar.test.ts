import { describe, expect, it } from "vitest";
import {
  dateBadge,
  groupByMonth,
  longWhen,
  parseIcsFeed,
  plainText,
  publicFeedUrl,
  timeLabel,
  type PublicEvent,
} from "@/lib/events/calendar";

/** Wraps VEVENTs in the calendar envelope and time zone Google's feed uses. */
function feed(...events: string[]): string {
  return [
    "BEGIN:VCALENDAR",
    "PRODID:-//Google Inc//Google Calendar 70.9054//EN",
    "VERSION:2.0",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Obsidian Events",
    "X-WR-TIMEZONE:America/New_York",
    "BEGIN:VTIMEZONE",
    "TZID:America/New_York",
    "BEGIN:DAYLIGHT",
    "TZOFFSETFROM:-0500",
    "TZOFFSETTO:-0400",
    "TZNAME:EDT",
    "DTSTART:19700308T020000",
    "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU",
    "END:DAYLIGHT",
    "BEGIN:STANDARD",
    "TZOFFSETFROM:-0400",
    "TZOFFSETTO:-0500",
    "TZNAME:EST",
    "DTSTART:19701101T020000",
    "RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU",
    "END:STANDARD",
    "END:VTIMEZONE",
    ...events,
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

const vevent = (...lines: string[]) =>
  ["BEGIN:VEVENT", "DTSTAMP:20261022T212653Z", ...lines, "END:VEVENT"].join("\r\n");

const FROM = new Date("2026-10-22T00:00:00Z");
const TO = new Date("2027-02-19T00:00:00Z");

describe("parseIcsFeed", () => {
  it("reads the real 'tester' event as Sat Oct 24, 5–6 PM New York time", () => {
    const [event] = parseIcsFeed(
      feed(
        vevent(
          "DTSTART:20261024T210000Z",
          "DTEND:20261024T220000Z",
          "UID:1j6gto7opg4ghf200sb6f6j9be@google.com",
          "DESCRIPTION:",
          "LOCATION:",
          "STATUS:CONFIRMED",
          "SUMMARY:tester"
        )
      ),
      FROM,
      TO
    );
    expect(event.title).toBe("tester");
    expect(dateBadge(event)).toEqual({ weekday: "SAT", day: "24", month: "OCT" });
    expect(timeLabel(event)).toBe("5:00 – 6:00 PM");
    expect(event.description).toBe("");
    expect(event.location).toBe("");
  });

  it("expands a weekly class across the clock change, honouring skipped, moved and cancelled weeks", () => {
    const events = parseIcsFeed(
      feed(
        vevent(
          "DTSTART;TZID=America/New_York:20261020T190000",
          "DTEND;TZID=America/New_York:20261020T200000",
          "RRULE:FREQ=WEEKLY;COUNT=5",
          "EXDATE;TZID=America/New_York:20261027T190000",
          "UID:yoga@google.com",
          "LOCATION:The Studio",
          "SUMMARY:Slow Strength Yoga"
        ),
        // Nov 3 moved to 8 PM.
        vevent(
          "RECURRENCE-ID;TZID=America/New_York:20261103T190000",
          "DTSTART;TZID=America/New_York:20261103T200000",
          "DTEND;TZID=America/New_York:20261103T210000",
          "UID:yoga@google.com",
          "SUMMARY:Slow Strength Yoga"
        ),
        // Nov 10 cancelled.
        vevent(
          "RECURRENCE-ID;TZID=America/New_York:20261110T190000",
          "DTSTART;TZID=America/New_York:20261110T190000",
          "DTEND;TZID=America/New_York:20261110T200000",
          "STATUS:CANCELLED",
          "UID:yoga@google.com",
          "SUMMARY:Slow Strength Yoga"
        )
      ),
      FROM,
      TO
    );

    expect(
      events.map((e) => [dateBadge(e).month, dateBadge(e).day, timeLabel(e)])
    ).toEqual([
      // Oct 20 is before the window; Oct 27 skipped; Nov 10 cancelled.
      ["NOV", "3", "8:00 – 9:00 PM"],
      // After clocks go back on Nov 1 — still 7 PM in New York.
      ["NOV", "17", "7:00 – 8:00 PM"],
    ]);
  });

  it("keeps all-day events as calendar days", () => {
    const [event] = parseIcsFeed(
      feed(
        vevent(
          "DTSTART;VALUE=DATE:20261114",
          "DTEND;VALUE=DATE:20261115",
          "UID:open@google.com",
          "SUMMARY:Open Studio Day"
        )
      ),
      FROM,
      TO
    );
    expect(event.allDay).toBe(true);
    expect(timeLabel(event)).toBe("All day");
    expect(dateBadge(event)).toEqual({ weekday: "SAT", day: "14", month: "NOV" });
  });

  it("turns description markup and escapes into plain text", () => {
    const [event] = parseIcsFeed(
      feed(
        vevent(
          "DTSTART:20261031T150000Z",
          "DTEND:20261031T160000Z",
          "UID:acu@google.com",
          "SUMMARY:Group Acupuncture",
          "DESCRIPTION:Recline and let an hour pass.<br>All welcome\\, no experience n",
          " eeded &amp; mats provided."
        )
      ),
      FROM,
      TO
    );
    expect(event.description).toBe(
      "Recline and let an hour pass.\nAll welcome, no experience needed & mats provided."
    );
  });

  it("drops past, too-far-ahead, cancelled and untitled events", () => {
    const events = parseIcsFeed(
      feed(
        vevent("DTSTART:20261001T230000Z", "DTEND:20261002T000000Z", "UID:past@g", "SUMMARY:Past"),
        vevent("DTSTART:20270401T230000Z", "DTEND:20270402T000000Z", "UID:far@g", "SUMMARY:Far"),
        vevent("DTSTART:20261028T230000Z", "DTEND:20261029T000000Z", "UID:c@g", "STATUS:CANCELLED", "SUMMARY:Called off"),
        vevent("DTSTART:20261029T230000Z", "DTEND:20261030T000000Z", "UID:u@g", "SUMMARY:  "),
        vevent("DTSTART:20261030T230000Z", "DTEND:20261031T000000Z", "UID:ok@g", "SUMMARY:Kept")
      ),
      FROM,
      TO
    );
    expect(events.map((e) => e.title)).toEqual(["Kept"]);
  });
});

describe("publicFeedUrl", () => {
  it("builds Google's public iCal address for the calendar", () => {
    expect(publicFeedUrl("c_abc@group.calendar.google.com")).toBe(
      "https://calendar.google.com/calendar/ical/c_abc%40group.calendar.google.com/public/basic.ics"
    );
  });
});

describe("plainText", () => {
  it("turns Google's editor HTML into readable text", () => {
    expect(
      plainText('<p>Line one</p><p>Line <b>two</b></p><ul><li>Mat</li><li>Water</li></ul><a href="x">link</a> &#39;ok&#39;')
    ).toBe("Line one\nLine two\n• Mat\n• Water\nlink 'ok'");
  });
});

const timed = (id: string, start: string, end: string): PublicEvent => ({
  id, title: `Class ${id}`, description: "", location: "", start, end, allDay: false,
});
const allDay = (id: string, start: string, end: string): PublicEvent => ({
  id, title: `Day ${id}`, description: "", location: "", start, end, allDay: true,
});

describe("display in New York time", () => {
  const evening = timed("e", "2026-10-24T23:30:00.000Z", "2026-10-25T01:00:00.000Z");

  it("badges the New York date, not the UTC date", () => {
    expect(dateBadge(evening)).toEqual({ weekday: "SAT", day: "24", month: "OCT" });
  });

  it("shows the period once when both ends share it", () => {
    expect(timeLabel(evening)).toBe("7:30 – 9:00 PM");
    expect(timeLabel(timed("m", "2026-10-24T15:30:00Z", "2026-10-24T17:00:00Z"))).toBe(
      "11:30 AM – 1:00 PM"
    );
  });

  it("labels multi-day all-day events", () => {
    expect(timeLabel(allDay("3", "2026-11-07", "2026-11-10"))).toBe("Nov 7 – 9");
    expect(timeLabel(allDay("4", "2026-10-30", "2026-11-02"))).toBe("Oct 30 – Nov 1");
  });

  it("gives the reservation email a full date and time", () => {
    expect(longWhen(evening)).toBe("Saturday, October 24, 2026, 7:30 – 9:00 PM");
  });

  it("groups by the New York month", () => {
    // 10 PM Oct 31 New York is already Nov 1 in UTC.
    const groups = groupByMonth([
      timed("oct-late", "2026-11-01T02:00:00Z", "2026-11-01T03:00:00Z"),
      allDay("nov", "2026-11-02", "2026-11-03"),
    ]);
    expect(groups.map((g) => [g.label, g.events.map((e) => e.id)])).toEqual([
      ["October 2026", ["oct-late"]],
      ["November 2026", ["nov"]],
    ]);
  });
});
