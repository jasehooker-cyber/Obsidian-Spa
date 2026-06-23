import { BUSINESS } from "@/lib/config/business-rules";

export const metadata = {
  title: "Privacy Policy",
  description: `Privacy policy for ${BUSINESS.name}.`,
};

export default function PrivacyPage() {
  return (
    <section className="px-6 pb-20 pt-28">
      <div className="mx-auto max-w-3xl">
        <p className="mb-3 text-sm tracking-[0.4em] text-gold">LEGAL</p>
        <h1 className="mb-8 text-4xl font-bold tracking-tight">
          Privacy Policy
        </h1>

        <div className="space-y-8 text-sm leading-relaxed text-muted">
          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              What We Collect
            </h2>
            <p>
              When you book an appointment, we collect your name, email address,
              and phone number. If you fill out an intake form, we also collect
              health-related information you provide (conditions, allergies,
              pressure preferences, and focus areas).
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              Payment Information
            </h2>
            <p>
              Your card details are handled entirely by{" "}
              <strong className="text-foreground">Stripe</strong>. We never
              see, store, or have access to your full card number. Stripe saves
              your payment method securely so we can process charges for
              services rendered and policy fees (late cancellation or no-show).
              No charge is made at the time of booking.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              How We Use Your Information
            </h2>
            <ul className="ml-5 list-disc space-y-2">
              <li>To confirm and manage your appointments</li>
              <li>To send you booking confirmations and intake forms via email</li>
              <li>
                To prepare your therapist for your session (intake form
                responses)
              </li>
              <li>To process payments and enforce our cancellation policy</li>
            </ul>
            <p className="mt-3">
              We do not sell your information. We do not send marketing emails.
              We do not share your data with anyone other than the services
              listed below.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              Services We Use
            </h2>
            <ul className="ml-5 list-disc space-y-2">
              <li>
                <strong className="text-foreground">Stripe</strong> — payment
                processing
              </li>
              <li>
                <strong className="text-foreground">Supabase</strong> — secure
                database hosting
              </li>
              <li>
                <strong className="text-foreground">Cal.com</strong> —
                scheduling and availability
              </li>
              <li>
                <strong className="text-foreground">Resend</strong> — email
                delivery
              </li>
              <li>
                <strong className="text-foreground">Vercel</strong> — website
                hosting
              </li>
            </ul>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              Data Retention
            </h2>
            <p>
              We keep your booking and client records for as long as needed to
              provide our services and comply with legal requirements. Intake
              form tokens expire after 72 hours. You can request deletion of
              your data at any time by contacting us.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              Contact
            </h2>
            <p>
              If you have questions about this policy or want to request data
              deletion, email us at{" "}
              <a
                href={`mailto:${BUSINESS.contact.email}`}
                className="text-gold underline transition-colors hover:text-gold-light"
              >
                {BUSINESS.contact.email}
              </a>
              .
            </p>
          </div>

          <div className="border-t border-charcoal-light pt-6 text-xs text-muted/60">
            Last updated: June 2026
          </div>
        </div>
      </div>
    </section>
  );
}
