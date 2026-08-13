"use client";

import { useEffect, useState } from "react";
import Cal, { getCalApi } from "@calcom/embed-react";
import { calLinkFor, type AddOnId, type Service } from "@/lib/config/business-rules";

interface Props {
  service: Service;
  addOnIds: AddOnId[];
}

/** Namespace keeps this embed's config isolated from any other Cal instance. */
const NAMESPACE = "obsidian-booking";

/**
 * Pull the Cal.com booking uid out of a `bookingSuccessful` event.
 * The payload shape has moved between embed versions, so probe the known spots
 * rather than trusting one path.
 */
function extractBookingUid(detail: unknown): string | null {
  if (typeof detail !== "object" || detail === null) return null;
  const data = (detail as { data?: unknown }).data;
  if (typeof data !== "object" || data === null) return null;

  const candidates = [
    (data as { uid?: unknown }).uid,
    (data as { booking?: { uid?: unknown } }).booking?.uid,
    (data as { bookingUid?: unknown }).bookingUid,
  ];

  for (const c of candidates) {
    if (typeof c === "string" && c.length > 0) return c;
  }
  return null;
}

export default function CalScheduler({ service, addOnIds }: Props) {
  const [failed, setFailed] = useState(false);
  const calLink = calLinkFor(service);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const cal = await getCalApi({ namespace: NAMESPACE });
        if (cancelled) return;

        cal("ui", {
          theme: "dark",
          cssVarsPerTheme: {
            light: { "cal-brand": "#c9a84c" },
            dark: { "cal-brand": "#c9a84c" },
          },
          hideEventTypeDetails: false,
          layout: "month_view",
        });

        cal("on", {
          action: "bookingSuccessful",
          callback: (e: unknown) => {
            const uid = extractBookingUid(
              (e as { detail?: unknown } | undefined)?.detail
            );
            // Hand off to the card-on-file step. Without a uid we can't resolve
            // the booking, so let the pay-link email carry it instead.
            window.location.href = uid
              ? `/pay/resolve?uid=${encodeURIComponent(uid)}`
              : "/pay/resolve";
          },
        });
      } catch (err) {
        console.error("Cal.com embed failed to initialise:", err);
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (failed) {
    return (
      <div className="border border-charcoal-light bg-charcoal p-6 text-center text-sm text-muted">
        <p className="mb-4">
          Our calendar didn&apos;t load. You can book directly instead:
        </p>
        <a
          href={`https://cal.com/${calLink}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block border border-gold px-6 py-2 text-sm text-gold transition-colors hover:bg-gold hover:text-background"
        >
          Open Calendar
        </a>
      </div>
    );
  }

  return (
    <div className="overflow-hidden border border-charcoal-light bg-charcoal">
      <Cal
        namespace={NAMESPACE}
        calLink={calLink}
        style={{ width: "100%", height: "100%", overflow: "scroll" }}
        config={{
          layout: "month_view",
          theme: "dark",
          // Carried through Cal.com onto the booking so the pay page and the
          // final invoice know which add-ons were chosen.
          "metadata[addOns]": addOnIds.join(","),
          "metadata[serviceId]": service.id,
        }}
      />
    </div>
  );
}
