import { describe, expect, it } from "vitest";

import type {
  CalendarEvent,
  RecurrenceRule,
  RepeatingEvent,
} from "@/domain/events";
import {
  expandEventInRange,
  expandEventsInRange,
  zonedDateTimeParts,
  zonedDateTimeToDate,
} from "@/domain/recurrence";

function rule(overrides: Partial<RecurrenceRule>): RecurrenceRule {
  return {
    version: 1,
    frequency: "daily",
    interval: 1,
    daysOfWeek: null,
    dayOfMonth: null,
    weekOfMonth: null,
    monthOfYear: null,
    termination: { type: "never", until: null, count: null },
    ...overrides,
  };
}

function repeating(
  recurrence: RecurrenceRule,
  overrides: Partial<RepeatingEvent> = {},
): RepeatingEvent {
  const defaultStart = new Date("2026-01-01T09:00:00.000Z");
  const startsAt = overrides.startsAt ?? defaultStart;
  return {
    id: "series-1",
    title: "Recurring focus",
    notes: "",
    kind: "repeating",
    startsAt,
    endsAt:
      overrides.endsAt ?? new Date(startsAt.getTime() + 60 * 60 * 1_000),
    allDay: false,
    timeZone: "UTC",
    recurrence,
    createdAt: startsAt,
    updatedAt: startsAt,
    ...overrides,
  };
}

function isoStarts(event: RepeatingEvent, start: string, end: string) {
  return expandEventInRange(event, {
    start: new Date(start),
    end: new Date(end),
  }).map((occurrence) => occurrence.startsAt.toISOString());
}

describe("bounded recurrence expansion", () => {
  it("expands the first of the month only inside the requested range", () => {
    const event = repeating(
      rule({ frequency: "monthly", dayOfMonth: 1 }),
    );

    expect(
      isoStarts(event, "2026-01-15T00:00:00.000Z", "2026-04-02T00:00:00.000Z"),
    ).toEqual([
      "2026-02-01T09:00:00.000Z",
      "2026-03-01T09:00:00.000Z",
      "2026-04-01T09:00:00.000Z",
    ]);
  });

  it("calculates the third Friday of each month", () => {
    const event = repeating(
      rule({
        frequency: "monthly",
        daysOfWeek: [5],
        weekOfMonth: 3,
      }),
      { startsAt: new Date("2026-01-16T09:00:00.000Z") },
    );

    expect(
      isoStarts(event, "2026-01-01T00:00:00.000Z", "2026-04-01T00:00:00.000Z"),
    ).toEqual([
      "2026-01-16T09:00:00.000Z",
      "2026-02-20T09:00:00.000Z",
      "2026-03-20T09:00:00.000Z",
    ]);
  });

  it.each([
    [2, [7, 9, 11, 13]],
    [3, [7, 10, 13]],
  ])("expands every %i days in event-zone calendar time", (interval, days) => {
    const timeZone = "America/Los_Angeles";
    const startsAt = zonedDateTimeToDate(
      {
        year: 2026,
        month: 3,
        day: 7,
        hour: 9,
        minute: 0,
        second: 0,
        millisecond: 0,
      },
      timeZone,
    );
    const event = repeating(rule({ interval }), {
      startsAt,
      endsAt: new Date(startsAt.getTime() + 60 * 60 * 1_000),
      timeZone,
    });
    const occurrences = expandEventInRange(event, {
      start: zonedDateTimeToDate(
        { year: 2026, month: 3, day: 7, hour: 0, minute: 0, second: 0, millisecond: 0 },
        timeZone,
      ),
      end: zonedDateTimeToDate(
        { year: 2026, month: 3, day: 15, hour: 0, minute: 0, second: 0, millisecond: 0 },
        timeZone,
      ),
    });

    expect(occurrences.map((item) => zonedDateTimeParts(item.startsAt, timeZone).day)).toEqual(days);
    expect(occurrences.map((item) => zonedDateTimeParts(item.startsAt, timeZone).hour)).toEqual(
      days.map(() => 9),
    );
  });

  it("expands every five hours as elapsed hourly intervals", () => {
    const event = repeating(rule({ frequency: "hourly", interval: 5 }), {
      startsAt: new Date("2026-08-11T00:00:00.000Z"),
      endsAt: new Date("2026-08-11T01:00:00.000Z"),
    });

    expect(
      isoStarts(event, "2026-08-11T09:30:00.000Z", "2026-08-11T21:00:00.000Z"),
    ).toEqual([
      "2026-08-11T10:00:00.000Z",
      "2026-08-11T15:00:00.000Z",
      "2026-08-11T20:00:00.000Z",
    ]);
  });

  it("honors count and inclusive-until termination", () => {
    const counted = repeating(
      rule({
        interval: 2,
        termination: { type: "afterOccurrences", until: null, count: 3 },
      }),
    );
    const through = repeating(
      rule({
        interval: 2,
        termination: {
          type: "onDate",
          until: new Date("2026-01-05T09:00:00.000Z"),
          count: null,
        },
      }),
      { id: "series-2" },
    );

    expect(isoStarts(counted, "2026-01-01T00:00:00.000Z", "2026-02-01T00:00:00.000Z")).toHaveLength(3);
    expect(isoStarts(through, "2026-01-01T00:00:00.000Z", "2026-02-01T00:00:00.000Z")).toEqual([
      "2026-01-01T09:00:00.000Z",
      "2026-01-03T09:00:00.000Z",
      "2026-01-05T09:00:00.000Z",
    ]);
  });

  it("caps output and gives every calculated occurrence a stable series key", () => {
    const event = repeating(rule({ frequency: "hourly", interval: 1 }));
    const range = {
      start: new Date("2026-01-01T00:00:00.000Z"),
      end: new Date("2027-01-01T00:00:00.000Z"),
    };
    const first = expandEventInRange(event, range, 3);
    const second = expandEventInRange(event, range, 3);

    expect(first).toHaveLength(3);
    expect(first.map((item) => item.occurrenceKey)).toEqual(
      second.map((item) => item.occurrenceKey),
    );
    expect(new Set(first.map((item) => item.id)).size).toBe(3);
  });

  it("includes a single event that overlaps the visible range boundary", () => {
    const startsAt = new Date("2026-07-31T23:30:00.000Z");
    const single: CalendarEvent = {
      id: "overnight",
      title: "Overnight release",
      notes: "",
      kind: "single",
      startsAt,
      endsAt: new Date("2026-08-01T00:30:00.000Z"),
      allDay: false,
      timeZone: "UTC",
      recurrence: null,
      createdAt: startsAt,
      updatedAt: startsAt,
    };

    const occurrences = expandEventsInRange([single], {
      start: new Date("2026-08-01T00:00:00.000Z"),
      end: new Date("2026-09-01T00:00:00.000Z"),
    });

    expect(occurrences.map((item) => item.eventId)).toEqual(["overnight"]);
  });
});
