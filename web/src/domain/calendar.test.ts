import { describe, expect, it } from "vitest";

import {
  addDays,
  addMonths,
  eventOccursOnDate,
  eventsForDate,
  getMonthAgenda,
  getMonthDays,
  localDateKey,
  startOfWeek,
  tasksForDate,
  visibleRangeForDay,
  visibleRangeForDays,
  visibleRangeForMonth,
  visibleRangeForWeek,
} from "@/domain/calendar";
import type { EventOccurrence } from "@/domain/events";
import type { ScheduleTask } from "@/domain/tasks";

function occurrence(
  overrides: Partial<EventOccurrence> = {},
): EventOccurrence {
  return {
    id: "event-1",
    eventId: "event-1",
    occurrenceKey: "event-1",
    title: "Design review",
    notes: "",
    startsAt: new Date(2026, 7, 11, 13),
    endsAt: new Date(2026, 7, 11, 14),
    allDay: false,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    isRepeating: false,
    ...overrides,
  };
}

describe("calendar month navigation", () => {
  it("builds a stable six-week Sunday-first month grid", () => {
    const days = getMonthDays(
      new Date(2026, 7, 1, 12),
      new Date(2026, 7, 11, 12),
    );

    expect(days).toHaveLength(42);
    expect(days[0].key).toBe("2026-07-26");
    expect(days[41].key).toBe("2026-09-05");
    expect(days.find((day) => day.isToday)?.key).toBe("2026-08-11");
  });

  it("moves cleanly across year boundaries", () => {
    const next = addMonths(new Date(2026, 11, 1, 12), 1);
    const previous = addMonths(new Date(2026, 0, 1, 12), -1);

    expect(localDateKey(next)).toBe("2027-01-01");
    expect(localDateKey(previous)).toBe("2025-12-01");
  });

  it("uses the entire six-week grid as its half-open month range", () => {
    const range = visibleRangeForMonth(new Date(2026, 7, 1, 12));

    expect(localDateKey(range.start)).toBe("2026-07-26");
    expect(localDateKey(new Date(range.end.getTime() - 1))).toBe("2026-09-05");
  });

  it("creates half-open multi-day, day, and configurable week ranges", () => {
    const date = new Date(2026, 7, 11, 12);
    const home = visibleRangeForDays(date, 8);
    const day = visibleRangeForDay(date);
    const week = visibleRangeForWeek(date);
    const mondayFirstWeek = visibleRangeForWeek(date, 1);

    expect(localDateKey(home.start)).toBe("2026-08-11");
    expect(localDateKey(home.end)).toBe("2026-08-19");
    expect(localDateKey(day.start)).toBe("2026-08-11");
    expect(localDateKey(day.end)).toBe("2026-08-12");
    expect(localDateKey(startOfWeek(date))).toBe("2026-08-09");
    expect(localDateKey(week.start)).toBe("2026-08-09");
    expect(localDateKey(week.end)).toBe("2026-08-16");
    expect(localDateKey(mondayFirstWeek.start)).toBe("2026-08-10");
    expect(localDateKey(mondayFirstWeek.end)).toBe("2026-08-17");
    expect(localDateKey(addDays(date, 3))).toBe("2026-08-14");
  });
});

describe("event calendar projection", () => {
  it("keeps completed tasks in their due-date position", () => {
    const dueAt = new Date(2026, 7, 11, 11);
    const task = (overrides: Partial<ScheduleTask>): ScheduleTask => ({
      id: "task-1",
      title: "Send agenda",
      notes: "",
      status: "open",
      parentId: null,
      dueAt,
      completedAt: null,
      position: 1,
      createdAt: dueAt,
      updatedAt: dueAt,
      ...overrides,
    });

    expect(
      tasksForDate(
        [
          task({ id: "later", title: "Later", dueAt: new Date(2026, 7, 11, 15) }),
          task({ id: "completed", status: "completed" }),
          task({ id: "earlier", title: "Earlier", dueAt: new Date(2026, 7, 11, 9) }),
          task({ id: "tomorrow", dueAt: new Date(2026, 7, 12, 9) }),
        ],
        new Date(2026, 7, 11, 12),
      ).map(({ id }) => id),
    ).toEqual(["earlier", "completed", "later"]);
  });

  it("shows a timed event on each local day it overlaps", () => {
    const event = occurrence({
      startsAt: new Date(2026, 7, 11, 23, 30),
      endsAt: new Date(2026, 7, 12, 0, 30),
    });

    expect(eventOccursOnDate(event, new Date(2026, 7, 11, 12))).toBe(true);
    expect(eventOccursOnDate(event, new Date(2026, 7, 12, 12))).toBe(true);
    expect(eventOccursOnDate(event, new Date(2026, 7, 13, 12))).toBe(false);
  });

  it("treats all-day ends as exclusive date boundaries", () => {
    const event = occurrence({
      startsAt: new Date(Date.UTC(2026, 7, 12)),
      endsAt: new Date(Date.UTC(2026, 7, 14)),
      allDay: true,
      timeZone: "UTC",
    });

    expect(eventOccursOnDate(event, new Date(2026, 7, 12, 12))).toBe(true);
    expect(eventOccursOnDate(event, new Date(2026, 7, 13, 12))).toBe(true);
    expect(eventOccursOnDate(event, new Date(2026, 7, 14, 12))).toBe(false);
  });

  it("sorts all-day entries before timed entries and then by start", () => {
    const timedLater = occurrence({ id: "later", startsAt: new Date(2026, 7, 11, 15) });
    const timedEarlier = occurrence({ id: "earlier", startsAt: new Date(2026, 7, 11, 9) });
    const allDay = occurrence({
      id: "all-day",
      allDay: true,
      startsAt: new Date(2026, 7, 11),
      endsAt: new Date(2026, 7, 12),
    });

    expect(
      eventsForDate(
        [timedLater, timedEarlier, allDay],
        new Date(2026, 7, 11, 12),
      ).map((event) => event.id),
    ).toEqual(["all-day", "earlier", "later"]);
  });

  it("groups only populated days in the monthly agenda", () => {
    const agenda = getMonthAgenda(
      new Date(2026, 7, 1, 12),
      [occurrence()],
      new Date(2026, 7, 11, 12),
    );

    expect(agenda).toHaveLength(1);
    expect(agenda[0].day.key).toBe("2026-08-11");
    expect(agenda[0].events[0].title).toBe("Design review");
  });
});
