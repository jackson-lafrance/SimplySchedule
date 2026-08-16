import EventList from "@/components/EventList";
import { eventsForDate, getAgendaForDays } from "@/domain/calendar";
import type { EventOccurrence } from "@/domain/events";

const fullDateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
});
const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
});

export default function HomeView({
  occurrences,
  today,
}: {
  occurrences: EventOccurrence[];
  today: Date;
}) {
  const todayEvents = eventsForDate(occurrences, today);
  const upcoming = getAgendaForDays(today, 7, occurrences).filter(
    ({ day }) => !day.isToday,
  );

  return (
    <div className="screen home-screen">
      <header className="screen-heading">
        <p className="eyebrow">{fullDateFormatter.format(today)}</p>
        <h1>Today</h1>
        <p className="screen-summary">
          {todayEvents.length === 0
            ? "YOUR DAY IS CLEAR."
            : `${todayEvents.length} ${todayEvents.length === 1 ? "EVENT" : "EVENTS"} TODAY`}
        </p>
      </header>

      <section className="home-agenda-card" aria-labelledby="today-agenda-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Agenda</p>
            <h2 id="today-agenda-title">Today</h2>
          </div>
          <span className="section-count">{todayEvents.length}</span>
        </div>
        <EventList
          emptyMessage="NO EVENTS TODAY."
          events={todayEvents}
          showNotes
        />
      </section>

      <section className="upcoming-section" aria-labelledby="upcoming-title">
        <div className="section-heading section-heading-plain">
          <div>
            <p className="eyebrow">Next seven days</p>
            <h2 id="upcoming-title">Upcoming</h2>
          </div>
        </div>
        {upcoming.length === 0 ? (
          <div className="plain-empty-state">NO UPCOMING EVENTS.</div>
        ) : (
          <div className="upcoming-list">
            {upcoming.map(({ day, events }) => (
              <section className="upcoming-day" key={day.key}>
                <time dateTime={day.key}>{shortDateFormatter.format(day.date)}</time>
                <EventList emptyMessage="" events={events} />
              </section>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
