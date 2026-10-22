import { BUSINESS } from "@/lib/config/business-rules";
import {
  dateBadge,
  groupByMonth,
  longWhen,
  timeLabel,
  type UpcomingEvents,
} from "@/lib/events/calendar";
import { reserveHref } from "@/lib/waitlist";

/** Upcoming classes and events, grouped by month. */
export default function EventsCalendar({ upcoming }: { upcoming: UpcomingEvents }) {
  const months = groupByMonth(upcoming.events);
  const phoneHref = `tel:${BUSINESS.contact.phone.replace(/[^\d+]/g, "")}`;

  return (
    <section className="section-glow relative px-6 py-12">
      <div className="mx-auto max-w-4xl">
        <div className="mb-10 text-center">
          <p className="font-display mb-3 text-sm tracking-[0.4em] text-gold">
            UPCOMING
          </p>
          <h2 className="font-display text-2xl uppercase tracking-[0.12em] md:text-3xl">
            The Calendar
          </h2>
        </div>

        {months.length === 0 ? (
          <p className="mx-auto max-w-xl border-l-2 border-gold/20 py-1 pl-5 text-sm leading-relaxed text-muted">
            No classes on the calendar right now. New dates go up here first —
            join the list below for anything that interests you, or call{" "}
            <a href={phoneHref} className="whitespace-nowrap text-gold transition-colors hover:text-gold-light">
              {BUSINESS.contact.phone}
            </a>
            .
          </p>
        ) : (
          <div className="space-y-12">
            {months.map((month) => (
              <div key={month.key}>
                <div className="mb-5 flex items-center gap-4">
                  <h3 className="font-display shrink-0 text-sm tracking-[0.3em] text-gold">
                    {month.label.toUpperCase()}
                  </h3>
                  <div className="h-px flex-1 bg-gradient-to-r from-gold/30 to-transparent" />
                </div>

                <ol className="space-y-4">
                  {month.events.map((event) => {
                    const badge = dateBadge(event);
                    const meta = [timeLabel(event), event.location]
                      .filter(Boolean)
                      .join(" · ");
                    return (
                      <li key={event.id} className="luxury-card flex gap-5 p-5 sm:gap-7 sm:p-6">
                        <div className="w-14 shrink-0 border-r border-gold/20 pr-4 text-center sm:w-16 sm:pr-5">
                          <p className="text-[10px] tracking-[0.2em] text-muted">
                            {badge.weekday}
                          </p>
                          <p className="text-gold-gradient my-0.5 text-3xl font-bold leading-none">
                            {badge.day}
                          </p>
                          <p className="text-[10px] tracking-[0.2em] text-muted">
                            {badge.month}
                          </p>
                        </div>

                        <div className="min-w-0 flex-1">
                          <h4 className="text-lg font-semibold tracking-wide text-foreground">
                            {event.title}
                          </h4>
                          <p className="mt-1 text-xs tracking-wider text-gold/80">
                            {meta}
                          </p>
                          {event.description && (
                            <p className="mt-3 whitespace-pre-line break-words text-sm leading-relaxed text-muted">
                              {event.description}
                            </p>
                          )}
                          <a
                            href={reserveHref(event.title, longWhen(event))}
                            className="mt-4 inline-block border border-gold/30 px-5 py-2.5 text-xs font-semibold tracking-widest text-gold/90 transition-all duration-300 hover:border-gold hover:text-gold"
                          >
                            RESERVE &rarr;
                          </a>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))}

            <p className="border-l-2 border-gold/20 py-1 pl-5 text-sm leading-relaxed text-muted">
              Reserve by email, or call{" "}
              <a href={phoneHref} className="whitespace-nowrap text-gold transition-colors hover:text-gold-light">
                {BUSINESS.contact.phone}
              </a>
              . All times are New York time.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
