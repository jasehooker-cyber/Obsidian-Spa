import Link from "next/link";
import { BUSINESS } from "@/lib/config/business-rules";
import { formatTime } from "@/lib/config/format";

export const metadata = {
  title: "About",
  description:
    "A premium spa experience built for men who value expertise and genuine relaxation. Certified therapists, a private setting, and professional results.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <>
      {/* Header */}
      <section className="noise-overlay relative overflow-hidden px-6 pb-16 pt-24 text-center">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(201,168,76,0.06)_0%,transparent_60%)]" />
        <p className="animate-fade-up relative mb-3 text-sm tracking-[0.4em] text-gold">
          WHO WE ARE
        </p>
        <h1 className="animate-fade-up-delay-1 relative mb-4 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
          About Obsidian
        </h1>
        <div className="gold-divider animate-fade-up-delay-2 relative mx-auto">
          <span className="text-xs text-gold/60">&#9670;</span>
        </div>
      </section>

      {/* Story */}
      <section className="section-glow relative px-6 py-16">
        <div className="mx-auto max-w-3xl space-y-8 text-lg leading-relaxed text-muted">
          <p className="animate-fade-up text-xl text-foreground/90">
            Obsidian was founded on the belief that men deserve a wellness
            experience built specifically for them — one that prioritizes
            skill, privacy, and respect for your time.
          </p>
          <p className="animate-fade-up-delay-1">
            Every session is led by a certified massage therapist with
            training across deep tissue, sports recovery, and therapeutic
            relaxation techniques. We tailor each appointment to your
            needs, whether you&apos;re managing chronic tension, recovering
            from training, or simply taking time to decompress.
          </p>
          <p className="animate-fade-up-delay-2">
            Our process is designed to be seamless. Book online in minutes,
            arrive at your scheduled time, and leave feeling better than when
            you walked in. No unnecessary paperwork, no pressure to add on
            services, and no charges until after your session is complete.
          </p>
        </div>
      </section>

      {/* Values */}
      <section className="relative px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <div className="gold-divider mx-auto mb-4">
            <span className="text-xs text-gold/60">&#9670;</span>
          </div>
          <h2 className="mb-14 text-center text-3xl font-bold tracking-tight md:text-4xl">
            The Obsidian Standard
          </h2>
          <div className="grid gap-10 md:grid-cols-3">
            {VALUES.map((v) => (
              <div key={v.title} className="group text-center">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-gold/20 transition-all duration-500 group-hover:border-gold/50 group-hover:shadow-[0_0_24px_rgba(201,168,76,0.1)]">
                  <svg
                    className="h-7 w-7 text-gold transition-transform duration-500 group-hover:scale-110"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d={v.iconPath}
                    />
                  </svg>
                </div>
                <h3 className="mb-2 text-lg font-semibold tracking-wide">
                  {v.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted">
                  {v.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Hours + CTA */}
      <section className="noise-overlay relative overflow-hidden px-6 py-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(201,168,76,0.06)_0%,transparent_60%)]" />
        <div className="relative mx-auto max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight">
            Schedule Your Visit
          </h2>
          <p className="mb-2 text-sm tracking-wider text-muted">OPEN DAILY</p>
          <p className="text-gold-gradient mb-10 text-2xl font-bold">
            {formatTime(BUSINESS.hours.open)} –{" "}
            {formatTime(BUSINESS.hours.close)}
          </p>
          <Link
            href="/booking"
            className="btn-glow relative inline-block border border-gold bg-gold px-12 py-4 text-sm font-semibold tracking-widest text-background transition-all duration-300 hover:bg-gold-dark hover:shadow-[0_0_24px_rgba(201,168,76,0.25)]"
          >
            BOOK YOUR SESSION
          </Link>
        </div>
      </section>
    </>
  );
}

const VALUES = [
  {
    title: "Privacy First",
    iconPath: "M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88",
    description:
      "Your information stays between us. We collect only what we need to serve you well, and we never share or market your data.",
  },
  {
    title: "Certified Expertise",
    iconPath: "M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z",
    description:
      "Every session is performed by a licensed therapist trained in deep tissue, sports recovery, and therapeutic massage techniques.",
  },
  {
    title: "Effortless Booking",
    iconPath: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    description:
      "Book your appointment online in minutes. No phone calls required, no waiting on hold. Select a time and confirm instantly.",
  },
];
