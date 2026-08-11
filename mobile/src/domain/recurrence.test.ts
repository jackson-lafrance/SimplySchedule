import assert from "node:assert/strict";
import test from "node:test";

import type {
  CalendarEvent,
  RecurrenceRule,
  RepeatingEvent,
} from "@/domain/events";
import {
  expandEventInRange,
  expandEventsInRange,
  MAX_OCCURRENCES_PER_EXPANSION,
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

test("expands first-of-month only inside the requested range", () => {
  const event = repeating(rule({ frequency: "monthly", dayOfMonth: 1 }));

  assert.deepEqual(
    isoStarts(event, "2026-01-15T00:00:00.000Z", "2026-04-02T00:00:00.000Z"),
    [
      "2026-02-01T09:00:00.000Z",
      "2026-03-01T09:00:00.000Z",
      "2026-04-01T09:00:00.000Z",
    ],
  );
});

test("calculates the third Friday of each month", () => {
  const event = repeating(
    rule({
      frequency: "monthly",
      daysOfWeek: [5],
      weekOfMonth: 3,
    }),
    { startsAt: new Date("2026-01-16T09:00:00.000Z") },
  );

  assert.deepEqual(
    isoStarts(event, "2026-01-01T00:00:00.000Z", "2026-04-01T00:00:00.000Z"),
    [
      "2026-01-16T09:00:00.000Z",
      "2026-02-20T09:00:00.000Z",
      "2026-03-20T09:00:00.000Z",
    ],
  );
});

for (const [interval, days] of [
  [2, [7, 9, 11, 13]],
  [3, [7, 10, 13]],
] as const) {
  test(`expands every ${interval} days in event-zone wall time across DST`, () => {
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
        {
          year: 2026,
          month: 3,
          day: 7,
          hour: 0,
          minute: 0,
          second: 0,
          millisecond: 0,
        },
        timeZone,
      ),
      end: zonedDateTimeToDate(
        {
          year: 2026,
          month: 3,
          day: 15,
          hour: 0,
          minute: 0,
          second: 0,
          millisecond: 0,
        },
        timeZone,
      ),
    });

    assert.deepEqual(
      occurrences.map((item) => zonedDateTimeParts(item.startsAt, timeZone).day),
      days,
    );
    assert.deepEqual(
      occurrences.map(
        (item) => zonedDateTimeParts(item.startsAt, timeZone).hour,
      ),
      days.map(() => 9),
    );
  });
}

test("expands every five hours as elapsed-hour intervals", () => {
  const event = repeating(rule({ frequency: "hourly", interval: 5 }), {
    startsAt: new Date("2026-08-11T00:00:00.000Z"),
    endsAt: new Date("2026-08-11T01:00:00.000Z"),
  });

  assert.deepEqual(
    isoStarts(event, "2026-08-11T09:30:00.000Z", "2026-08-11T21:00:00.000Z"),
    [
      "2026-08-11T10:00:00.000Z",
      "2026-08-11T15:00:00.000Z",
      "2026-08-11T20:00:00.000Z",
    ],
  );
});

test("honors occurrence count and inclusive through-date termination", () => {
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

  assert.equal(
    isoStarts(counted, "2026-01-01T00:00:00.000Z", "2026-02-01T00:00:00.000Z")
      .length,
    3,
  );
  assert.deepEqual(
    isoStarts(through, "2026-01-01T00:00:00.000Z", "2026-02-01T00:00:00.000Z"),
    [
      "2026-01-01T09:00:00.000Z",
      "2026-01-03T09:00:00.000Z",
      "2026-01-05T09:00:00.000Z",
    ],
  );
});

test("skips missing monthly numeric dates instead of clamping", () => {
  const event = repeating(
    rule({ frequency: "monthly", dayOfMonth: 31 }),
    { startsAt: new Date("2026-01-31T09:00:00.000Z") },
  );

  assert.deepEqual(
    isoStarts(event, "2026-02-01T00:00:00.000Z", "2026-05-01T00:00:00.000Z"),
    ["2026-03-31T09:00:00.000Z"],
  );
});

test("caps expansion and emits stable series occurrence keys", () => {
  const event = repeating(rule({ frequency: "hourly", interval: 1 }));
  const range = {
    start: new Date("2026-01-01T00:00:00.000Z"),
    end: new Date("2027-01-01T00:00:00.000Z"),
  };
  const first = expandEventInRange(event, range, 3);
  const second = expandEventInRange(event, range, 3);

  assert.equal(first.length, 3);
  assert.deepEqual(
    first.map((item) => item.occurrenceKey),
    second.map((item) => item.occurrenceKey),
  );
  assert.equal(new Set(first.map((item) => item.id)).size, 3);
  assert.match(first[0].id, /^series-1@\d{4}-\d{2}-\d{2}T/);
});

test("caps the combined visible projection at 2,000 occurrences", () => {
  const events = [
    repeating(rule({ frequency: "hourly", interval: 1 })),
    repeating(rule({ frequency: "hourly", interval: 1 }), { id: "series-2" }),
  ];
  const occurrences = expandEventsInRange(events, {
    start: new Date("2026-01-01T00:00:00.000Z"),
    end: new Date("2027-01-01T00:00:00.000Z"),
  });

  assert.equal(occurrences.length, MAX_OCCURRENCES_PER_EXPANSION);
});

test("includes a single duration event overlapping a visible boundary", () => {
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

  assert.deepEqual(
    occurrences.map((item) => item.eventId),
    ["overnight"],
  );
});
