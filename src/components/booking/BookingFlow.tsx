"use client";

import { useState } from "react";
import type {
  Service,
  AddOn,
  AddOnId,
} from "@/lib/config/business-rules";
import { formatPrice, BUSINESS } from "@/lib/config/business-rules";
import ServiceSelector from "./ServiceSelector";
import AddOnSelector from "./AddOnSelector";
import TherapistSelector, { type Therapist } from "./TherapistSelector";
import SlotPicker from "./SlotPicker";
import CardForm from "./CardForm";

interface Slot {
  start: string;
  end: string;
  therapistId?: string;
}

interface Props {
  services: Service[];
  addOns: AddOn[];
  therapists: Therapist[];
}

type Step = "service" | "addons" | "therapist" | "time" | "info";

export default function BookingFlow({ services, addOns, therapists }: Props) {
  const [step, setStep] = useState<Step>("service");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedAddOns, setSelectedAddOns] = useState<AddOnId[]>([]);
  const [selectedTherapist, setSelectedTherapist] = useState<string | null>(
    null
  );
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function handleServiceSelect(service: Service) {
    setSelectedService(service);
    setSelectedAddOns([]);
    setSelectedTherapist(null);
    setSelectedSlot(null);
    setClientSecret(null);
    setStep("addons");
  }

  function handleAddOnToggle(id: AddOnId) {
    setSelectedAddOns((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  }

  function handleTherapistSelect(id: string) {
    setSelectedTherapist(id);
    setSelectedSlot(null);
    setStep("time");
  }

  function handleSlotSelect(slot: Slot) {
    setSelectedSlot(slot);
    if (slot.therapistId && !selectedTherapist) {
      setSelectedTherapist(slot.therapistId);
    }
    setStep("info");
  }

  async function handleClientSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedService || !selectedSlot || !selectedTherapist) return;

    setSubmitting(true);
    setFormError(null);

    try {
      const draftRes = await fetch("/api/booking/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: selectedService.id,
          addOnIds: selectedAddOns,
          therapistId: selectedTherapist,
          slotStart: selectedSlot.start,
          slotEnd: selectedSlot.end,
        }),
      });

      if (!draftRes.ok) {
        const data = await draftRes.json().catch(() => ({}));
        throw new Error(
          (data as { error?: string }).error ?? "Failed to create booking"
        );
      }

      const { draftId } = (await draftRes.json()) as { draftId: string };

      const setupRes = await fetch("/api/booking/create-setup-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftId,
          clientName,
          clientEmail,
          clientPhone,
        }),
      });

      if (!setupRes.ok) {
        const data = await setupRes.json().catch(() => ({}));
        throw new Error(
          (data as { error?: string }).error ?? "Failed to set up payment"
        );
      }

      const { clientSecret: secret } = (await setupRes.json()) as {
        clientSecret: string;
      };
      setClientSecret(secret);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    } finally {
      setSubmitting(false);
    }
  }

  const skipTherapist = selectedService?.requiresMultipleTherapists ?? false;
  const activeSteps: Step[] = skipTherapist
    ? ["service", "addons", "time", "info"]
    : ["service", "addons", "therapist", "time", "info"];

  const selectedAddOnItems = addOns.filter((a) =>
    selectedAddOns.includes(a.id)
  );
  const total =
    (selectedService?.price ?? 0) +
    selectedAddOnItems.reduce((sum, a) => sum + a.price, 0);

  return (
    <div className="mx-auto max-w-2xl">
      {/* Progress indicator */}
      <div className="mb-10 flex items-center justify-center gap-2">
        {activeSteps.map(
          (s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center text-xs font-semibold ${
                  step === s
                    ? "border border-gold bg-gold text-background"
                    : activeSteps.indexOf(step) > i
                      ? "border border-gold/50 text-gold"
                      : "border border-charcoal-light text-muted"
                }`}
              >
                {i + 1}
              </div>
              {i < activeSteps.length - 1 && (
                <div
                  className={`h-px w-6 ${
                    activeSteps.indexOf(step) > i
                      ? "bg-gold/50"
                      : "bg-charcoal-light"
                  }`}
                />
              )}
            </div>
          )
        )}
      </div>

      {/* Step 1: Service */}
      {step === "service" && (
        <>
          <ServiceSelector
            services={services}
            selected={selectedService}
            onSelect={handleServiceSelect}
          />
        </>
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
              onClick={() =>
                setStep(
                  selectedService?.requiresMultipleTherapists
                    ? "time"
                    : "therapist"
                )
              }
              className="border border-gold px-6 py-2 text-sm text-gold transition-colors hover:bg-gold hover:text-background"
            >
              Continue
            </button>
          </div>
        </>
      )}

      {/* Step 3: Therapist */}
      {step === "therapist" && (
        <>
          <TherapistSelector
            therapists={therapists}
            selected={selectedTherapist}
            onSelect={handleTherapistSelect}
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

      {/* Step 4: Time */}
      {step === "time" && selectedService && (selectedTherapist || selectedService.requiresMultipleTherapists) && (
        <>
          <SlotPicker
            serviceId={selectedService.id}
            therapistId={selectedTherapist}
            selectedSlot={selectedSlot}
            onSelectSlot={handleSlotSelect}
          />
          <div className="mt-6">
            <button
              type="button"
              onClick={() => {
                if (selectedService.requiresMultipleTherapists) {
                  setStep("addons");
                } else {
                  setSelectedTherapist(null);
                  setStep("therapist");
                }
              }}
              className="text-sm text-muted transition-colors hover:text-foreground"
            >
              ← Back
            </button>
          </div>
        </>
      )}

      {/* Step 5: Client info + Card */}
      {step === "info" && selectedService && selectedSlot && (
        <>
          <h2 className="mb-6 text-sm font-semibold tracking-[0.2em] text-gold">
            STEP 5 — YOUR DETAILS
          </h2>

          {/* Booking summary */}
          <div className="mb-6 border border-charcoal-light bg-charcoal p-5">
            <h3 className="mb-3 text-sm font-semibold text-foreground">
              Booking Summary
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
              <p className="mt-2 text-xs">
                {new Date(selectedSlot.start).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  timeZone: BUSINESS.timezone,
                })}{" "}
                at{" "}
                {new Date(selectedSlot.start).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                  timeZone: BUSINESS.timezone,
                })}
              </p>
            </div>
          </div>

          {/* Client form or Card form */}
          {!clientSecret ? (
            <form onSubmit={handleClientSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="name"
                  className="mb-1 block text-sm text-muted"
                >
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full border border-charcoal-light bg-charcoal px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-gold"
                  placeholder="John Smith"
                />
              </div>
              <div>
                <label
                  htmlFor="email"
                  className="mb-1 block text-sm text-muted"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  className="w-full border border-charcoal-light bg-charcoal px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-gold"
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label
                  htmlFor="phone"
                  className="mb-1 block text-sm text-muted"
                >
                  Phone
                </label>
                <input
                  id="phone"
                  type="tel"
                  required
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  className="w-full border border-charcoal-light bg-charcoal px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-gold"
                  placeholder="(555) 123-4567"
                />
              </div>

              {formError && (
                <div className="text-sm text-red-400">{formError}</div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full border border-gold bg-gold px-8 py-3 text-sm font-semibold tracking-wide text-background transition-colors hover:bg-gold-dark disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Setting up..." : "Continue to Payment"}
              </button>
            </form>
          ) : (
            <CardForm clientSecret={clientSecret} />
          )}

          <div className="mt-6">
            <button
              type="button"
              onClick={() => {
                setClientSecret(null);
                setStep("time");
              }}
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
          <strong className="text-foreground">Card on file:</strong> Your card
          is saved securely via Stripe. You are not charged at booking.
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

