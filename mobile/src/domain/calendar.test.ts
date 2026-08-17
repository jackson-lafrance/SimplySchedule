import assert from "node:assert/strict";
import test from "node:test";

import {
  addMonths,
  countEventsInMonth,
  eventOccursOnDate,
  eventsForDate,
  getMonthAgenda,
  getMonthDays,
  localDateKey,
  startOfMonth,
  startOfWeek,
  tasksForDate,
  visibleRangeForDay,
  visibleRangeForMonth,
  visibleRangeForWeek,
} from "@/domain/calendar";
import type { EventOccurrence } from "@/domain/events";
import type { ScheduleTask } from "@/domain/tasks";

function occurrence(
  overrides: Partial<EventOccurrence> = {},
): EventOccurrence {
  const startsAt = new Date(2026, 7, 11, 9, 30);
  return {
    id: "event-1",
    eventId: "event-1",
    occurrenceKey: "event-1",
    title: "Planning",
    notes: "",
    color: "mauve",
    startsAt,
    endsAt: new Date(2026, 7, 11, 10, 30),
    allDay: false,
    timeZone: "America/Los_Angeles",
    isRepeating: false,
    ...overrides,
  };
}

test("builds a stable six-week Sunday-first month grid", () => {
  const days = getMonthDays(
    new Date(2026, 7, 18),
    new Date(2026, 7, 11),
  );

  assert.equal(days.length, 42);
  assert.equal(days[0].key, "2026-07-26");
  assert.equal(days[41].key, "2026-09-05");
  assert.equal(days.find((day) => day.key === "2026-08-11")?.isToday, true);
});

test("uses the displayed six-week grid as a half-open visible range", () => {
  const range = visibleRangeForMonth(new Date(2026, 7, 18));

  assert.equal(localDateKey(range.start), "2026-07-26");
  assert.equal(localDateKey(range.end), "2026-09-06");
  assert.equal(range.start.getHours(), 0);
  assert.equal(range.end.getHours(), 0);
});

test("derives day and configurable week ranges", () => {
  const date = new Date(2026, 7, 12, 12);
  const day = visibleRangeForDay(date);
  const mondayWeek = visibleRangeForWeek(date, 1);
  const sundayWeek = visibleRangeForWeek(date, 0);

  assert.equal(localDateKey(day.start), "2026-08-12");
  assert.equal(localDateKey(day.end), "2026-08-13");
  assert.equal(localDateKey(startOfWeek(date, 1)), "2026-08-10");
  assert.equal(localDateKey(mondayWeek.start), "2026-08-10");
  assert.equal(localDateKey(mondayWeek.end), "2026-08-17");
  assert.equal(localDateKey(sundayWeek.start), "2026-08-09");
});

test("month navigation always lands on the first day", () => {
  const january = startOfMonth(new Date(2026, 0, 31, 23));
  const february = addMonths(january, 1);

  assert.equal(localDateKey(january), "2026-01-01");
  assert.equal(localDateKey(february), "2026-02-01");
});

test("includes a timed occurrence on each local day it intersects", () => {
  const event = occurrence({
    startsAt: new Date(2026, 7, 11, 23, 30),
    endsAt: new Date(2026, 7, 12, 0, 30),
  });

  assert.equal(eventOccursOnDate(event, new Date(2026, 7, 11, 12)), true);
  assert.equal(eventOccursOnDate(event, new Date(2026, 7, 12, 12)), true);
  assert.equal(eventOccursOnDate(event, new Date(2026, 7, 13, 12)), false);
});

test("treats an all-day end boundary as exclusive", () => {
  const event = occurrence({
    startsAt: new Date("2026-08-11T07:00:00.000Z"),
    endsAt: new Date("2026-08-13T07:00:00.000Z"),
    allDay: true,
  });

  assert.equal(eventOccursOnDate(event, new Date(2026, 7, 11, 12)), true);
  assert.equal(eventOccursOnDate(event, new Date(2026, 7, 12, 12)), true);
  assert.equal(eventOccursOnDate(event, new Date(2026, 7, 13, 12)), false);
});

test("sorts all-day entries before timed and repeating occurrences", () => {
  const events = [
    occurrence({ id: "timed", eventId: "timed", title: "Timed" }),
    occurrence({
      id: "repeat@2026-08-11",
      eventId: "repeat",
      occurrenceKey: "repeat@2026-08-11",
      title: "Repeating",
      isRepeating: true,
    }),
    occurrence({
      id: "all-day",
      eventId: "all-day",
      title: "All day",
      allDay: true,
      startsAt: new Date("2026-08-11T07:00:00.000Z"),
      endsAt: new Date("2026-08-12T07:00:00.000Z"),
    }),
  ];

  assert.deepEqual(
    eventsForDate(events, new Date(2026, 7, 11, 12)).map((event) => event.id),
    ["all-day", "repeat@2026-08-11", "timed"],
  );
});

test("keeps completed due tasks on their agenda day", () => {
  const createdAt = new Date(2026, 7, 1, 9);
  const task = (
    overrides: Partial<ScheduleTask> = {},
  ): ScheduleTask => ({
    id: "task-1",
    title: "Task",
    notes: "",
    color: "green",
    status: "open",
    parentId: null,
    dueAt: new Date(2026, 7, 11, 11),
    completedAt: null,
    position: 1,
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  });

  assert.deepEqual(
    tasksForDate(
      [
        task(),
        task({ id: "tomorrow", dueAt: new Date(2026, 7, 12, 9) }),
        task({ id: "done", status: "completed" }),
      ],
      new Date(2026, 7, 11, 12),
    ).map((item) => item.id),
    ["task-1", "done"],
  );
});

test("projects populated occurrences into the selected month agenda", () => {
  const events = [
    occurrence(),
    occurrence({
      id: "later",
      eventId: "later",
      startsAt: new Date(2026, 7, 14, 15),
      endsAt: null,
    }),
  ];
  const agenda = getMonthAgenda(
    new Date(2026, 7, 1),
    events,
    new Date(2026, 7, 11),
  );

  assert.deepEqual(
    agenda.map((day) => day.day.key),
    ["2026-08-11", "2026-08-14"],
  );
  assert.equal(countEventsInMonth(new Date(2026, 7, 1), events), 2);
});
