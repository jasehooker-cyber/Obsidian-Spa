"use client";

import { useState, useEffect } from "react";
import { BUSINESS } from "@/lib/config/business-rules";

interface Slot {
  start: string;
  end: string;
  therapistId?: string;
}

interface FetchState {
  slots: Slot[];
  loading: boolean;
  error: string | null;
  message: string | null;
}

interface Props {
  serviceId: string;
  therapistId: string | null;
  selectedSlot: Slot | null;
  onSelectSlot: (slot: Slot) => void;
}

function getNextDays(count: number): string[] {
  const days: string[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    days.push(d.toISOString().split("T")[0]);
  }
  return days;
}

function formatSlotTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: BUSINESS.timezone,
  });
}

function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (dateStr === today.toISOString().split("T")[0]) return "Today";
  if (dateStr === tomorrow.toISOString().split("T")[0]) return "Tomorrow";

  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

async function fetchAvailability(
  serviceId: string,
  therapistId: string | null,
  date: string,
  signal: AbortSignal
): Promise<FetchState> {
  try {
    const params = new URLSearchParams({ serviceId, date });
    if (therapistId) params.set("therapistId", therapistId);
    const res = await fetch(
      `/api/booking/availability?${params}`,
      { signal }
    );
    const data: {
      slots?: Slot[];
      message?: string;
      error?: string;
    } = await res.json();

    if (data.error) {
      return { slots: [], loading: false, error: data.error, message: null };
    }
    return {
      slots: data.slots ?? [],
      loading: false,
      error: null,
      message: data.message ?? null,
    };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return { slots: [], loading: true, error: null, message: null };
    }
    return {
      slots: [],
      loading: false,
      error: "Failed to load availability",
      message: null,
    };
  }
}

export default function SlotPicker({
  serviceId,
  therapistId,
  selectedSlot,
  onSelectSlot,
}: Props) {
  const days = getNextDays(BUSINESS.booking.maxAdvanceDays);
  const [selectedDate, setSelectedDate] = useState(days[0]);
  const [state, setState] = useState<FetchState>({
    slots: [],
    loading: true,
    error: null,
    message: null,
  });

  useEffect(() => {
    const controller = new AbortController();

    fetchAvailability(serviceId, therapistId, selectedDate, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setState(result);
        }
      });

    // For today, auto-refresh every 60 s so slots stay current
    const today = new Date().toISOString().split("T")[0];
    let interval: ReturnType<typeof setInterval> | undefined;
    if (selectedDate === today) {
      interval = setInterval(() => {
        const ac = new AbortController();
        fetchAvailability(serviceId, therapistId, selectedDate, ac.signal).then(
          (result) => {
            if (!ac.signal.aborted) setState(result);
          }
        );
      }, 60_000);
    }

    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [serviceId, therapistId, selectedDate]);

  function handleDateSelect(date: string) {
    setSelectedDate(date);
    setState({ slots: [], loading: true, error: null, message: null });
  }

  return (
    <div>
      <h2 className="mb-6 text-sm font-semibold tracking-[0.2em] text-gold">
        STEP 4 — PICK A TIME
      </h2>

      {/* Date tabs */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
        {days.map((day) => (
          <button
            key={day}
            type="button"
            onClick={() => handleDateSelect(day)}
            className={`shrink-0 border px-4 py-2 text-xs transition-colors ${
              selectedDate === day
                ? "border-gold bg-gold/10 text-gold"
                : "border-charcoal-light bg-charcoal text-muted hover:border-gold/30"
            }`}
          >
            {formatDayLabel(day)}
          </button>
        ))}
      </div>

      {/* Slots */}
      {state.loading && (
        <div className="py-8 text-center text-sm text-muted">
          Loading availability...
        </div>
      )}

      {state.error && (
        <div className="py-8 text-center text-sm text-red-400">
          {state.error}
        </div>
      )}

      {state.message && !state.loading && (
        <div className="py-8 text-center text-sm text-muted">
          {state.message}
        </div>
      )}

      {!state.loading &&
        !state.error &&
        !state.message &&
        state.slots.length === 0 && (
          <div className="py-8 text-center text-sm text-muted">
            No available times on this date.
          </div>
        )}

      {!state.loading && !state.error && state.slots.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {state.slots.map((slot) => {
            const isSelected = selectedSlot?.start === slot.start;
            return (
              <button
                key={slot.start}
                type="button"
                onClick={() => onSelectSlot(slot)}
                className={`border px-3 py-2 text-sm transition-colors ${
                  isSelected
                    ? "border-gold bg-gold/10 text-gold"
                    : "border-charcoal-light bg-charcoal text-muted hover:border-gold/30 hover:text-foreground"
                }`}
              >
                {formatSlotTime(slot.start)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
