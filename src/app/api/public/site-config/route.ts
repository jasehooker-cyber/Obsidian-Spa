import { SERVICES, BUSINESS } from "@/lib/config/business-rules";

export async function GET() {
  return Response.json({
    services: SERVICES,
    hours: BUSINESS.hours,
    booking: {
      maxAdvanceDays: BUSINESS.booking.maxAdvanceDays,
      minNoticeMinutes: BUSINESS.booking.minNoticeMinutes,
      cardOnFileRequired: BUSINESS.booking.cardOnFileRequired,
    },
    fees: BUSINESS.fees,
  });
}
