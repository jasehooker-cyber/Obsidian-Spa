"use client";

import type { Service } from "@/lib/config/business-rules";
import { formatPrice } from "@/lib/config/business-rules";

interface Props {
  services: Service[];
  selected: Service | null;
  onSelect: (service: Service) => void;
}

export default function ServiceSelector({ services, selected, onSelect }: Props) {
  return (
    <div>
      <h2 className="mb-6 text-sm font-semibold tracking-[0.2em] text-gold">
        STEP 1 — CHOOSE YOUR SERVICE
      </h2>
      <div className="flex flex-col gap-3">
        {services.map((service) => {
          const isSelected = selected?.id === service.id;
          const isRequest = service.bookingMode === "request";

          return (
            <button
              key={service.id}
              type="button"
              onClick={() => onSelect(service)}
              className={`flex items-center justify-between border p-5 text-left transition-colors ${
                isSelected
                  ? "border-gold bg-gold/10"
                  : "border-charcoal-light bg-charcoal hover:border-gold/30"
              }`}
            >
              <div>
                <p className="font-semibold">{service.name}</p>
                <p className="mt-1 text-xs text-muted">
                  {service.duration} min
                  {isRequest && " · Contact to book"}
                </p>
              </div>
              <span className="text-gold">{formatPrice(service.price)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
