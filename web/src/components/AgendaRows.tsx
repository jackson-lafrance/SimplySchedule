import { useState, type CSSProperties } from "react";

import {
  DEFAULT_EVENT_COLOR,
  DEFAULT_TASK_COLOR,
  scheduleColorValue,
} from "@/domain/colors";
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
  if (event.allDay) return "ALL DAY";
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
  onCompleteTask,
}: {
  tasks: ScheduleTask[];
  events: EventOccurrence[];
  onCompleteTask?: (taskId: string) => Promise<void>;
}) {
  const rows = agendaRows(tasks, events);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [completionError, setCompletionError] = useState<string | null>(null);

  if (rows.length === 0) {
    return <div className="agenda-rows-empty" aria-hidden="true" />;
  }

  const complete = async (task: ScheduleTask) => {
    if (!onCompleteTask || completingId) return;
    setCompletionError(null);
    setCompletingId(task.id);
    try {
      await onCompleteTask(task.id);
    } catch (error) {
      console.error("Could not complete task", error);
      setCompletionError("THE TASK COULD NOT BE COMPLETED. TRY AGAIN.");
    } finally {
      setCompletingId(null);
    }
  };

  return (
    <>
      <ol className="agenda-rows">
        {rows.map((row) => {
          const isTask = row.type === "task";
          const timing = isTask
            ? row.item.dueAt
              ? `DUE ${timeFormatter.format(row.item.dueAt)}`
              : "NO DUE TIME"
            : eventTime(row.item);
          const palette = scheduleColorValue(
            row.item.color,
            isTask ? DEFAULT_TASK_COLOR : DEFAULT_EVENT_COLOR,
          );
          const style = {
            "--row-color": palette.value,
            "--row-text": palette.text,
          } as CSSProperties;

          return (
            <li
              aria-label={`${isTask ? "Task" : "Event"}, ${row.item.title}, ${timing}`}
              className={`agenda-row agenda-row-${row.type}`}
              key={`${row.type}-${row.item.id}`}
              style={style}
            >
              {isTask && onCompleteTask ? (
                <button
                  aria-label={`Mark ${row.item.title} complete`}
                  className="task-check"
                  disabled={completingId !== null}
                  onClick={() => void complete(row.item)}
                  type="button"
                >
                  <span aria-hidden="true">✓</span>
                </button>
              ) : null}
              <span className="agenda-row-copy">
                <span className="agenda-row-meta">{timing}</span>
                <strong>{row.item.title}</strong>
              </span>
            </li>
          );
        })}
      </ol>
      {completionError ? (
        <p className="agenda-action-error" role="alert">{completionError}</p>
      ) : null}
    </>
  );
}
