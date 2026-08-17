import type { SingleEvent } from "@/domain/events";
import {
  DEFAULT_EVENT_COLOR,
  type ScheduleColor,
} from "@/domain/scheduleColors";

function deviceTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function onRelativeDay(
  anchor: Date,
  dayOffset: number,
  hours: number,
  minutes = 0,
) {
  return new Date(
    anchor.getFullYear(),
    anchor.getMonth(),
    anchor.getDate() + dayOffset,
    hours,
    minutes,
  );
}

export function createDemoEvents(anchor = new Date()): SingleEvent[] {
  const timeZone = deviceTimeZone();
  const createdAt = onRelativeDay(anchor, -7, 10);
  const colors: ScheduleColor[] = [
    DEFAULT_EVENT_COLOR,
    "blue",
    "teal",
    "peach",
  ];

  return [
    {
      id: "preview-weekly-plan",
      title: "Weekly plan",
      notes: "Set priorities for the week.",
      color: colors[0],
      kind: "single",
      startsAt: onRelativeDay(anchor, 0, 9, 30),
      endsAt: onRelativeDay(anchor, 0, 10, 15),
      allDay: false,
      timeZone,
      recurrence: null,
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: "preview-design-review",
      title: "Design review",
      notes: "Calendar viewing pass.",
      color: colors[1],
      kind: "single",
      startsAt: onRelativeDay(anchor, 0, 13),
      endsAt: onRelativeDay(anchor, 0, 14),
      allDay: false,
      timeZone,
      recurrence: null,
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: "preview-focus-day",
      title: "Focus day",
      notes: "Keep the day clear for deep work.",
      color: colors[2],
      kind: "single",
      startsAt: onRelativeDay(anchor, 1, 0),
      endsAt: onRelativeDay(anchor, 2, 0),
      allDay: true,
      timeZone,
      recurrence: null,
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: "preview-project-check-in",
      title: "Project check-in",
      notes: "Review open decisions.",
      color: colors[3],
      kind: "single",
      startsAt: onRelativeDay(anchor, 4, 16),
      endsAt: onRelativeDay(anchor, 4, 16, 30),
      allDay: false,
      timeZone,
      recurrence: null,
      createdAt,
      updatedAt: createdAt,
    },
  ];
}
