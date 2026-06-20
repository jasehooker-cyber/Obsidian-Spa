"use client";

import { useState } from "react";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { getStripe } from "@/lib/stripe/client";
import { getEnv as getPublicEnv } from "@/lib/config/env-public";

interface Props {
  clientSecret: string;
}

function CardFormInner() {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setError(null);

    const { error: stripeError } = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: `${getPublicEnv().siteUrl}/booking/success`,
      },
    });

    if (stripeError) {
      setError(stripeError.message ?? "Something went wrong");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement
        options={{
          layout: "tabs",
        }}
      />

      {error && (
        <div className="mt-4 text-sm text-red-400">{error}</div>
      )}

      <button
        type="submit"
        disabled={!stripe || submitting}
        className="mt-6 w-full border border-gold bg-gold px-8 py-3 text-sm font-semibold tracking-wide text-background transition-colors hover:bg-gold-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Saving card..." : "Save Card & Confirm Booking"}
      </button>
    </form>
  );
}

export default function CardForm({ clientSecret }: Props) {
  return (
    <Elements
      stripe={getStripe()}
      options={{
        clientSecret,
        appearance: {
          theme: "night",
          variables: {
            colorPrimary: "#c9a84c",
            colorBackground: "#1a1a1a",
            colorText: "#f5f5f5",
            colorDanger: "#ef4444",
            borderRadius: "0px",
          },
        },
      }}
    >
      <CardFormInner />
    </Elements>
  );
}
