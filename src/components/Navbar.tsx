"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/about", label: "About" },
  { href: "/booking", label: "Book Now" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 20);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "border-b border-charcoal-light bg-background/95 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.3)]"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link
          href="/"
          className="text-gold-gradient text-xl font-bold tracking-[0.25em]"
        >
          OBSIDIAN
        </Link>

        {/* Desktop */}
        <div className="hidden items-center gap-10 md:flex">
          {NAV_LINKS.map((link) =>
            link.label === "Book Now" ? (
              <Link
                key={link.href}
                href={link.href}
                className="border border-gold px-5 py-2 text-xs font-semibold tracking-widest text-gold transition-all duration-300 hover:bg-gold hover:text-background hover:shadow-[0_0_16px_rgba(201,168,76,0.2)]"
              >
                BOOK NOW
              </Link>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className="group relative text-xs tracking-widest text-muted transition-colors duration-300 hover:text-foreground"
              >
                {link.label.toUpperCase()}
                <span className="absolute -bottom-1 left-0 h-px w-0 bg-gold transition-all duration-300 group-hover:w-full" />
              </Link>
            )
          )}
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="text-muted transition-colors hover:text-gold md:hidden"
          aria-label="Toggle menu"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {open ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-charcoal-light bg-background/98 px-6 pb-6 pt-2 backdrop-blur-xl md:hidden">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={`block py-3.5 text-sm tracking-widest transition-colors ${
                link.label === "Book Now"
                  ? "text-gold"
                  : "text-muted hover:text-gold"
              }`}
            >
              {link.label.toUpperCase()}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
