import { Resend } from "resend";
import { getEnv } from "@/lib/config/env";
import { BUSINESS, formatPrice } from "@/lib/config/business-rules";

let resendInstance: Resend | null = null;

function resend(): Resend {
  if (!resendInstance) {
    resendInstance = new Resend(getEnv().resend.apiKey);
  }
  return resendInstance;
}

interface BookingConfirmationParams {
  clientName: string;
  clientEmail: string;
  serviceName: string;
  servicePrice: number;
  therapistName: string;
  startsAt: string;
  addOns: { name: string; price: number }[];
}

export async function sendBookingConfirmation(params: BookingConfirmationParams) {
  const env = getEnv();
  if (!env.resend.configured) {
    console.log(`[EMAIL] Resend not configured. Would send confirmation to ${params.clientEmail}`);
    return;
  }

  const date = new Date(params.startsAt);
  const formattedDate = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: BUSINESS.timezone,
  });
  const formattedTime = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: BUSINESS.timezone,
  });

  const addOnLines = params.addOns
    .map((a) => `<tr><td style="padding:6px 0;color:#a3a3a3;">+ ${a.name}</td><td style="padding:6px 0;text-align:right;color:#a3a3a3;">${formatPrice(a.price)}</td></tr>`)
    .join("");

  const total = params.servicePrice + params.addOns.reduce((sum, a) => sum + a.price, 0);

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">

    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="color:#c9a84c;font-size:24px;letter-spacing:6px;margin:0;">OBSIDIAN</h1>
      <p style="color:#a3a3a3;font-size:12px;letter-spacing:3px;margin:8px 0 0;">MEN'S SPA</p>
    </div>

    <div style="background:#1a1a1a;border:1px solid #2a2a2a;padding:32px;">
      <h2 style="color:#f5f5f5;font-size:20px;margin:0 0 8px;">You're booked, ${params.clientName.split(" ")[0]}.</h2>
      <p style="color:#a3a3a3;font-size:14px;margin:0 0 24px;">Here are your appointment details.</p>

      <div style="border-top:1px solid #2a2a2a;padding-top:20px;margin-bottom:20px;">
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr>
            <td style="padding:8px 0;color:#a3a3a3;">Date</td>
            <td style="padding:8px 0;text-align:right;color:#f5f5f5;font-weight:600;">${formattedDate}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#a3a3a3;">Time</td>
            <td style="padding:8px 0;text-align:right;color:#f5f5f5;font-weight:600;">${formattedTime}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#a3a3a3;">Therapist</td>
            <td style="padding:8px 0;text-align:right;color:#f5f5f5;font-weight:600;">${params.therapistName}</td>
          </tr>
        </table>
      </div>

      <div style="border-top:1px solid #2a2a2a;padding-top:20px;margin-bottom:20px;">
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr>
            <td style="padding:6px 0;color:#f5f5f5;">${params.serviceName}</td>
            <td style="padding:6px 0;text-align:right;color:#f5f5f5;">${formatPrice(params.servicePrice)}</td>
          </tr>
          ${addOnLines}
          <tr>
            <td style="padding:12px 0 6px;border-top:1px solid #2a2a2a;color:#f5f5f5;font-weight:600;">Total</td>
            <td style="padding:12px 0 6px;border-top:1px solid #2a2a2a;text-align:right;color:#c9a84c;font-weight:600;font-size:16px;">${formatPrice(total)}</td>
          </tr>
        </table>
      </div>
    </div>

    <div style="background:#141414;border:1px solid #2a2a2a;border-top:none;padding:24px 32px;">
      <h3 style="color:#c9a84c;font-size:13px;letter-spacing:2px;margin:0 0 12px;">CARD ON FILE POLICY</h3>
      <p style="color:#a3a3a3;font-size:13px;line-height:1.6;margin:0 0 8px;">
        Your card is <strong style="color:#f5f5f5;">not charged at booking</strong>. Payment is collected after your session.
      </p>
      <p style="color:#a3a3a3;font-size:13px;line-height:1.6;margin:0 0 8px;">
        Your card on file is only used in the following cases:
      </p>
      <ul style="color:#a3a3a3;font-size:13px;line-height:1.8;margin:0;padding-left:20px;">
        <li><strong style="color:#f5f5f5;">Late cancellation</strong> (within ${BUSINESS.fees.lateCancelWindow} hours): ${formatPrice(BUSINESS.fees.lateCancelFee)} fee</li>
        <li><strong style="color:#f5f5f5;">No-show</strong>: ${BUSINESS.fees.noShowPercent}% of your service price</li>
      </ul>
      <p style="color:#a3a3a3;font-size:13px;line-height:1.6;margin:12px 0 0;">
        To cancel or reschedule, contact us directly. We do not support online cancellation.
      </p>
    </div>

    <div style="text-align:center;margin-top:32px;">
      <p style="color:#a3a3a3;font-size:12px;margin:0;">We look forward to seeing you.</p>
      <p style="color:#c9a84c;font-size:11px;letter-spacing:3px;margin:16px 0 0;">${BUSINESS.name.toUpperCase()}</p>
    </div>

  </div>
</body>
</html>`;

  await resend().emails.send({
    from: `${BUSINESS.name} <${env.resend.fromEmail}>`,
    to: params.clientEmail,
    subject: `Your appointment is confirmed — ${formattedDate} at ${formattedTime}`,
    html,
  });
}

interface IntakeEmailParams {
  clientName: string;
  clientEmail: string;
  intakeUrl: string;
}

export async function sendIntakeEmail(params: IntakeEmailParams) {
  const env = getEnv();
  if (!env.resend.configured) {
    console.log(`[EMAIL] Resend not configured. Would send intake to ${params.clientEmail}`);
    return;
  }

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">

    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="color:#c9a84c;font-size:24px;letter-spacing:6px;margin:0;">OBSIDIAN</h1>
      <p style="color:#a3a3a3;font-size:12px;letter-spacing:3px;margin:8px 0 0;">MEN'S SPA</p>
    </div>

    <div style="background:#1a1a1a;border:1px solid #2a2a2a;padding:32px;">
      <h2 style="color:#f5f5f5;font-size:20px;margin:0 0 8px;">One quick thing, ${params.clientName.split(" ")[0]}.</h2>
      <p style="color:#a3a3a3;font-size:14px;line-height:1.6;margin:0 0 24px;">
        Please fill out a short intake form before your appointment. It helps your therapist
        prepare for your session — pressure preference, focus areas, anything to avoid.
      </p>

      <div style="text-align:center;margin:24px 0;">
        <a href="${params.intakeUrl}" style="display:inline-block;background:#c9a84c;color:#0a0a0a;padding:14px 32px;font-size:14px;font-weight:600;letter-spacing:2px;text-decoration:none;">
          FILL OUT INTAKE FORM
        </a>
      </div>

      <p style="color:#a3a3a3;font-size:12px;text-align:center;margin:0;">
        This link expires in 72 hours.
      </p>
    </div>

    <div style="text-align:center;margin-top:32px;">
      <p style="color:#c9a84c;font-size:11px;letter-spacing:3px;margin:0;">${BUSINESS.name.toUpperCase()}</p>
    </div>

  </div>
</body>
</html>`;

  await resend().emails.send({
    from: `${BUSINESS.name} <${env.resend.fromEmail}>`,
    to: params.clientEmail,
    subject: `Intake form for your upcoming appointment — ${BUSINESS.name}`,
    html,
  });
}
