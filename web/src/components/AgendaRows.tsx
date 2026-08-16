import type { EventOccurrence } from "@/domain/events";
import type { ScheduleTask } from "@/domain/tasks";

type AgendaRow =
  | { type: "task"; item: ScheduleTask }
  | { type: "event"; item: EventOccurrence };

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

function eventTime(event: EventOccurrence) {
  if (event.allDay) {
    return "ALL DAY";
  }
  const start = timeFormatter.format(event.startsAt);
  return event.endsAt
    ? `${start}–${timeFormatter.format(event.endsAt)}`
    : start;
}

function agendaRows(
  tasks: ScheduleTask[],
  events: EventOccurrence[],
): AgendaRow[] {
  return [
    ...tasks.map((item): AgendaRow => ({ type: "task", item })),
    ...events.map((item): AgendaRow => ({ type: "event", item })),
  ].sort((left, right) => {
    const leftDate = left.type === "task" ? left.item.dueAt : left.item.startsAt;
    const rightDate = right.type === "task" ? right.item.dueAt : right.item.startsAt;
    return (
      (leftDate?.getTime() ?? 0) - (rightDate?.getTime() ?? 0) ||
      left.item.title.localeCompare(right.item.title)
    );
  });
}

export default function AgendaRows({
  tasks,
  events,
  emptyMessage = "NOTHING SCHEDULED",
}: {
  tasks: ScheduleTask[];
  events: EventOccurrence[];
  emptyMessage?: string;
}) {
  const rows = agendaRows(tasks, events);

  if (rows.length === 0) {
    return <p className="agenda-rows-empty">{emptyMessage}</p>;
  }

  return (
    <ol className="agenda-rows">
      {rows.map((row) => {
        const isTask = row.type === "task";
        const timing = isTask
          ? row.item.dueAt
            ? `DUE ${timeFormatter.format(row.item.dueAt)}`
            : "NO DUE TIME"
          : eventTime(row.item);
        return (
          <li
            aria-label={`${isTask ? "Task" : "Event"}, ${row.item.title}, ${timing}`}
            className={`agenda-row agenda-row-${row.type}`}
            key={`${row.type}-${row.item.id}`}
          >
            <span className="agenda-row-meta">
              {isTask ? "TASK" : "EVENT"} · {timing}
            </span>
            <strong>{row.item.title}</strong>
          </li>
        );
      })}
    </ol>
  );
}
