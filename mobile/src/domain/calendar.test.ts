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
} from "@/domain/calendar";
import type { CalendarEvent, SingleEvent } from "@/domain/events";

function singleEvent(overrides: Partial<SingleEvent> = {}): SingleEvent {
  const startsAt = new Date(2026, 7, 11, 9, 30);
  return {
    id: "event-1",
    title: "Planning",
    notes: "",
    kind: "single",
    startsAt,
    endsAt: new Date(2026, 7, 11, 10, 30),
    allDay: false,
    timeZone: "America/Los_Angeles",
    recurrence: null,
    createdAt: startsAt,
    updatedAt: startsAt,
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

test("month navigation always lands on the first day", () => {
  const january = startOfMonth(new Date(2026, 0, 31, 23));
  const february = addMonths(january, 1);

  assert.equal(localDateKey(january), "2026-01-01");
  assert.equal(localDateKey(february), "2026-02-01");
});

test("includes a timed event on each local day it intersects", () => {
  const event = singleEvent({
    startsAt: new Date(2026, 7, 11, 23, 30),
    endsAt: new Date(2026, 7, 12, 0, 30),
  });

  assert.equal(eventOccursOnDate(event, new Date(2026, 7, 11, 12)), true);
  assert.equal(eventOccursOnDate(event, new Date(2026, 7, 12, 12)), true);
  assert.equal(eventOccursOnDate(event, new Date(2026, 7, 13, 12)), false);
});

test("treats an all-day end boundary as exclusive", () => {
  const event = singleEvent({
    startsAt: new Date("2026-08-11T07:00:00.000Z"),
    endsAt: new Date("2026-08-13T07:00:00.000Z"),
    allDay: true,
  });

  assert.equal(eventOccursOnDate(event, new Date(2026, 7, 11, 12)), true);
  assert.equal(eventOccursOnDate(event, new Date(2026, 7, 12, 12)), true);
  assert.equal(eventOccursOnDate(event, new Date(2026, 7, 13, 12)), false);
});

test("keeps repeating series out until bounded expansion is implemented", () => {
  const seed = singleEvent();
  const events: CalendarEvent[] = [
    {
      ...seed,
      kind: "repeating",
      recurrence: {
        version: 1,
        frequency: "daily",
        interval: 2,
        daysOfWeek: null,
        dayOfMonth: null,
        weekOfMonth: null,
        monthOfYear: null,
        termination: { type: "never", until: null, count: null },
      },
    },
  ];

  assert.deepEqual(eventsForDate(events, new Date(2026, 7, 11, 12)), []);
});

test("sorts all-day entries before timed entries", () => {
  const events = [
    singleEvent({ id: "timed", title: "Timed" }),
    singleEvent({
      id: "all-day",
      title: "All day",
      allDay: true,
      startsAt: new Date("2026-08-11T07:00:00.000Z"),
      endsAt: new Date("2026-08-12T07:00:00.000Z"),
    }),
  ];

  assert.deepEqual(
    eventsForDate(events, new Date(2026, 7, 11, 12)).map((event) => event.id),
    ["all-day", "timed"],
  );
});

test("projects populated days into the selected month agenda", () => {
  const events = [
    singleEvent(),
    singleEvent({
      id: "later",
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
