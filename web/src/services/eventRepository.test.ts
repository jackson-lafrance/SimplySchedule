import { describe, expect, it } from "vitest";

import type { CreateEventInput } from "@/domain/events";
import {
  decodeEventDocument,
  encodeCreateEventDocument,
} from "@/services/eventRepository";

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

describe("Firestore event creation encoding", () => {
  it("writes exactly the canonical schema with Firestore timestamps", () => {
    const lifecycleTimestamp = { serverTimestamp: true };
    const input: CreateEventInput = {
      title: "  Third Friday review  ",
      notes: "Monthly release review.",
      kind: "repeating",
      startsAt: new Date("2026-08-21T16:00:00.000Z"),
      endsAt: new Date("2026-08-21T17:00:00.000Z"),
      allDay: false,
      timeZone: "America/Los_Angeles",
      color: "blue",
      recurrence: {
        version: 1,
        frequency: "monthly",
        interval: 1,
        daysOfWeek: [5],
        dayOfMonth: null,
        weekOfMonth: 3,
        monthOfYear: null,
        termination: {
          type: "onDate",
          until: new Date("2026-12-31T23:59:59.999Z"),
          count: null,
        },
      },
    };

    const document = encodeCreateEventDocument(input, lifecycleTimestamp);

    expect(Object.keys(document).sort()).toEqual([
      "allDay",
      "color",
      "createdAt",
      "endsAt",
      "kind",
      "notes",
      "recurrence",
      "startsAt",
      "timeZone",
      "title",
      "updatedAt",
    ]);
    expect(document.title).toBe("Third Friday review");
    expect(document.color).toBe("blue");
    expect(document.startsAt.toDate()).toEqual(input.startsAt);
    expect(document.endsAt?.toDate()).toEqual(input.endsAt);
    expect(document.recurrence?.termination.until?.toDate()).toEqual(
      input.recurrence!.termination.until,
    );
    expect(document.createdAt).toBe(lifecycleTimestamp);
    expect(document.updatedAt).toBe(lifecycleTimestamp);
  });
});

describe("Firestore event decoding", () => {
  it("converts a valid single event timestamp contract to domain dates", () => {
    const event = decodeEventDocument("event-1", singleDocument());

    expect(event.kind).toBe("single");
    expect(event.startsAt).toEqual(new Date("2026-08-11T16:00:00.000Z"));
    expect(event.recurrence).toBeNull();
    expect(event.color).toBe("mauve");
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
