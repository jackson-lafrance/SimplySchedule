import { describe, expect, it } from "vitest";

import { decodeEventDocument } from "@/services/eventRepository";

function timestamp(value: string) {
  return { toDate: () => new Date(value) };
}

function singleDocument(overrides: Record<string, unknown> = {}) {
  return {
    title: "Design review",
    notes: "Review the calendar pass.",
    kind: "single",
    startsAt: timestamp("2026-08-11T16:00:00.000Z"),
    endsAt: timestamp("2026-08-11T17:00:00.000Z"),
    allDay: false,
    timeZone: "America/Los_Angeles",
    recurrence: null,
    createdAt: timestamp("2026-08-01T16:00:00.000Z"),
    updatedAt: timestamp("2026-08-01T16:00:00.000Z"),
    ...overrides,
  };
}

function recurrence(overrides: Record<string, unknown>) {
  return {
    version: 1,
    frequency: "daily",
    interval: 1,
    daysOfWeek: null,
    dayOfMonth: null,
    weekOfMonth: null,
    monthOfYear: null,
    termination: {
      type: "never",
      until: null,
      count: null,
    },
    ...overrides,
  };
}

function repeatingDocument(rule: Record<string, unknown>) {
  return singleDocument({
    kind: "repeating",
    recurrence: rule,
  });
}

describe("Firestore event decoding", () => {
  it("converts a valid single event timestamp contract to domain dates", () => {
    const event = decodeEventDocument("event-1", singleDocument());

    expect(event.kind).toBe("single");
    expect(event.startsAt).toEqual(new Date("2026-08-11T16:00:00.000Z"));
    expect(event.recurrence).toBeNull();
  });

  it.each([
    ["first of the month", { frequency: "monthly", dayOfMonth: 1 }],
    [
      "third Friday of the month",
      { frequency: "monthly", weekOfMonth: 3, daysOfWeek: [5] },
    ],
    ["every other day", { frequency: "daily", interval: 2 }],
    ["every three days", { frequency: "daily", interval: 3 }],
    ["every five hours", { frequency: "hourly", interval: 5 }],
  ])("accepts the shared recurrence shape for %s", (_, overrides) => {
    const event = decodeEventDocument(
      "series-1",
      repeatingDocument(recurrence(overrides)),
    );

    expect(event.kind).toBe("repeating");
    expect(event.recurrence).toMatchObject(overrides);
  });

  it("rejects recurrence selectors that do not match the frequency", () => {
    expect(() =>
      decodeEventDocument(
        "series-1",
        repeatingDocument(
          recurrence({ frequency: "daily", daysOfWeek: [1] }),
        ),
      ),
    ).toThrow("selectors do not match");
  });

  it("rejects an event that does not end after it starts", () => {
    expect(() =>
      decodeEventDocument(
        "event-1",
        singleDocument({
          endsAt: timestamp("2026-08-11T16:00:00.000Z"),
        }),
      ),
    ).toThrow("must end after it starts");
  });

  it("rejects recurrence data on a single event", () => {
    expect(() =>
      decodeEventDocument(
        "event-1",
        singleDocument({ recurrence: recurrence({ interval: 2 }) }),
      ),
    ).toThrow("cannot have recurrence");
  });
});
