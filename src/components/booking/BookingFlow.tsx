"use client";

import { useState } from "react";
import type { Service, AddOn, AddOnId } from "@/lib/config/business-rules";
import { formatPrice, BUSINESS } from "@/lib/config/business-rules";
import ServiceSelector from "./ServiceSelector";
import AddOnSelector from "./AddOnSelector";
import CalScheduler from "./CalScheduler";

interface Props {
  services: Service[];
  addOns: AddOn[];
}

type Step = "service" | "addons" | "time";

const STEPS: Step[] = ["service", "addons", "time"];

export default function BookingFlow({ services, addOns }: Props) {
  const [step, setStep] = useState<Step>("service");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedAddOns, setSelectedAddOns] = useState<AddOnId[]>([]);

  function handleServiceSelect(service: Service) {
    setSelectedService(service);
    setSelectedAddOns([]);
    setStep("addons");
  }

  function handleAddOnToggle(id: AddOnId) {
    setSelectedAddOns((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  }

  const selectedAddOnItems = addOns.filter((a) => selectedAddOns.includes(a.id));
  const total =
    (selectedService?.price ?? 0) +
    selectedAddOnItems.reduce((sum, a) => sum + a.price, 0);

  return (
    <div className="mx-auto max-w-3xl">
      {/* Progress indicator */}
      <div className="mb-10 flex items-center justify-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center text-xs font-semibold ${
                step === s
                  ? "border border-gold bg-gold text-background"
                  : STEPS.indexOf(step) > i
                    ? "border border-gold/50 text-gold"
                    : "border border-charcoal-light text-muted"
              }`}
            >
              {i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`h-px w-6 ${
                  STEPS.indexOf(step) > i ? "bg-gold/50" : "bg-charcoal-light"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Service */}
      {step === "service" && (
        <ServiceSelector
          services={services}
          selected={selectedService}
          onSelect={handleServiceSelect}
        />
      )}

      {/* Step 2: Add-ons */}
      {step === "addons" && (
        <>
          <AddOnSelector
            addOns={addOns}
            selected={selectedAddOns}
            onToggle={handleAddOnToggle}
          />
          <div className="mt-6 flex justify-between">
            <button
              type="button"
              onClick={() => setStep("service")}
              className="text-sm text-muted transition-colors hover:text-foreground"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={() => setStep("time")}
              className="border border-gold px-6 py-2 text-sm text-gold transition-colors hover:bg-gold hover:text-background"
            >
              Continue
            </button>
          </div>
        </>
      )}

      {/* Step 3: Time — handled inside the Cal.com embed */}
      {step === "time" && selectedService && (
        <>
          <h2 className="mb-6 text-sm font-semibold tracking-[0.2em] text-gold">
            STEP 3 — PICK A TIME
          </h2>

          <div className="mb-6 border border-charcoal-light bg-charcoal p-5">
            <h3 className="mb-3 text-sm font-semibold text-foreground">
              Your Selection
            </h3>
            <div className="space-y-1 text-sm text-muted">
              <div className="flex justify-between">
                <span>{selectedService.name}</span>
                <span>{formatPrice(selectedService.price)}</span>
              </div>
              {selectedAddOnItems.map((a) => (
                <div key={a.id} className="flex justify-between">
                  <span>+ {a.name}</span>
                  <span>{formatPrice(a.price)}</span>
                </div>
              ))}
              <div className="mt-2 flex justify-between border-t border-charcoal-light pt-2 text-foreground">
                <span className="font-semibold">Total</span>
                <span className="font-semibold text-gold">
                  {formatPrice(total)}
                </span>
              </div>
            </div>
          </div>

          <CalScheduler
            service={selectedService}
            addOnIds={selectedAddOns}
          />

          <div className="mt-6">
            <button
              type="button"
              onClick={() => setStep("addons")}
              className="text-sm text-muted transition-colors hover:text-foreground"
            >
              ← Back
            </button>
          </div>
        </>
      )}

      {/* Policies */}
      <div className="mt-12 border-t border-charcoal-light pt-8 text-xs leading-relaxed text-muted">
        <p className="mb-2">
          <strong className="text-foreground">Card on file:</strong> After you
          pick a time, we&apos;ll ask for a card to secure the booking. Your
          card is saved securely via Stripe and you are not charged at booking.
        </p>
        <p className="mb-2">
          <strong className="text-foreground">Late cancellation:</strong>{" "}
          {formatPrice(BUSINESS.fees.lateCancelFee)} fee within{" "}
          {BUSINESS.fees.lateCancelWindow} hours of your appointment.
        </p>
        <p>
          <strong className="text-foreground">No-show:</strong>{" "}
          {BUSINESS.fees.noShowPercent}% of service price. To cancel or
          reschedule, contact us directly.
        </p>
      </div>
    </div>
  );
}
