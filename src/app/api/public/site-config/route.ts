import { BUSINESS } from "@/lib/config/business-rules";
import { CAL_SERVICES, CAL_TEAM_SLUG, calLink } from "@/lib/config/cal-events";

export async function GET() {
  return Response.json({
    services: CAL_SERVICES.map((service) => ({
      id: service.id,
      name: service.name,
      description: service.description,
      options: service.durations.map((duration) => ({
        minutes: duration.minutes,
        price: duration.price,
        calLink: calLink(duration.slug),
      })),
    })),
    hours: BUSINESS.hours,
    booking: {
      provider: "cal.com",
      team: CAL_TEAM_SLUG,
      maxAdvanceDays: BUSINESS.booking.maxAdvanceDays,
      minNoticeMinutes: BUSINESS.booking.minNoticeMinutes,
      // Cal.com holds the card at booking rather than charging it.
      cardHoldRequired: true,
    },
    fees: BUSINESS.fees,
  });
}
