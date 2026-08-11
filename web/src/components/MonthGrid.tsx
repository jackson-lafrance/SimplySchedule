import {
  eventsForDate,
  type CalendarDay,
} from "@/domain/calendar";
import type { EventOccurrence } from "@/domain/events";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const accessibleDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "long",
  weekday: "long",
  year: "numeric",
});

export default function MonthGrid({
  days,
  events,
  selectedKey,
  onSelectDay,
}: {
  days: CalendarDay[];
  events: EventOccurrence[];
  selectedKey: string;
  onSelectDay: (day: CalendarDay) => void;
}) {
  return (
    <div className="month-grid-wrap">
      <div className="weekday-row" aria-hidden="true">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <div className="month-grid" role="grid" aria-label="Month calendar">
        {days.map((day) => {
          const dayEvents = eventsForDate(events, day.date);
          const visibleEvents = dayEvents.slice(0, 3);
          const hiddenCount = dayEvents.length - visibleEvents.length;
          const selected = selectedKey === day.key;

          return (
            <button
              aria-label={`${accessibleDateFormatter.format(day.date)}, ${
                dayEvents.length
              } ${dayEvents.length === 1 ? "event" : "events"}`}
              aria-pressed={selected}
              className={`calendar-day ${
                day.isCurrentMonth ? "" : "calendar-day-outside"
              } ${day.isToday ? "calendar-day-today" : ""} ${
                selected ? "calendar-day-selected" : ""
              }`}
              key={day.key}
              onClick={() => onSelectDay(day)}
              role="gridcell"
              type="button"
            >
              <span className="day-number">{day.dayNumber}</span>
              <span className="day-events" aria-hidden="true">
                {visibleEvents.map((event) => (
                  <span
                    className={`day-event ${
                      event.allDay ? "day-event-all-day" : ""
                    }`}
                    key={event.id}
                  >
                    {!event.allDay ? (
                      <span className="day-event-dot" />
                    ) : null}
                    <span>{event.title}</span>
                  </span>
                ))}
                {hiddenCount > 0 ? (
                  <span className="day-event-more">+{hiddenCount} MORE</span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
