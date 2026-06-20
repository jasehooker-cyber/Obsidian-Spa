import Link from "next/link";
import { BUSINESS } from "@/lib/config/business-rules";
import { formatTime } from "@/lib/config/format";

export default function Footer() {
  return (
    <footer className="border-t border-charcoal-light bg-background">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <h3 className="mb-3 text-lg font-bold tracking-widest text-gold">
              OBSIDIAN
            </h3>
            <p className="text-sm leading-relaxed text-muted">
              {BUSINESS.tagline}
            </p>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold tracking-wide text-foreground">
              Hours
            </h4>
            <p className="text-sm text-muted">Open Daily</p>
            <p className="text-sm text-muted">
              {formatTime(BUSINESS.hours.open)} –{" "}
              {formatTime(BUSINESS.hours.close)}
            </p>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold tracking-wide text-foreground">
              Quick Links
            </h4>
            <div className="flex flex-col gap-2">
              <Link
                href="/services"
                className="text-sm text-muted transition-colors hover:text-gold"
              >
                Services
              </Link>
              <Link
                href="/about"
                className="text-sm text-muted transition-colors hover:text-gold"
              >
                About
              </Link>
              <Link
                href="/booking"
                className="text-sm text-muted transition-colors hover:text-gold"
              >
                Book Now
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-charcoal-light pt-6 text-center text-xs text-muted">
          © {new Date().getFullYear()} {BUSINESS.name}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

