import type { AgendaDay } from "@/domain/calendar";

import EventList from "@/components/EventList";

const weekdayFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
});
const monthDayFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
});

export default function AgendaView({ agenda }: { agenda: AgendaDay[] }) {
  if (agenda.length === 0) {
    return (
      <div className="agenda-empty-state">
        <span className="empty-state-mark" aria-hidden="true" />
        <h2>NO EVENTS THIS MONTH.</h2>
        <p>The schedule is clear.</p>
      </div>
    );
  }

  return (
    <div className="agenda-list" aria-label="Monthly agenda">
      {agenda.map(({ day, events }) => (
        <section className="agenda-day" key={day.key}>
          <div className="agenda-date">
            <span>{weekdayFormatter.format(day.date)}</span>
            <strong>{monthDayFormatter.format(day.date)}</strong>
            {day.isToday ? <em>TODAY</em> : null}
          </div>
          <EventList
            emptyMessage="NO EVENTS SCHEDULED."
            events={events}
            showNotes
          />
        </section>
      ))}
    </div>
  );
}
