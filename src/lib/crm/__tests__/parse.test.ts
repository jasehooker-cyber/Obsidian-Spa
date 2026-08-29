import { describe, it, expect } from "vitest";
import {
  extractRecordedPrice,
  listPriceFor,
  matchService,
  normalizePhone,
  parseCalDescription,
  parseManualSummary,
  parseVisit,
} from "@/lib/crm/parse";
import { CAL_SERVICES } from "@/lib/config/cal-events";
import type { GoogleCalendarEvent } from "@/lib/google/server";

/**
 * Fixtures are copied verbatim from the OBSIDIAN and jase@obsidianspas.com
 * calendars, so these tests fail if Cal.com changes the shape of what it
 * writes.
 */

const CALENDAR_ID = "jase@obsidianspas.com";
const NOW = new Date("2026-08-29T12:00:00-04:00");
const INTERNAL = new Set([
  "jase@obsidianspas.com",
  "jasehooker@gmail.com",
  "admin@obsidianspas.com",
  "joaquintarsetti@gmail.com",
]);

function parse(event: GoogleCalendarEvent, calendarId = CALENDAR_ID) {
  return parseVisit(event, {
    calendarId,
    internalEmails: INTERNAL,
    now: NOW,
  });
}

// --- real Cal.com booking, no price written on it ---------------------------
const forgeBooking: GoogleCalendarEvent = {
  id: "d4fhj1c6hloirskhqaaehs9m38",
  status: "confirmed",
  summary: "The Forge between Jase Hooker and Matthew Kudry",
  htmlLink: "https://www.google.com/calendar/event?eid=ZDRmaGox",
  location: "850 7th Avenue, New York, NY, USA",
  description: `What:
The Forge between Jase Hooker and Matthew Kudry

Invitee timezone:
America/New_York

Who:
Jase Hooker - Organizer
jase@obsidianspas.com
Matthew Kudry
matthew.kudry@gmail.com

Where:
850 7th Avenue, New York, NY, USA

Reason for the visit:
Tight upper back

Phone number:
+19146181270


Need to reschedule or cancel? https://cal.com/booking/vDUCciwtk2g2fJSkssoixs?changes=true`,
  start: { dateTime: "2026-08-25T17:20:00-04:00" },
  end: { dateTime: "2026-08-25T18:20:00-04:00" },
  organizer: { email: "jasehooker@gmail.com" },
  creator: { email: "jasehooker@gmail.com" },
  attendees: [
    { email: "matthew.kudry@gmail.com", responseStatus: "accepted" },
    { email: "jasehooker@gmail.com", organizer: true, responseStatus: "accepted" },
    { email: "jase@obsidianspas.com", self: true, responseStatus: "accepted" },
  ],
};

// --- real booking with the amount collected typed onto the summary ----------
const paidBooking: GoogleCalendarEvent = {
  id: "uae4cvkuh0rcgcn51at7unmuf8",
  status: "confirmed",
  summary:
    "Obsidian Signature Massage between Jase Hooker and Patrick bewley paid 75",
  description: `What:
Obsidian Signature Massage between Jase Hooker and Patrick bewley

Invitee timezone:
America/New_York

Who:
Jase Hooker - Organizer
jase@obsidianspas.com
Patrick bewley
patrick_bewley@me.com

Where:
850 7th ave unit 1105

Reason for the visit:
Start of vacation

Phone number:
+18582429750


Need to reschedule or cancel? https://cal.com/booking/1zWBtYTw5bLfaq2BRVwNE4?changes=true`,
  start: { dateTime: "2026-08-24T13:30:00-04:00" },
  end: { dateTime: "2026-08-24T15:00:00-04:00" },
  organizer: { email: "jasehooker@gmail.com" },
  creator: { email: "jasehooker@gmail.com" },
  attendees: [
    { email: "patrick_bewley@me.com", responseStatus: "accepted" },
    { email: "jasehooker@gmail.com", organizer: true, responseStatus: "needsAction" },
    { email: "jase@obsidianspas.com", self: true, responseStatus: "accepted" },
  ],
};

// --- real hand-typed session: a name, and nothing else ----------------------
const manualSession: GoogleCalendarEvent = {
  id: "n520bosqlmdmjufnevgagfribg",
  status: "confirmed",
  summary: "Michael Moore - 4 hand Massage",
  location: "850 7th Ave",
  start: { dateTime: "2026-08-27T21:00:00-04:00" },
  end: { dateTime: "2026-08-27T22:00:00-04:00" },
  organizer: { email: "admin@obsidianspas.com", self: true },
  creator: { email: "admin@obsidianspas.com", self: true },
  attendees: [
    { email: "admin@obsidianspas.com", organizer: true, self: true, responseStatus: "accepted" },
    { email: "jasehooker@gmail.com", responseStatus: "needsAction" },
    { email: "joaquintarsetti@gmail.com", responseStatus: "accepted" },
  ],
};

// --- real third-party Cal.com invite: same description format, not a massage -
const notionCall: GoogleCalendarEvent = {
  id: "_d4s6eh368db4ctrkahp5kea8apml0qih8d8k0gr1dgn66rrd",
  status: "confirmed",
  summary: "Jase Hooker & Anthony Today: 1:1 Notion Expert Session ",
  description: `What:
Jase Hooker & Anthony Today: 1:1 Notion Expert Session

Invitee timezone:
America/New_York

Who:
Anthony Today - Organizer
consulting@anthonytoday.com
Jase Hooker
admin@obsidianspas.com

Where:
https://us05web.zoom.us/j/82425824672

Phone number (Text notifications):
undefined


Need to reschedule or cancel? https://notionpartners.cal.com/booking/i8gDfCVFwtTrZ9HVmPjQCQ?changes=true`,
  start: { dateTime: "2026-08-22T00:30:00-04:00" },
  end: { dateTime: "2026-08-22T01:00:00-04:00" },
  organizer: { email: "admin@anthonytoday.com" },
  creator: { email: "admin@anthonytoday.com" },
  attendees: [
    { email: "admin@anthonytoday.com", organizer: true, responseStatus: "accepted" },
    { email: "admin@obsidianspas.com", self: true, responseStatus: "accepted" },
  ],
};

describe("parseVisit — Cal.com bookings", () => {
  it("reads the client, the service, and the contact details", () => {
    const visit = parse(forgeBooking)!;

    expect(visit).not.toBeNull();
    expect(visit.client).toEqual({
      name: "Matthew Kudry",
      email: "matthew.kudry@gmail.com",
      phone: "+19146181270",
    });
    expect(visit.serviceId).toBe("the-forge");
    expect(visit.serviceName).toBe("The Forge");
    expect(visit.durationMinutes).toBe(60);
    expect(visit.source).toBe("cal.com");
    expect(visit.notes).toBe("Tight upper back");
    expect(visit.googleEventId).toBe(forgeBooking.id);
  });

  it("prices an unannotated booking from the menu", () => {
    const visit = parse(forgeBooking)!;
    expect(visit.priceCents).toBe(165_00);
    expect(visit.priceSource).toBe("list");
  });

  it("never files the therapist as the client", () => {
    const visit = parse(forgeBooking)!;
    expect(visit.client.email).not.toBe("jasehooker@gmail.com");
    expect(visit.client.email).not.toBe("jase@obsidianspas.com");
  });

  it("prefers the amount actually collected over the menu price", () => {
    const visit = parse(paidBooking)!;
    // 90-minute Signature lists at $240; $75 is what was taken.
    expect(visit.priceCents).toBe(75_00);
    expect(visit.priceSource).toBe("recorded");
    expect(visit.durationMinutes).toBe(90);
  });

  it("keeps 'paid 75' out of the client's name", () => {
    const visit = parse(paidBooking)!;
    expect(visit.client.name).toBe("Patrick bewley");
    expect(visit.client.email).toBe("patrick_bewley@me.com");
  });

  it("handles a session length in the event name", () => {
    const visit = parse({
      ...forgeBooking,
      summary: "The Forge (90 min) between Jase Hooker and Joshua Sheppard ",
      description: `What:
The Forge (90 min) between Jase Hooker and Joshua Sheppard

Who:
Jase Hooker - Organizer
jase@obsidianspas.com
Joshua Sheppard
jpsheppa@gmail.com

Phone number:
+13124049065
`,
      start: { dateTime: "2026-08-20T14:30:00-04:00" },
      end: { dateTime: "2026-08-20T16:00:00-04:00" },
      attendees: [
        { email: "jpsheppa@gmail.com", responseStatus: "accepted" },
        { email: "jase@obsidianspas.com", organizer: true, self: true },
      ],
    })!;

    expect(visit.client.name).toBe("Joshua Sheppard");
    expect(visit.serviceId).toBe("the-forge");
    expect(visit.durationMinutes).toBe(90);
    expect(visit.priceCents).toBe(225_00);
  });
});

describe("parseVisit — hand-typed sessions", () => {
  it("records the client from the event name alone", () => {
    const visit = parse(manualSession, "admin@obsidianspas.com")!;

    expect(visit).not.toBeNull();
    expect(visit.client.name).toBe("Michael Moore");
    expect(visit.source).toBe("manual");
    expect(visit.durationMinutes).toBe(60);
  });

  it("does not attach a staff address to a walk-in", () => {
    const visit = parse(manualSession, "admin@obsidianspas.com")!;
    expect(visit.client.email).toBeNull();
  });

  it("leaves an off-menu service unpriced rather than guessing", () => {
    const visit = parse(manualSession, "admin@obsidianspas.com")!;
    expect(visit.serviceId).toBeNull();
    expect(visit.priceCents).toBeNull();
    expect(visit.priceSource).toBe("unknown");
  });

  it("handles a bare 'Zach massage'", () => {
    const visit = parse({
      id: "8c0au39jfkclil6rl54enf9osk",
      status: "confirmed",
      summary: "Zach massage",
      start: { dateTime: "2026-08-07T17:00:00-04:00" },
      end: { dateTime: "2026-08-07T18:00:00-04:00" },
      organizer: { email: "admin@obsidianspas.com", self: true },
      creator: { email: "admin@obsidianspas.com", self: true },
    })!;

    expect(visit).not.toBeNull();
    expect(visit.client.name).toBe("Zach");
  });

  it("takes a price written on a hand-typed event", () => {
    const visit = parse({
      ...manualSession,
      summary: "Michael Moore - 4 hand Massage paid 260",
    })!;
    expect(visit.priceCents).toBe(260_00);
    expect(visit.priceSource).toBe("recorded");
    expect(visit.client.name).toBe("Michael Moore");
  });
});

describe("parseVisit — what is not a visit", () => {
  it("ignores a third-party Cal.com invite in the same format", () => {
    expect(parse(notionCall, "admin@obsidianspas.com")).toBeNull();
  });

  it.each([
    "Get trash can",
    "Cowork Flor - Joa",
    "Obsidian - Yelp",
    "Yelp verification",
    "Spectrum comes to set up WiFi",
    "Tota ads - Flor",
    "Get cupping kit",
  ])("ignores the business event %j", (summary) => {
    expect(
      parse({
        id: `evt-${summary}`,
        status: "confirmed",
        summary,
        start: { dateTime: "2026-08-20T13:00:00-04:00" },
        end: { dateTime: "2026-08-20T14:00:00-04:00" },
        organizer: { email: "admin@obsidianspas.com", self: true },
      })
    ).toBeNull();
  });

  it.each([
    "Order massage oil",
    "Massage table delivery",
    "Restock massage linens",
  ])("ignores the errand %j that mentions massage", (summary) => {
    expect(
      parse({
        id: `errand-${summary}`,
        status: "confirmed",
        summary,
        start: { dateTime: "2026-08-20T13:00:00-04:00" },
        end: { dateTime: "2026-08-20T14:00:00-04:00" },
        organizer: { email: "admin@obsidianspas.com", self: true },
      })
    ).toBeNull();
  });

  it("ignores a session that has not happened yet", () => {
    expect(
      parse({
        ...forgeBooking,
        start: { dateTime: "2026-09-27T14:30:00-04:00" },
        end: { dateTime: "2026-09-27T16:00:00-04:00" },
      })
    ).toBeNull();
  });

  it("ignores a cancelled event", () => {
    expect(parse({ ...forgeBooking, status: "cancelled" })).toBeNull();
  });

  it("ignores an all-day entry", () => {
    expect(
      parse({
        ...forgeBooking,
        start: { date: "2026-08-25" },
        end: { date: "2026-08-26" },
      })
    ).toBeNull();
  });

  it("ignores a session we declined", () => {
    expect(
      parse({
        ...forgeBooking,
        attendees: [
          { email: "matthew.kudry@gmail.com", responseStatus: "accepted" },
          { email: "jase@obsidianspas.com", self: true, responseStatus: "declined" },
        ],
      })
    ).toBeNull();
  });
});

describe("parseCalDescription", () => {
  it("splits the What line into service, organizer, and client", () => {
    const parsed = parseCalDescription(forgeBooking.description);
    expect(parsed.serviceName).toBe("The Forge");
    expect(parsed.organizerName).toBe("Jase Hooker");
    expect(parsed.clientName).toBe("Matthew Kudry");
    expect(parsed.isCalBooking).toBe(true);
  });

  it("pairs each name in the Who block with its email", () => {
    const parsed = parseCalDescription(forgeBooking.description);
    expect(parsed.who).toEqual([
      { name: "Jase Hooker", email: "jase@obsidianspas.com", isOrganizer: true },
      { name: "Matthew Kudry", email: "matthew.kudry@gmail.com", isOrganizer: false },
    ]);
  });

  it("treats Cal's literal 'undefined' phone as missing", () => {
    expect(parseCalDescription(notionCall.description).phone).toBeNull();
  });

  it("keeps a client whose name contains 'and' intact", () => {
    const parsed = parseCalDescription(`What:
Blackout between Jase Hooker and Bill and Ted
`);
    expect(parsed.organizerName).toBe("Jase Hooker");
    expect(parsed.clientName).toBe("Bill and Ted");
  });

  it("returns empty for a plain event", () => {
    expect(parseCalDescription(undefined).isCalBooking).toBe(false);
    expect(parseCalDescription("Bring the good oil").clientName).toBeNull();
  });
});

describe("parseManualSummary", () => {
  it.each([
    ["Michael Moore - 4 hand Massage", "Michael Moore"],
    ["Zach massage", "Zach"],
    ["Massage - Dan Whitfield", "Dan Whitfield"],
    ["Chris R — couples massage", "Chris R"],
  ])("reads the name out of %j", (summary, expected) => {
    expect(parseManualSummary(summary).clientName).toBe(expected);
  });

  it("leaves a hyphenated name alone", () => {
    expect(parseManualSummary("Jean-Luc Picard massage").clientName).toBe(
      "Jean-Luc Picard"
    );
  });
});

describe("service matching and pricing", () => {
  it("matches every service on the menu by name", () => {
    for (const service of CAL_SERVICES) {
      expect(matchService(service.name)?.id).toBe(service.id);
    }
  });

  it("does not match a business event that merely shares a word", () => {
    expect(matchService("Obsidian - Yelp")).toBeNull();
    expect(matchService("Split the invoice")).toBeNull();
  });

  it("prices each length of a service", () => {
    const forge = CAL_SERVICES.find((s) => s.id === "the-forge")!;
    expect(listPriceFor(forge, 60)).toBe(165_00);
    expect(listPriceFor(forge, 90)).toBe(225_00);
  });

  it("tolerates a calendar block running slightly long", () => {
    const forge = CAL_SERVICES.find((s) => s.id === "the-forge")!;
    expect(listPriceFor(forge, 65)).toBe(165_00);
  });

  it("refuses to price a length nowhere near the menu", () => {
    const forge = CAL_SERVICES.find((s) => s.id === "the-forge")!;
    expect(listPriceFor(forge, 200)).toBeNull();
  });

  it("prices the one-length service at any duration", () => {
    const split = CAL_SERVICES.find((s) => s.id === "the-split")!;
    expect(listPriceFor(split, 30)).toBe(95_00);
    expect(listPriceFor(split, 120)).toBe(95_00);
  });
});

describe("extractRecordedPrice", () => {
  it.each([
    ["... paid 75", 75_00],
    ["... paid $120", 120_00],
    ["... PAID $1,200.50", 120050],
    ["Zach massage $95", 95_00],
  ])("reads %j", (summary, expected) => {
    expect(extractRecordedPrice(summary, undefined)).toBe(expected);
  });

  it("ignores a dollar amount buried in a description", () => {
    expect(
      extractRecordedPrice("The Forge between us and him", "Gift card worth $300")
    ).toBeNull();
  });

  it("returns null when nothing was written down", () => {
    expect(extractRecordedPrice(forgeBooking.summary, forgeBooking.description)).toBeNull();
  });
});

describe("normalizePhone", () => {
  it.each([
    ["+19146181270", "+19146181270"],
    ["9146181270", "+19146181270"],
    ["(914) 618-1270", "+19146181270"],
    ["1-914-618-1270", "+19146181270"],
    ["+44 20 7946 0958", "+442079460958"],
  ])("normalizes %j", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it.each(["undefined", "", "  ", "n/a", "123"])(
    "drops the unusable %j",
    (input) => {
      expect(normalizePhone(input)).toBeNull();
    }
  );
});
