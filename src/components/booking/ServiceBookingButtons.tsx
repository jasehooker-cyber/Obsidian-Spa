"use client";

import type { CalService } from "@/lib/config/cal-events";
import CalDurationButton from "@/components/booking/CalDurationButton";
import { useCalEmbed } from "@/components/booking/useCalEmbed";

/** One service's length-and-price buttons, for pages outside the main menu. */
export default function ServiceBookingButtons({
  service,
}: {
  service: CalService;
}) {
  useCalEmbed();

  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {service.durations.map((duration) => (
        <CalDurationButton
          key={duration.slug}
          serviceName={service.name}
          duration={duration}
        />
      ))}
    </div>
  );
}
