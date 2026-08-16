import {
  eventsForDate,
  tasksForDate,
  type CalendarDay,
  type WeekStart,
} from "@/domain/calendar";
import type { EventOccurrence } from "@/domain/events";
import type { ScheduleTask } from "@/domain/tasks";

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
  tasks,
  selectedKey,
  weekStartsOn,
  onSelectDay,
}: {
  days: CalendarDay[];
  events: EventOccurrence[];
  tasks: ScheduleTask[];
  selectedKey: string;
  weekStartsOn: WeekStart;
  onSelectDay: (day: CalendarDay) => void;
}) {
  const weekdays =
    weekStartsOn === 0
      ? WEEKDAY_LABELS
      : [...WEEKDAY_LABELS.slice(1), WEEKDAY_LABELS[0]];
  return (
    <div className="month-grid-wrap">
      <div className="weekday-row" aria-hidden="true">
        {weekdays.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <div
        aria-label="Month calendar"
        className="month-grid"
        role="region"
      >
        {days.map((day) => {
          const count =
            eventsForDate(events, day.date).length +
            tasksForDate(tasks, day.date).length;
          const selected = selectedKey === day.key;

          return (
            <button
              aria-label={`${accessibleDateFormatter.format(day.date)}, ${count} ${
                count === 1 ? "item" : "items"
              }`}
              aria-pressed={selected}
              className={`calendar-day ${
                day.isCurrentMonth ? "" : "calendar-day-outside"
              } ${day.isToday ? "calendar-day-today" : ""} ${
                selected ? "calendar-day-selected" : ""
              }`}
              key={day.key}
              onClick={() => onSelectDay(day)}
              type="button"
            >
              <span className="day-number">{day.dayNumber}</span>
              {day.isToday ? (
                <span className="calendar-today-dot" aria-hidden="true" />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
