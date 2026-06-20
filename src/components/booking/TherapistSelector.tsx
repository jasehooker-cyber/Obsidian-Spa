"use client";

export interface Therapist {
  id: string;
  name: string;
}

interface Props {
  therapists: Therapist[];
  selected: string | null;
  onSelect: (id: string) => void;
}

export default function TherapistSelector({
  therapists,
  selected,
  onSelect,
}: Props) {
  return (
    <div>
      <h2 className="mb-6 text-sm font-semibold tracking-[0.2em] text-gold">
        STEP 3 — CHOOSE YOUR THERAPIST
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {therapists.map((t) => {
          const isSelected = selected === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelect(t.id)}
              className={`border p-5 text-center transition-colors ${
                isSelected
                  ? "border-gold bg-gold/10"
                  : "border-charcoal-light bg-charcoal hover:border-gold/30"
              }`}
            >
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-charcoal-light text-sm font-semibold text-gold">
                {t.name.charAt(0)}
              </div>
              <p className="text-sm font-semibold">{t.name}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
