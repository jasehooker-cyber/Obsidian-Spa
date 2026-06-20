import { SERVICES, ADD_ONS, BUSINESS } from "@/lib/config/business-rules";

export async function GET() {
  return Response.json({
    services: SERVICES,
    addOns: ADD_ONS,
    hours: BUSINESS.hours,
    booking: {
      maxAdvanceDays: BUSINESS.booking.maxAdvanceDays,
      minNoticeMinutes: BUSINESS.booking.minNoticeMinutes,
      cardOnFileRequired: BUSINESS.booking.cardOnFileRequired,
    },
    fees: BUSINESS.fees,
  });
}
