import { BUSINESS } from "@/lib/config/business-rules";

/**
 * A prefilled "join the waitlist" mailto link for anything not yet bookable
 * in Cal.com, so an interested visitor doesn't have to compose the email
 * themselves. Shared by the Events page and the Acupuncture cards on
 * Services — anywhere a card collects interest instead of opening a
 * live calendar.
 */
export function waitlistHref(item: { name: string }): string {
  const subject = `Interest: ${item.name} at ${BUSINESS.name}`;
  const body = `I'd like to hear when ${item.name} is available to book.\n\nName:\nPhone:\nPreferred days/times:\n`;
  return `mailto:${BUSINESS.contact.email}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;
}
