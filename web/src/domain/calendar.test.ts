import { describe, expect, it } from "vitest";

import {
  addMonths,
  eventOccursOnDate,
  eventsForDate,
  getMonthAgenda,
  getMonthDays,
  localDateKey,
} from "@/domain/calendar";
import type { CalendarEvent, SingleEvent } from "@/domain/events";

function singleEvent(overrides: Partial<SingleEvent> = {}): SingleEvent {
  const createdAt = new Date(2026, 7, 1, 9);

  return {
    id: "event-1",
    title: "Design review",
    notes: "",
    kind: "single",
    startsAt: new Date(2026, 7, 11, 13),
    endsAt: new Date(2026, 7, 11, 14),
    allDay: false,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    recurrence: null,
    createdAt,
    updatedAt: createdAt,
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
});

describe("event calendar projection", () => {
  it("shows a timed event on each local day it overlaps", () => {
    const event = singleEvent({
      startsAt: new Date(2026, 7, 11, 23, 30),
      endsAt: new Date(2026, 7, 12, 0, 30),
    });

    expect(eventOccursOnDate(event, new Date(2026, 7, 11, 12))).toBe(true);
    expect(eventOccursOnDate(event, new Date(2026, 7, 12, 12))).toBe(true);
    expect(eventOccursOnDate(event, new Date(2026, 7, 13, 12))).toBe(false);
  });

  it("treats all-day ends as exclusive date boundaries", () => {
    const event = singleEvent({
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
    const timedLater = singleEvent({ id: "later", startsAt: new Date(2026, 7, 11, 15) });
    const timedEarlier = singleEvent({ id: "earlier", startsAt: new Date(2026, 7, 11, 9) });
    const allDay = singleEvent({
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

  it("does not misrepresent an unexpanded repeating series as one event", () => {
    const repeating: CalendarEvent = {
      ...singleEvent(),
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
    };

    expect(
      eventsForDate([repeating], new Date(2026, 7, 11, 12)),
    ).toEqual([]);
  });

  it("groups only populated days in the monthly agenda", () => {
    const agenda = getMonthAgenda(
      new Date(2026, 7, 1, 12),
      [singleEvent()],
      new Date(2026, 7, 11, 12),
    );

    expect(agenda).toHaveLength(1);
    expect(agenda[0].day.key).toBe("2026-08-11");
    expect(agenda[0].events[0].title).toBe("Design review");
  });
});
