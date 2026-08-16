import type { AgendaDay } from "@/domain/calendar";

const weekdayFormatter = new Intl.DateTimeFormat("en-US", { weekday: "short" });
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});
const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

export default function WeekView({
  days,
  onSelectDay,
}: {
  days: AgendaDay[];
  onSelectDay: (date: Date) => void;
}) {
  return (
    <div aria-label="Week calendar" className="week-grid" role="region">
      {days.map(({ day, events }) => (
        <section
          className={`week-day ${day.isToday ? "week-day-today" : ""}`}
          key={day.key}
        >
          <button
            aria-label={`Open ${dateFormatter.format(day.date)} in day view`}
            className="week-day-heading"
            onClick={() => onSelectDay(day.date)}
            type="button"
          >
            <span>{weekdayFormatter.format(day.date)}</span>
            <strong>{day.dayNumber}</strong>
          </button>
          {events.length === 0 ? (
            <span className="week-day-empty">—</span>
          ) : (
            <ol className="week-events">
              {events.map((event) => (
                <li key={event.id}>
                  <time dateTime={event.startsAt.toISOString()}>
                    {event.allDay ? "ALL DAY" : timeFormatter.format(event.startsAt)}
                  </time>
                  <strong>{event.title}</strong>
                  {event.isRepeating ? <span aria-label="Repeating event">↻</span> : null}
                </li>
              ))}
            </ol>
          )}
        </section>
      ))}
    </div>
  );
}
