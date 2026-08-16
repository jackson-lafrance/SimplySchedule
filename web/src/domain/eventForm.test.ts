import { describe, expect, it } from "vitest";

import {
  createEventInputFromDraft,
  previewEventOccurrences,
  recurrenceSummary,
  type EventDraft,
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
    repeatFrequency: "none",
    interval: "1",
    daysOfWeek: [2],
    calendarPattern: "dayOfMonth",
    dayOfMonth: "11",
    weekOfMonth: "1",
    ordinalWeekday: "2",
    monthOfYear: "8",
    terminationType: "never",
    untilDate: "2026-12-31",
    occurrenceCount: "10",
    ...overrides,
  };
}

describe("event creation normalization", () => {
  it.each([
    [
      "first of the month",
      { repeatFrequency: "monthly", dayOfMonth: "1" },
      { frequency: "monthly", interval: 1, dayOfMonth: 1 },
    ],
    [
      "first Friday",
      {
        repeatFrequency: "monthly",
        calendarPattern: "ordinalWeekday",
        weekOfMonth: "1",
        ordinalWeekday: "5",
      },
      {
        frequency: "monthly",
        interval: 1,
        daysOfWeek: [5],
        weekOfMonth: 1,
      },
    ],
    [
      "third Friday",
      {
        repeatFrequency: "monthly",
        calendarPattern: "ordinalWeekday",
        weekOfMonth: "3",
        ordinalWeekday: "5",
      },
      {
        frequency: "monthly",
        interval: 1,
        daysOfWeek: [5],
        weekOfMonth: 3,
      },
    ],
    [
      "every other day",
      { repeatFrequency: "daily", interval: "2" },
      { frequency: "daily", interval: 2 },
    ],
    [
      "every three days",
      { repeatFrequency: "daily", interval: "3" },
      { frequency: "daily", interval: 3 },
    ],
    [
      "every five hours",
      { repeatFrequency: "hourly", interval: "5" },
      { frequency: "hourly", interval: 5 },
    ],
  ] as const)("encodes %s in the canonical schema", (_, overrides, expected) => {
    const input = createEventInputFromDraft(
      draft(overrides as Partial<EventDraft>),
      "UTC",
    );

    expect(input.title).toBe("Release check");
    expect(input.kind).toBe("repeating");
    expect(input.recurrence).toMatchObject({
      version: 1,
      daysOfWeek: null,
      dayOfMonth: null,
      weekOfMonth: null,
      monthOfYear: null,
      termination: { type: "never", until: null, count: null },
      ...expected,
    });
  });

  it("supports arbitrary weekly intervals and weekday sets", () => {
    const input = createEventInputFromDraft(
      draft({
        repeatFrequency: "weekly",
        interval: "4",
        daysOfWeek: [5, 1, 3, 1],
      }),
      "UTC",
    );

    expect(input.recurrence).toMatchObject({
      frequency: "weekly",
      interval: 4,
      daysOfWeek: [1, 3, 5],
    });
  });

  it("supports yearly ordinal weekdays with a month selector", () => {
    const input = createEventInputFromDraft(
      draft({
        repeatFrequency: "yearly",
        interval: "2",
        calendarPattern: "ordinalWeekday",
        weekOfMonth: "-1",
        ordinalWeekday: "1",
        monthOfYear: "5",
      }),
      "UTC",
    );

    expect(input.recurrence).toMatchObject({
      frequency: "yearly",
      interval: 2,
      daysOfWeek: [1],
      weekOfMonth: -1,
      monthOfYear: 5,
    });
  });

  it("keeps the chosen start as the recurrence anchor", () => {
    const input = createEventInputFromDraft(
      draft({
        date: "2026-08-11",
        repeatFrequency: "monthly",
        dayOfMonth: "1",
      }),
      "UTC",
    );

    expect(input.startsAt.toISOString()).toBe("2026-08-11T09:00:00.000Z");
    expect(input.recurrence?.dayOfMonth).toBe(1);
  });

  it("stores an all-day event with exclusive local date boundaries", () => {
    const input = createEventInputFromDraft(
      draft({ date: "2026-03-08", allDay: true }),
      "America/Los_Angeles",
    );

    expect(zonedDateTimeParts(input.startsAt, input.timeZone)).toMatchObject({
      month: 3,
      day: 8,
      hour: 0,
    });
    expect(zonedDateTimeParts(input.endsAt!, input.timeZone)).toMatchObject({
      month: 3,
      day: 9,
      hour: 0,
    });
    expect(input.endsAt!.getTime() - input.startsAt.getTime()).toBe(
      23 * 60 * 60 * 1_000,
    );
  });

  it("turns a through-date into an inclusive event-zone timestamp", () => {
    const input = createEventInputFromDraft(
      draft({
        repeatFrequency: "daily",
        interval: "2",
        terminationType: "onDate",
        untilDate: "2026-08-15",
      }),
      "UTC",
    );

    expect(input.recurrence?.termination.until?.toISOString()).toBe(
      "2026-08-15T23:59:59.999Z",
    );
  });

  it("summarizes expressive rules and end conditions in plain language", () => {
    expect(
      recurrenceSummary(
        draft({
          repeatFrequency: "monthly",
          interval: "2",
          calendarPattern: "ordinalWeekday",
          weekOfMonth: "1",
          ordinalWeekday: "5",
        }),
      ),
    ).toBe("EVERY 2 MONTHS ON THE FIRST FRIDAY");

    expect(
      recurrenceSummary(
        draft({
          repeatFrequency: "yearly",
          interval: "2",
          monthOfYear: "5",
          calendarPattern: "ordinalWeekday",
          weekOfMonth: "-1",
          ordinalWeekday: "1",
          terminationType: "onDate",
          untilDate: "2032-05-31",
        }),
      ),
    ).toBe(
      "EVERY 2 YEARS IN MAY ON THE LAST MONDAY, THROUGH 2032-05-31",
    );
  });

  it("previews the next five matching occurrences", () => {
    const input = createEventInputFromDraft(
      draft({
        date: "2026-08-11",
        repeatFrequency: "monthly",
        calendarPattern: "ordinalWeekday",
        weekOfMonth: "1",
        ordinalWeekday: "5",
      }),
      "UTC",
    );

    expect(
      previewEventOccurrences(input).map((date) => date.toISOString()),
    ).toEqual([
      "2026-09-04T09:00:00.000Z",
      "2026-10-02T09:00:00.000Z",
      "2026-11-06T09:00:00.000Z",
      "2026-12-04T09:00:00.000Z",
      "2027-01-01T09:00:00.000Z",
    ]);
  });

  it("rejects end conditions before the first selector match", () => {
    expect(() =>
      createEventInputFromDraft(
        draft({
          date: "2026-08-11",
          repeatFrequency: "monthly",
          dayOfMonth: "1",
          terminationType: "onDate",
          untilDate: "2026-08-15",
        }),
        "UTC",
      ),
    ).toThrow("FIRST MATCHING OCCURRENCE");
  });

  it("rejects a yearly selector that can never produce an occurrence", () => {
    expect(() =>
      createEventInputFromDraft(
        draft({
          date: "2026-02-01",
          repeatFrequency: "yearly",
          monthOfYear: "2",
          dayOfMonth: "31",
        }),
        "UTC",
      ),
    ).toThrow("DOES NOT PRODUCE AN OCCURRENCE");
  });

  it("rejects empty titles, backwards times, invalid intervals, and empty weekdays", () => {
    expect(() =>
      createEventInputFromDraft(draft({ title: "   " }), "UTC"),
    ).toThrow("ADD AN EVENT TITLE");
    expect(() =>
      createEventInputFromDraft(
        draft({ startTime: "10:00", endTime: "09:00" }),
        "UTC",
      ),
    ).toThrow("END TIME MUST BE AFTER START TIME");
    expect(() =>
      createEventInputFromDraft(
        draft({ repeatFrequency: "daily", interval: "100" }),
        "UTC",
      ),
    ).toThrow("REPEAT INTERVAL IS NOT VALID");
    expect(() =>
      createEventInputFromDraft(
        draft({ repeatFrequency: "weekly", daysOfWeek: [] }),
        "UTC",
      ),
    ).toThrow("CHOOSE AT LEAST ONE WEEKDAY");
  });
});
