import { describe, expect, it } from "vitest";

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

describe("event creation normalization", () => {
  it.each([
    ["firstOfMonth", "monthly", 1, { dayOfMonth: 1 }],
    ["thirdFriday", "monthly", 1, { daysOfWeek: [5], weekOfMonth: 3 }],
    ["everyOtherDay", "daily", 2, {}],
    ["everyThreeDays", "daily", 3, {}],
    ["everyFiveHours", "hourly", 5, {}],
  ] as const)(
    "encodes %s in the canonical recurrence schema",
    (preset, frequency, interval, selectors) => {
      const input = createEventInputFromDraft(
        draft({ recurrencePreset: preset as RecurrencePreset }),
        "UTC",
      );

      expect(input.title).toBe("Release check");
      expect(input.kind).toBe("repeating");
      expect(input.recurrence).toMatchObject({
        version: 1,
        frequency,
        interval,
        daysOfWeek: null,
        dayOfMonth: null,
        weekOfMonth: null,
        monthOfYear: null,
        termination: { type: "never", until: null, count: null },
        ...selectors,
      });
    },
  );

  it("aligns monthly presets to their first valid occurrence", () => {
    expect(alignDateKeyForPreset("2026-08-11", "firstOfMonth")).toBe(
      "2026-09-01",
    );
    expect(alignDateKeyForPreset("2026-08-11", "thirdFriday")).toBe(
      "2026-08-21",
    );
    expect(alignDateKeyForPreset("2026-08-22", "thirdFriday")).toBe(
      "2026-09-18",
    );
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
        recurrencePreset: "everyOtherDay",
        terminationType: "onDate",
        untilDate: "2026-08-15",
      }),
      "UTC",
    );

    expect(input.recurrence?.termination.until?.toISOString()).toBe(
      "2026-08-15T23:59:59.999Z",
    );
  });

  it("rejects empty titles, backwards times, and invalid counts", () => {
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
        draft({
          recurrencePreset: "everyThreeDays",
          terminationType: "afterOccurrences",
          occurrenceCount: "0",
        }),
        "UTC",
      ),
    ).toThrow("OCCURRENCES MUST BE A WHOLE NUMBER");
  });
});
