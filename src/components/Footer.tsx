import Link from "next/link";
import { BUSINESS } from "@/lib/config/business-rules";
import { formatTime } from "@/lib/config/format";

export default function Footer() {
  return (
    <footer className="relative border-t border-charcoal-light bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(201,168,76,0.03)_0%,transparent_60%)]" />
      <div className="relative mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-3">
          <div>
            <h3 className="text-gold-gradient mb-4 text-xl font-bold tracking-[0.25em]">
              OBSIDIAN
            </h3>
            <p className="text-sm leading-relaxed text-muted">
              {BUSINESS.tagline}. A private, refined space designed for men who
              value discretion and quality.
            </p>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-semibold tracking-widest text-foreground">
              HOURS &amp; CONTACT
            </h4>
            <p className="mb-1 text-sm text-muted">Open Daily</p>
            <p className="text-gold-gradient mb-3 font-semibold">
              {formatTime(BUSINESS.hours.open)} –{" "}
              {formatTime(BUSINESS.hours.close)}
            </p>
            <p className="text-sm text-muted">
              <a
                href={`tel:${BUSINESS.contact.phone}`}
                className="transition-colors hover:text-gold"
              >
                {BUSINESS.contact.phone}
              </a>
            </p>
            <p className="text-sm text-muted">
              <a
                href={`mailto:${BUSINESS.contact.email}`}
                className="transition-colors hover:text-gold"
              >
                {BUSINESS.contact.email}
              </a>
            </p>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-semibold tracking-widest text-foreground">
              QUICK LINKS
            </h4>
            <div className="flex flex-col gap-3">
              {[
                { href: "/services", label: "Services" },
                { href: "/about", label: "About" },
                { href: "/booking", label: "Book Now" },
                { href: "/privacy", label: "Privacy Policy" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group flex items-center gap-2 text-sm text-muted transition-colors duration-300 hover:text-gold"
                >
                  <span className="h-px w-0 bg-gold transition-all duration-300 group-hover:w-3" />
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-16 border-t border-charcoal-light pt-8">
          <div className="flex flex-col items-center justify-between gap-4 text-xs text-muted md:flex-row">
            <p>
              &copy; {new Date().getFullYear()} {BUSINESS.name}. All rights
              reserved.
            </p>
            <p className="tracking-wider text-muted/40">
              LUXURY &middot; PRIVACY &middot; EXCELLENCE
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
