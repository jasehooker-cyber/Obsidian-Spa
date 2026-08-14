"use client";

import { useState } from "react";
import type { Service } from "@/lib/config/business-rules";
import { formatPrice, BUSINESS } from "@/lib/config/business-rules";
import ServiceSelector from "./ServiceSelector";
import CalScheduler from "./CalScheduler";

interface Props {
  services: Service[];
}

type Step = "service" | "time";

const STEPS: Step[] = ["service", "time"];

export default function BookingFlow({ services }: Props) {
  const [step, setStep] = useState<Step>("service");
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  function handleServiceSelect(service: Service) {
    setSelectedService(service);
    setStep("time");
  }

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

      {/* Step 2: Time — handled inside the Cal.com embed */}
      {step === "time" && selectedService && (
        <>
          <h2 className="font-display mb-6 text-sm tracking-[0.2em] text-gold">
            STEP 2 — PICK A TIME
          </h2>

          <div className="mb-6 border border-charcoal-light bg-charcoal p-5">
            <h3 className="mb-3 text-sm font-semibold text-foreground">
              Your Selection
            </h3>
            <div className="space-y-1 text-sm text-muted">
              <div className="flex justify-between">
                <span>{selectedService.name}</span>
                <span className="font-semibold text-gold">
                  {formatPrice(selectedService.price)}
                </span>
              </div>
              <p className="pt-1 text-xs">
                {selectedService.duration} minutes
              </p>
            </div>
          </div>

          <CalScheduler service={selectedService} />

          <div className="mt-6">
            <button
              type="button"
              onClick={() => setStep("service")}
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
          <strong className="text-foreground">Cancellation:</strong> Free up to{" "}
          {BUSINESS.fees.lateCancelWindowMinutes} minutes before your session.
          Within {BUSINESS.fees.lateCancelWindowMinutes} minutes, a{" "}
          {formatPrice(BUSINESS.fees.lateCancelFee)} fee applies.
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
