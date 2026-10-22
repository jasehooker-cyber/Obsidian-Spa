import { BUSINESS } from "@/lib/config/business-rules";

/**
 * A prefilled "join the waitlist" mailto link for anything not yet bookable
 * in Cal.com, so an interested visitor doesn't have to compose the email
 * themselves. Shared by the Events page and the Acupuncture cards on
 * Services — anywhere a card collects interest instead of opening a
 * live calendar.
 */
/** A prefilled email reserving a place at one dated class on the calendar. */
export function reserveHref(title: string, when: string): string {
  const subject = `Reserve: ${title} — ${when}`;
  const body = `I'd like to reserve a place at ${title} on ${when}.\n\nName:\nPhone:\nNumber of people:\n`;
  return `mailto:${BUSINESS.contact.email}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;
}

export function waitlistHref(item: { name: string }): string {
  const subject = `Interest: ${item.name} at ${BUSINESS.name}`;
  const body = `I'd like to hear when ${item.name} is available to book.\n\nName:\nPhone:\nPreferred days/times:\n`;
  return `mailto:${BUSINESS.contact.email}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;
}
