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

const FULL_ADDRESS = `${BUSINESS.address.street}, ${BUSINESS.address.city}, ${BUSINESS.address.state} ${BUSINESS.address.zip}`;
const MAPS_URL = `https://maps.google.com/?q=${encodeURIComponent(FULL_ADDRESS)}`;

interface BookingConfirmationParams {
  clientName: string;
  clientEmail: string;
  serviceName: string;
  servicePrice: number;
  therapistName: string;
  startsAt: string;
  endsAt: string;
  addOns: { name: string; price: number }[];
}

function formatDateParts(startsAt: string, endsAt: string) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const date = start.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: BUSINESS.timezone,
  });
  const timeOpts = {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: BUSINESS.timezone,
  } as const;
  const startTime = start.toLocaleTimeString("en-US", timeOpts);
  const endTime = end.toLocaleTimeString("en-US", timeOpts);
  const durationMin = Math.round((end.getTime() - start.getTime()) / 60_000);
  return { date, startTime, endTime, durationMin };
}

// iCalendar timestamp: 20260707T130000Z
function icsTimestamp(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function buildIcs(params: BookingConfirmationParams): string {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${BUSINESS.name}//Booking//EN`,
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${icsTimestamp(params.startsAt)}-${params.clientEmail}`,
    `DTSTAMP:${icsTimestamp(new Date().toISOString())}`,
    `DTSTART:${icsTimestamp(params.startsAt)}`,
    `DTEND:${icsTimestamp(params.endsAt)}`,
    `SUMMARY:${params.serviceName} — ${BUSINESS.name}`,
    `LOCATION:${FULL_ADDRESS}`,
    `DESCRIPTION:Your ${params.serviceName} with ${params.therapistName}. Questions? ${BUSINESS.contact.phone} or ${BUSINESS.contact.email}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export async function sendBookingConfirmation(params: BookingConfirmationParams) {
  const env = getEnv();
  if (!env.resend.configured) {
    console.log(`[EMAIL] Resend not configured. Would send confirmation to ${params.clientEmail}`);
    return;
  }

  const { date, startTime, endTime, durationMin } = formatDateParts(
    params.startsAt,
    params.endsAt
  );
  const firstName = params.clientName.split(" ")[0];
  const total =
    params.servicePrice + params.addOns.reduce((sum, a) => sum + a.price, 0);

  const addOnLines = params.addOns
    .map(
      (a) =>
        `<tr><td style="padding:6px 0;color:#a89c8a;">+ ${a.name}</td><td style="padding:6px 0;text-align:right;color:#a89c8a;">${formatPrice(a.price)}</td></tr>`
    )
    .join("");

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#131009;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">

    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="color:#bb9159;font-size:24px;letter-spacing:6px;margin:0;">OBSIDIAN</h1>
      <p style="color:#a89c8a;font-size:12px;letter-spacing:3px;margin:8px 0 0;">MEN'S SPA</p>
    </div>

    <div style="background:#1d1710;border:1px solid #2e261a;padding:32px;">
      <h2 style="color:#f2ede3;font-size:20px;margin:0 0 8px;">You're booked, ${firstName}.</h2>
      <p style="color:#a89c8a;font-size:14px;margin:0 0 24px;">Here are your appointment details. A calendar invite is attached.</p>

      <div style="border-top:1px solid #2e261a;padding-top:20px;margin-bottom:20px;">
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr>
            <td style="padding:8px 0;color:#a89c8a;">Date</td>
            <td style="padding:8px 0;text-align:right;color:#f2ede3;font-weight:600;">${date}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#a89c8a;">Time</td>
            <td style="padding:8px 0;text-align:right;color:#f2ede3;font-weight:600;">${startTime} – ${endTime} ET</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#a89c8a;">Duration</td>
            <td style="padding:8px 0;text-align:right;color:#f2ede3;font-weight:600;">${durationMin} minutes</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#a89c8a;">Therapist</td>
            <td style="padding:8px 0;text-align:right;color:#f2ede3;font-weight:600;">${params.therapistName}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#a89c8a;">Location</td>
            <td style="padding:8px 0;text-align:right;">
              <a href="${MAPS_URL}" style="color:#bb9159;font-weight:600;text-decoration:none;">${BUSINESS.address.street}<br>${BUSINESS.address.city}, ${BUSINESS.address.state} ${BUSINESS.address.zip}</a>
            </td>
          </tr>
        </table>
      </div>

      <div style="border-top:1px solid #2e261a;padding-top:20px;margin-bottom:20px;">
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr>
            <td style="padding:6px 0;color:#f2ede3;">${params.serviceName}</td>
            <td style="padding:6px 0;text-align:right;color:#f2ede3;">${formatPrice(params.servicePrice)}</td>
          </tr>
          ${addOnLines}
          <tr>
            <td style="padding:12px 0 6px;border-top:1px solid #2e261a;color:#f2ede3;font-weight:600;">Total</td>
            <td style="padding:12px 0 6px;border-top:1px solid #2e261a;text-align:right;color:#bb9159;font-weight:600;font-size:16px;">${formatPrice(total)}</td>
          </tr>
        </table>
      </div>

      <p style="color:#a89c8a;font-size:13px;line-height:1.6;margin:0;">
        Please arrive 10 minutes early so we can start on time.
      </p>
    </div>

    <div style="background:#17120c;border:1px solid #2e261a;border-top:none;padding:24px 32px;">
      <h3 style="color:#bb9159;font-size:13px;letter-spacing:2px;margin:0 0 12px;">PAYMENT</h3>
      <p style="color:#a89c8a;font-size:13px;line-height:1.6;margin:0 0 8px;">
        Nothing has been charged. Pay by <strong style="color:#f2ede3;">card or cash</strong> at the spa after your session.
      </p>
      <p style="color:#a89c8a;font-size:13px;line-height:1.6;margin:0 0 8px;">
        If your plans change, let us know at least ${BUSINESS.fees.lateCancelWindowMinutes} minutes ahead so we can offer the time to someone else.
      </p>
      <p style="color:#a89c8a;font-size:13px;line-height:1.6;margin:12px 0 0;">
        Need to cancel or reschedule? Reply to this email or call
        <a href="tel:${BUSINESS.contact.phone}" style="color:#bb9159;text-decoration:none;">${BUSINESS.contact.phone}</a>.
      </p>
    </div>

    <div style="text-align:center;margin-top:32px;">
      <p style="color:#a89c8a;font-size:12px;margin:0;">We look forward to seeing you.</p>
      <p style="color:#bb9159;font-size:11px;letter-spacing:3px;margin:16px 0 0;">${BUSINESS.name.toUpperCase()}</p>
      <p style="color:#666666;font-size:11px;line-height:1.6;margin:12px 0 0;">
        ${FULL_ADDRESS}<br>
        ${BUSINESS.contact.phone} · ${BUSINESS.contact.email}
      </p>
    </div>

  </div>
</body>
</html>`;

  const text = [
    `${BUSINESS.name} — Booking Confirmation`,
    ``,
    `You're booked, ${firstName}.`,
    ``,
    `Date:      ${date}`,
    `Time:      ${startTime} – ${endTime} ET`,
    `Duration:  ${durationMin} minutes`,
    `Therapist: ${params.therapistName}`,
    `Location:  ${FULL_ADDRESS}`,
    `Map:       ${MAPS_URL}`,
    ``,
    `${params.serviceName}: ${formatPrice(params.servicePrice)}`,
    ...params.addOns.map((a) => `+ ${a.name}: ${formatPrice(a.price)}`),
    `Total: ${formatPrice(total)}`,
    ``,
    `Please arrive 10 minutes early so we can start on time.`,
    ``,
    `PAYMENT`,
    `Nothing has been charged. Pay by card or cash at the spa after your session.`,
    `If your plans change, let us know at least ${BUSINESS.fees.lateCancelWindowMinutes} minutes ahead.`,
    ``,
    `Need to cancel or reschedule? Reply to this email or call ${BUSINESS.contact.phone}.`,
    ``,
    `${BUSINESS.name}`,
    FULL_ADDRESS,
    `${BUSINESS.contact.phone} · ${BUSINESS.contact.email}`,
  ].join("\n");

  await resend().emails.send({
    from: `${BUSINESS.name} <${env.resend.fromEmail}>`,
    to: params.clientEmail,
    replyTo: BUSINESS.contact.email,
    subject: `Confirmed: ${params.serviceName} — ${date}, ${startTime}`,
    html,
    text,
    attachments: [
      {
        filename: "appointment.ics",
        content: Buffer.from(buildIcs(params)).toString("base64"),
        contentType: "text/calendar",
      },
    ],
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

  const firstName = params.clientName.split(" ")[0];

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#131009;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">

    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="color:#bb9159;font-size:24px;letter-spacing:6px;margin:0;">OBSIDIAN</h1>
      <p style="color:#a89c8a;font-size:12px;letter-spacing:3px;margin:8px 0 0;">MEN'S SPA</p>
    </div>

    <div style="background:#1d1710;border:1px solid #2e261a;padding:32px;">
      <h2 style="color:#f2ede3;font-size:20px;margin:0 0 8px;">One quick thing, ${firstName}.</h2>
      <p style="color:#a89c8a;font-size:14px;line-height:1.6;margin:0 0 24px;">
        Please fill out a short intake form before your appointment. It helps your therapist
        prepare for your session — pressure preference, focus areas, anything to avoid.
      </p>

      <div style="text-align:center;margin:24px 0;">
        <a href="${params.intakeUrl}" style="display:inline-block;background:#bb9159;color:#131009;padding:14px 32px;font-size:14px;font-weight:600;letter-spacing:2px;text-decoration:none;">
          FILL OUT INTAKE FORM
        </a>
      </div>

      <p style="color:#a89c8a;font-size:12px;text-align:center;margin:0;">
        This link expires in 72 hours.
      </p>
    </div>

    <div style="text-align:center;margin-top:32px;">
      <p style="color:#bb9159;font-size:11px;letter-spacing:3px;margin:0;">${BUSINESS.name.toUpperCase()}</p>
      <p style="color:#666666;font-size:11px;line-height:1.6;margin:12px 0 0;">
        ${FULL_ADDRESS}<br>
        ${BUSINESS.contact.phone} · ${BUSINESS.contact.email}
      </p>
    </div>

  </div>
</body>
</html>`;

  const text = [
    `${BUSINESS.name} — Intake Form`,
    ``,
    `One quick thing, ${firstName}.`,
    ``,
    `Please fill out a short intake form before your appointment. It helps your`,
    `therapist prepare for your session — pressure preference, focus areas,`,
    `anything to avoid.`,
    ``,
    `Fill it out here (link expires in 72 hours):`,
    params.intakeUrl,
    ``,
    `${BUSINESS.name}`,
    FULL_ADDRESS,
    `${BUSINESS.contact.phone} · ${BUSINESS.contact.email}`,
  ].join("\n");

  await resend().emails.send({
    from: `${BUSINESS.name} <${env.resend.fromEmail}>`,
    to: params.clientEmail,
    replyTo: BUSINESS.contact.email,
    subject: `Intake form for your upcoming appointment — ${BUSINESS.name}`,
    html,
    text,
  });
}
