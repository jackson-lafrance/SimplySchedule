import assert from "node:assert/strict";
import test from "node:test";

import {
  alignDateForRecurrence,
  createEventInputFromDraft,
  recurrenceDraftSummary,
  type EventDraft,
} from "@/domain/eventForm";
import type { RecurrenceRule } from "@/domain/events";
import { zonedDateTimeParts } from "@/domain/recurrence";

function draft(overrides: Partial<EventDraft> = {}): EventDraft {
  return {
    title: "  Release check  ",
    notes: "Bring the launch notes.",
    date: "2026-08-11",
    startTime: "09:00",
    endTime: "10:00",
    allDay: false,
    recurrenceEnabled: false,
    frequency: "weekly",
    interval: "1",
    weekdays: [2],
    calendarSelectorMode: "dayOfMonth",
    dayOfMonth: "11",
    weekOfMonth: 1,
    ordinalWeekday: 2,
    monthOfYear: "8",
    terminationType: "never",
    untilDate: "2026-12-31",
    occurrenceCount: "10",
    ...overrides,
  };
}

function repeating(overrides: Partial<EventDraft>) {
  const input = createEventInputFromDraft(
    draft({ recurrenceEnabled: true, ...overrides }),
    "UTC",
  );
  assert.equal(input.kind, "repeating");
  if (input.kind !== "repeating") throw new Error("Expected repeating event");
  return input;
}

test("keeps ordinary event creation fast and canonical", () => {
  const input = createEventInputFromDraft(draft(), "UTC");

  assert.equal(input.kind, "single");
  assert.equal(input.title, "Release check");
  assert.equal(input.startsAt.toISOString(), "2026-08-11T09:00:00.000Z");
  assert.equal(input.endsAt?.toISOString(), "2026-08-11T10:00:00.000Z");
  assert.equal(input.recurrence, null);
});

for (const [frequency, interval] of [
  ["daily", "2"],
  ["daily", "3"],
  ["hourly", "5"],
] as const) {
  test(`encodes an arbitrary every-${interval}-${frequency} interval`, () => {
    const input = repeating({ frequency, interval });

    assert.equal(input.recurrence.frequency, frequency);
    assert.equal(input.recurrence.interval, Number(interval));
    assert.equal(input.recurrence.daysOfWeek, null);
    assert.equal(input.recurrence.dayOfMonth, null);
  });
}

test("supports weekday combinations and aligns the series seed", () => {
  const input = repeating({
    frequency: "weekly",
    interval: "2",
    weekdays: [1, 5],
  });

  assert.deepEqual(input.recurrence.daysOfWeek, [1, 5]);
  assert.equal(input.recurrence.interval, 2);
  assert.equal(input.startsAt.toISOString(), "2026-08-14T09:00:00.000Z");
});

test("supports numeric month days and skips to the next valid seed", () => {
  const first = repeating({
    frequency: "monthly",
    calendarSelectorMode: "dayOfMonth",
    dayOfMonth: "1",
  });
  const thirtyFirst = repeating({
    date: "2026-04-15",
    frequency: "monthly",
    calendarSelectorMode: "dayOfMonth",
    dayOfMonth: "31",
  });

  assert.equal(first.startsAt.toISOString(), "2026-09-01T09:00:00.000Z");
  assert.equal(first.recurrence.dayOfMonth, 1);
  assert.equal(thirtyFirst.startsAt.toISOString(), "2026-05-31T09:00:00.000Z");
});

test("supports first and third Friday ordinal-month rules", () => {
  const firstFriday = repeating({
    date: "2026-08-22",
    frequency: "monthly",
    calendarSelectorMode: "ordinalWeekday",
    weekOfMonth: 1,
    ordinalWeekday: 5,
  });
  const thirdFriday = repeating({
    frequency: "monthly",
    calendarSelectorMode: "ordinalWeekday",
    weekOfMonth: 3,
    ordinalWeekday: 5,
  });

  assert.equal(firstFriday.startsAt.toISOString(), "2026-09-04T09:00:00.000Z");
  assert.equal(thirdFriday.startsAt.toISOString(), "2026-08-21T09:00:00.000Z");
  assert.deepEqual(thirdFriday.recurrence.daysOfWeek, [5]);
  assert.equal(thirdFriday.recurrence.weekOfMonth, 3);
});

test("supports yearly numeric and ordinal selectors", () => {
  const yearlyDate = repeating({
    frequency: "yearly",
    calendarSelectorMode: "dayOfMonth",
    monthOfYear: "1",
    dayOfMonth: "15",
  });
  const yearlyOrdinal = repeating({
    frequency: "yearly",
    calendarSelectorMode: "ordinalWeekday",
    monthOfYear: "11",
    weekOfMonth: 1,
    ordinalWeekday: 5,
  });

  assert.equal(yearlyDate.startsAt.toISOString(), "2027-01-15T09:00:00.000Z");
  assert.equal(yearlyDate.recurrence.monthOfYear, 1);
  assert.equal(yearlyOrdinal.startsAt.toISOString(), "2026-11-06T09:00:00.000Z");
});

test("stores all-day boundaries in local wall time across DST", () => {
  const input = createEventInputFromDraft(
    draft({ date: "2026-03-08", allDay: true }),
    "America/Los_Angeles",
  );
  assert.ok(input.endsAt);

  assert.deepEqual(
    {
      day: zonedDateTimeParts(input.startsAt, input.timeZone).day,
      hour: zonedDateTimeParts(input.startsAt, input.timeZone).hour,
    },
    { day: 8, hour: 0 },
  );
  assert.deepEqual(
    {
      day: zonedDateTimeParts(input.endsAt, input.timeZone).day,
      hour: zonedDateTimeParts(input.endsAt, input.timeZone).hour,
    },
    { day: 9, hour: 0 },
  );
  assert.equal(
    input.endsAt.getTime() - input.startsAt.getTime(),
    23 * 60 * 60 * 1_000,
  );
});

test("supports inclusive through-date and bounded occurrence count", () => {
  const through = repeating({
    frequency: "daily",
    interval: "2",
    terminationType: "onDate",
    untilDate: "2026-08-15",
  });
  const counted = repeating({
    frequency: "daily",
    interval: "3",
    terminationType: "afterOccurrences",
    occurrenceCount: "7",
  });

  assert.equal(
    through.recurrence.termination.until?.toISOString(),
    "2026-08-15T23:59:59.999Z",
  );
  assert.equal(counted.recurrence.termination.count, 7);
});

test("summarizes flexible recurrence without hiding its cadence", () => {
  assert.equal(
    recurrenceDraftSummary(
      draft({
        recurrenceEnabled: true,
        frequency: "weekly",
        interval: "2",
        weekdays: [1, 3, 5],
      }),
    ),
    "EVERY 2 WEEKS · MON, WED, FRI",
  );
});

test("align helper preserves the canonical first-occurrence invariant", () => {
  const rule: RecurrenceRule = {
    version: 1,
    frequency: "monthly",
    interval: 1,
    daysOfWeek: [5],
    dayOfMonth: null,
    weekOfMonth: 1,
    monthOfYear: null,
    termination: { type: "never", until: null, count: null },
  };

  assert.deepEqual(
    alignDateForRecurrence({ year: 2026, month: 8, day: 22 }, rule),
    { year: 2026, month: 9, day: 4 },
  );
});

test("rejects malformed core and advanced recurrence fields", () => {
  assert.throws(
    () => createEventInputFromDraft(draft({ title: "   " }), "UTC"),
    /ADD AN EVENT TITLE/,
  );
  assert.throws(
    () =>
      createEventInputFromDraft(
        draft({ startTime: "10:00", endTime: "09:00" }),
        "UTC",
      ),
    /END TIME MUST BE AFTER START TIME/,
  );
  assert.throws(
    () => repeating({ frequency: "weekly", weekdays: [] }),
    /CHOOSE AT LEAST ONE WEEKDAY/,
  );
  assert.throws(
    () => repeating({ interval: "100" }),
    /INTERVAL MUST BE A WHOLE NUMBER/,
  );
  assert.throws(
    () =>
      repeating({
        terminationType: "afterOccurrences",
        occurrenceCount: "0",
      }),
    /OCCURRENCES MUST BE A WHOLE NUMBER/,
  );
  assert.throws(
    () => createEventInputFromDraft(draft({ date: "2026-02-30" }), "UTC"),
    /VALID EVENT DATE/,
  );
});
