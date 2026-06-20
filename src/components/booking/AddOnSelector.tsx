"use client";

import type { AddOn, AddOnId } from "@/lib/config/business-rules";
import { formatPrice } from "@/lib/config/business-rules";

interface Props {
  addOns: AddOn[];
  selected: AddOnId[];
  onToggle: (id: AddOnId) => void;
}

export default function AddOnSelector({ addOns, selected, onToggle }: Props) {
  return (
    <div>
      <h2 className="mb-6 text-sm font-semibold tracking-[0.2em] text-gold">
        STEP 2 — ADD ENHANCEMENTS
      </h2>
      <div className="grid grid-cols-3 gap-3">
        {addOns.map((addon) => {
          const isSelected = selected.includes(addon.id);
          return (
            <button
              key={addon.id}
              type="button"
              onClick={() => onToggle(addon.id)}
              className={`border p-4 text-center transition-colors ${
                isSelected
                  ? "border-gold bg-gold/10"
                  : "border-charcoal-light bg-charcoal hover:border-gold/30"
              }`}
            >
              <p className="text-sm font-semibold">{addon.name}</p>
              <p className="mt-1 text-xs text-gold">
                +{formatPrice(addon.price)}
              </p>
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-muted">
        Select as many as you like, or skip this step.
      </p>
    </div>
  );
}
