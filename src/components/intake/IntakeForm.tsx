"use client";

import { useState } from "react";

interface Props {
  token: string;
}

export default function IntakeForm({ token }: Props) {
  const [pressure, setPressure] = useState("medium");
  const [healthConditions, setHealthConditions] = useState("");
  const [allergies, setAllergies] = useState("");
  const [focusAreas, setFocusAreas] = useState("");
  const [avoidAreas, setAvoidAreas] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/intake/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          pressurePreference: pressure,
          healthConditions: healthConditions || undefined,
          allergies: allergies || undefined,
          focusAreas: focusAreas || undefined,
          avoidAreas: avoidAreas || undefined,
          additionalNotes: additionalNotes || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          (data as { error?: string }).error ?? "Submission failed"
        );
      }

      setSubmitted(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="py-12 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center border border-gold/30 text-2xl text-gold">
          ✓
        </div>
        <h2 className="mb-4 text-2xl font-bold">Thank You</h2>
        <p className="text-muted">
          Your intake form has been submitted. Your therapist will review it
          before your session.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Pressure preference */}
      <div>
        <label className="mb-2 block text-sm font-semibold">
          Pressure Preference
        </label>
        <div className="grid grid-cols-4 gap-2">
          {(["light", "medium", "firm", "deep"] as const).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setPressure(level)}
              className={`border px-3 py-2 text-sm capitalize transition-colors ${
                pressure === level
                  ? "border-gold bg-gold/10 text-gold"
                  : "border-charcoal-light bg-charcoal text-muted hover:border-gold/30"
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {/* Health conditions */}
      <div>
        <label htmlFor="health" className="mb-1 block text-sm text-muted">
          Health conditions or injuries we should know about
        </label>
        <textarea
          id="health"
          value={healthConditions}
          onChange={(e) => setHealthConditions(e.target.value)}
          rows={3}
          maxLength={2000}
          className="w-full border border-charcoal-light bg-charcoal px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-gold"
          placeholder="e.g., lower back pain, recent surgery, high blood pressure..."
        />
      </div>

      {/* Allergies */}
      <div>
        <label htmlFor="allergies" className="mb-1 block text-sm text-muted">
          Allergies or sensitivities
        </label>
        <textarea
          id="allergies"
          value={allergies}
          onChange={(e) => setAllergies(e.target.value)}
          rows={2}
          maxLength={1000}
          className="w-full border border-charcoal-light bg-charcoal px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-gold"
          placeholder="e.g., nut oils, latex, fragrances..."
        />
      </div>

      {/* Focus areas */}
      <div>
        <label htmlFor="focus" className="mb-1 block text-sm text-muted">
          Areas you&apos;d like us to focus on
        </label>
        <textarea
          id="focus"
          value={focusAreas}
          onChange={(e) => setFocusAreas(e.target.value)}
          rows={2}
          maxLength={1000}
          className="w-full border border-charcoal-light bg-charcoal px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-gold"
          placeholder="e.g., neck and shoulders, lower back, legs..."
        />
      </div>

      {/* Avoid areas */}
      <div>
        <label htmlFor="avoid" className="mb-1 block text-sm text-muted">
          Areas to avoid
        </label>
        <textarea
          id="avoid"
          value={avoidAreas}
          onChange={(e) => setAvoidAreas(e.target.value)}
          rows={2}
          maxLength={1000}
          className="w-full border border-charcoal-light bg-charcoal px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-gold"
          placeholder="e.g., feet, face, stomach..."
        />
      </div>

      {/* Additional notes */}
      <div>
        <label htmlFor="notes" className="mb-1 block text-sm text-muted">
          Anything else we should know?
        </label>
        <textarea
          id="notes"
          value={additionalNotes}
          onChange={(e) => setAdditionalNotes(e.target.value)}
          rows={3}
          maxLength={2000}
          className="w-full border border-charcoal-light bg-charcoal px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-gold"
          placeholder="First visit, specific preferences, questions..."
        />
      </div>

      {error && <div className="text-sm text-red-400">{error}</div>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full border border-gold bg-gold px-8 py-3 text-sm font-semibold tracking-wide text-background transition-colors hover:bg-gold-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Submitting..." : "Submit Intake Form"}
      </button>
    </form>
  );
}
