import assert from "node:assert/strict";
import test from "node:test";
import { Timestamp } from "firebase/firestore";

import type { CreateEventInput } from "@/domain/events";
import {
  decodeEventDocument,
  encodeCreateEventDocument,
} from "@/services/eventRepository";

const startsAt = new Date("2026-08-11T16:30:00.000Z");
const endsAt = new Date("2026-08-11T17:30:00.000Z");

function eventDocument(overrides: Record<string, unknown> = {}) {
  return {
    title: "  Weekly plan  ",
    notes: "Set priorities.",
    kind: "single",
    startsAt: Timestamp.fromDate(startsAt),
    endsAt: Timestamp.fromDate(endsAt),
    allDay: false,
    timeZone: "America/Los_Angeles",
    recurrence: null,
    createdAt: Timestamp.fromDate(startsAt),
    updatedAt: Timestamp.fromDate(startsAt),
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

test("decodes the shared single-event document contract", () => {
  const event = decodeEventDocument("event-1", eventDocument());

  assert.equal(event.id, "event-1");
  assert.equal(event.title, "Weekly plan");
  assert.equal(event.kind, "single");
  assert.equal(event.startsAt.toISOString(), startsAt.toISOString());
  assert.equal(event.recurrence, null);
});

test("encodes exactly ten canonical fields with Firestore timestamp values", () => {
  const lifecycleTimestamp = { serverTimestamp: true };
  const input: CreateEventInput = {
    title: "  Third Friday review  ",
    notes: "Monthly release review.",
    kind: "repeating",
    startsAt: new Date("2026-08-21T16:00:00.000Z"),
    endsAt: new Date("2026-08-21T17:00:00.000Z"),
    allDay: false,
    timeZone: "America/Los_Angeles",
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

  assert.deepEqual(Object.keys(document).sort(), [
    "allDay",
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
  assert.equal(document.title, "Third Friday review");
  assert.equal(document.startsAt.toDate().toISOString(), input.startsAt.toISOString());
  assert.equal(document.endsAt?.toDate().toISOString(), input.endsAt?.toISOString());
  assert.equal(
    document.recurrence?.termination.until?.toDate().toISOString(),
    input.recurrence.termination.until?.toISOString(),
  );
  assert.equal(document.createdAt, lifecycleTimestamp);
  assert.equal(document.updatedAt, lifecycleTimestamp);
});

const requiredRecurrencePatterns: [string, Record<string, unknown>][] = [
  ["first of the month", { frequency: "monthly", dayOfMonth: 1 }],
  [
    "third Friday of the month",
    { frequency: "monthly", weekOfMonth: 3, daysOfWeek: [5] },
  ],
  ["every other day", { frequency: "daily", interval: 2 }],
  ["every three days", { frequency: "daily", interval: 3 }],
  ["every five hours", { frequency: "hourly", interval: 5 }],
];

requiredRecurrencePatterns.forEach(([name, overrides]) => {
  test(`accepts the shared recurrence shape for ${name}`, () => {
    const event = decodeEventDocument(
      "series-1",
      eventDocument({
        kind: "repeating",
        recurrence: recurrence(overrides),
      }),
    );

    assert.equal(event.kind, "repeating");
    assert.deepEqual(
      {
        frequency: event.recurrence.frequency,
        interval: event.recurrence.interval,
        daysOfWeek: event.recurrence.daysOfWeek,
        dayOfMonth: event.recurrence.dayOfMonth,
        weekOfMonth: event.recurrence.weekOfMonth,
      },
      {
        frequency: "daily",
        interval: 1,
        daysOfWeek: null,
        dayOfMonth: null,
        weekOfMonth: null,
        ...overrides,
      },
    );
  });
});

test("rejects selector combinations that diverge from the shared contract", () => {
  assert.throws(
    () =>
      decodeEventDocument(
        "series-1",
        eventDocument({
          kind: "repeating",
          recurrence: {
            version: 1,
            frequency: "daily",
            interval: 2,
            daysOfWeek: [1],
            dayOfMonth: null,
            weekOfMonth: null,
            monthOfYear: null,
            termination: {
              type: "never",
              until: null,
              count: null,
            },
          },
        }),
      ),
    /selectors do not match/,
  );
});

test("requires an exclusive end for all-day events", () => {
  assert.throws(
    () =>
      decodeEventDocument(
        "event-1",
        eventDocument({ allDay: true, endsAt: null }),
      ),
    /must have an exclusive end/,
  );
});

test("rejects recurrence on a single event", () => {
  assert.throws(
    () =>
      decodeEventDocument(
        "event-1",
        eventDocument({
          recurrence: {
            version: 1,
            frequency: "daily",
            interval: 2,
          },
        }),
      ),
    /cannot have recurrence/,
  );
});
