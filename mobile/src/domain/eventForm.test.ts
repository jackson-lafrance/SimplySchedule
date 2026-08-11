import assert from "node:assert/strict";
import test from "node:test";

import {
  alignDateKeyForPreset,
  createEventInputFromDraft,
  type EventDraft,
  type RecurrencePreset,
} from "@/domain/eventForm";
import { zonedDateTimeParts } from "@/domain/recurrence";

function draft(overrides: Partial<EventDraft> = {}): EventDraft {
  return {
    title: "  Release check  ",
    notes: "Bring the launch notes.",
    date: "2026-08-11",
    startTime: "09:00",
    endTime: "10:00",
    allDay: false,
    recurrencePreset: "none",
    terminationType: "never",
    untilDate: "2026-12-31",
    occurrenceCount: "10",
    ...overrides,
  };
}

const recurrenceCases: [
  RecurrencePreset,
  string,
  number,
  Record<string, unknown>,
][] = [
  ["firstOfMonth", "monthly", 1, { dayOfMonth: 1 }],
  ["thirdFriday", "monthly", 1, { daysOfWeek: [5], weekOfMonth: 3 }],
  ["everyOtherDay", "daily", 2, {}],
  ["everyThreeDays", "daily", 3, {}],
  ["everyFiveHours", "hourly", 5, {}],
];

for (const [preset, frequency, interval, selectors] of recurrenceCases) {
  test(`encodes ${preset} in the canonical recurrence schema`, () => {
    const input = createEventInputFromDraft(
      draft({ recurrencePreset: preset }),
      "UTC",
    );

    assert.equal(input.title, "Release check");
    assert.equal(input.kind, "repeating");
    if (input.kind !== "repeating") {
      throw new Error("Expected repeating input");
    }
    assert.deepEqual(
      {
        version: input.recurrence.version,
        frequency: input.recurrence.frequency,
        interval: input.recurrence.interval,
        daysOfWeek: input.recurrence.daysOfWeek,
        dayOfMonth: input.recurrence.dayOfMonth,
        weekOfMonth: input.recurrence.weekOfMonth,
        monthOfYear: input.recurrence.monthOfYear,
        termination: input.recurrence.termination,
      },
      {
        version: 1,
        frequency,
        interval,
        daysOfWeek: null,
        dayOfMonth: null,
        weekOfMonth: null,
        monthOfYear: null,
        termination: { type: "never", until: null, count: null },
        ...selectors,
      },
    );
  });
}

test("aligns monthly presets to their next first valid occurrence", () => {
  assert.equal(
    alignDateKeyForPreset("2026-08-11", "firstOfMonth"),
    "2026-09-01",
  );
  assert.equal(
    alignDateKeyForPreset("2026-08-11", "thirdFriday"),
    "2026-08-21",
  );
  assert.equal(
    alignDateKeyForPreset("2026-08-22", "thirdFriday"),
    "2026-09-18",
  );
});

test("stores an all-day event with exclusive local DST boundaries", () => {
  const input = createEventInputFromDraft(
    draft({ date: "2026-03-08", allDay: true }),
    "America/Los_Angeles",
  );

  assert.deepEqual(
    {
      month: zonedDateTimeParts(input.startsAt, input.timeZone).month,
      day: zonedDateTimeParts(input.startsAt, input.timeZone).day,
      hour: zonedDateTimeParts(input.startsAt, input.timeZone).hour,
    },
    { month: 3, day: 8, hour: 0 },
  );
  assert.ok(input.endsAt);
  assert.deepEqual(
    {
      month: zonedDateTimeParts(input.endsAt, input.timeZone).month,
      day: zonedDateTimeParts(input.endsAt, input.timeZone).day,
      hour: zonedDateTimeParts(input.endsAt, input.timeZone).hour,
    },
    { month: 3, day: 9, hour: 0 },
  );
  assert.equal(
    input.endsAt.getTime() - input.startsAt.getTime(),
    23 * 60 * 60 * 1_000,
  );
});

test("turns a through-date into an inclusive event-zone timestamp", () => {
  const input = createEventInputFromDraft(
    draft({
      recurrencePreset: "everyOtherDay",
      terminationType: "onDate",
      untilDate: "2026-08-15",
    }),
    "UTC",
  );

  assert.equal(
    input.recurrence?.termination.until?.toISOString(),
    "2026-08-15T23:59:59.999Z",
  );
});

test("counts the aligned monthly seed as occurrence one", () => {
  const input = createEventInputFromDraft(
    draft({
      recurrencePreset: "firstOfMonth",
      terminationType: "afterOccurrences",
      occurrenceCount: "3",
    }),
    "UTC",
  );

  assert.equal(input.startsAt.toISOString(), "2026-09-01T09:00:00.000Z");
  assert.equal(input.recurrence?.termination.count, 3);
});

test("rejects malformed core and recurrence fields", () => {
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
    () =>
      createEventInputFromDraft(
        draft({
          recurrencePreset: "everyThreeDays",
          terminationType: "afterOccurrences",
          occurrenceCount: "0",
        }),
        "UTC",
      ),
    /OCCURRENCES MUST BE A WHOLE NUMBER/,
  );
  assert.throws(
    () => createEventInputFromDraft(draft({ date: "2026-02-30" }), "UTC"),
    /VALID EVENT DATE/,
  );
  assert.throws(
    () => createEventInputFromDraft(draft(), "Not\/A_Zone"),
    /TIMEZONE IS NOT AVAILABLE/,
  );
});
