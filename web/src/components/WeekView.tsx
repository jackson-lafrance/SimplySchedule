import AgendaRows from "@/components/AgendaRows";
import { tasksForDate, type AgendaDay } from "@/domain/calendar";
import type { ScheduleTask } from "@/domain/tasks";

const weekdayFormatter = new Intl.DateTimeFormat("en-US", { weekday: "short" });
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

export default function WeekView({
  days,
  tasks,
  onSelectDay,
}: {
  days: AgendaDay[];
  tasks: ScheduleTask[];
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
          <AgendaRows
            events={events}
            tasks={tasksForDate(tasks, day.date)}
          />
        </section>
      ))}
    </div>
  );
}
