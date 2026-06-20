"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Status = "confirming" | "confirmed" | "error";

function getInitialState(): { status: Status; errorMsg: string | null } {
  if (typeof window === "undefined") {
    return { status: "confirming", errorMsg: null };
  }
  const params = new URLSearchParams(window.location.search);
  const setupIntentId = params.get("setup_intent");
  const redirectStatus = params.get("redirect_status");

  if (!setupIntentId || redirectStatus !== "succeeded") {
    return {
      status: "error",
      errorMsg: "Card setup did not complete. Please try booking again.",
    };
  }
  return { status: "confirming", errorMsg: null };
}

export function ConfirmBooking() {
  const initial = getInitialState();
  const [status, setStatus] = useState<Status>(initial.status);
  const [errorMsg, setErrorMsg] = useState<string | null>(initial.errorMsg);

  useEffect(() => {
    if (status !== "confirming") return;

    const params = new URLSearchParams(window.location.search);
    const setupIntentId = params.get("setup_intent");
    if (!setupIntentId) return;

    const controller = new AbortController();

    fetch("/api/booking/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ setupIntentId }),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            (data as { error?: string }).error ?? "Confirmation failed"
          );
        }
        if (!controller.signal.aborted) setStatus("confirmed");
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setStatus("error");
        setErrorMsg(
          err instanceof Error ? err.message : "Something went wrong"
        );
      });

    return () => controller.abort();
  }, [status]);

  if (status === "confirming") {
    return (
      <>
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center border border-gold/30">
          <div className="h-6 w-6 animate-spin border-2 border-gold border-t-transparent" />
        </div>
        <h1 className="mb-4 text-3xl font-bold tracking-tight">
          Confirming Your Booking...
        </h1>
        <p className="text-muted">
          Please wait while we finalize your reservation.
        </p>
      </>
    );
  }

  if (status === "error") {
    return (
      <>
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center border border-red-500/30 text-2xl text-red-400">
          ✕
        </div>
        <h1 className="mb-4 text-3xl font-bold tracking-tight">
          Something Went Wrong
        </h1>
        <p className="mb-8 text-muted">{errorMsg}</p>
        <Link
          href="/booking"
          className="inline-block border border-gold px-8 py-3 text-sm tracking-wide text-gold transition-colors hover:bg-gold hover:text-background"
        >
          Try Again
        </Link>
      </>
    );
  }

  return (
    <>
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center border border-gold/30 text-2xl text-gold">
        ✓
      </div>
      <h1 className="mb-4 text-3xl font-bold tracking-tight">
        You&apos;re All Set
      </h1>
      <p className="mb-2 text-muted">
        Your session has been confirmed. A card has been saved securely on file —
        you will not be charged until after your appointment.
      </p>
      <p className="mb-8 text-sm text-muted">
        You&apos;ll receive an intake form link shortly. Please complete it
        before your visit so your therapist can personalize your session.
      </p>
      <div className="flex justify-center gap-4">
        <Link
          href="/"
          className="border border-charcoal-light px-8 py-3 text-sm tracking-wide text-muted transition-colors hover:border-gold hover:text-gold"
        >
          Back to Home
        </Link>
        <Link
          href="/services"
          className="border border-gold px-8 py-3 text-sm tracking-wide text-gold transition-colors hover:bg-gold hover:text-background"
        >
          View Services
        </Link>
      </div>
    </>
  );
}
