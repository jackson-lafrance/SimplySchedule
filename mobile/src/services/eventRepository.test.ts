import assert from "node:assert/strict";
import test from "node:test";
import { Timestamp } from "firebase/firestore";

import { decodeEventDocument } from "@/services/eventRepository";

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

test("decodes the shared single-event document contract", () => {
  const event = decodeEventDocument("event-1", eventDocument());

  assert.equal(event.id, "event-1");
  assert.equal(event.title, "Weekly plan");
  assert.equal(event.kind, "single");
  assert.equal(event.startsAt.toISOString(), startsAt.toISOString());
  assert.equal(event.recurrence, null);
});

test("accepts the contract's third-Friday recurrence shape", () => {
  const event = decodeEventDocument(
    "series-1",
    eventDocument({
      kind: "repeating",
      recurrence: {
        version: 1,
        frequency: "monthly",
        interval: 1,
        daysOfWeek: [5],
        dayOfMonth: null,
        weekOfMonth: 3,
        monthOfYear: null,
        termination: {
          type: "never",
          until: null,
          count: null,
        },
      },
    }),
  );

  assert.equal(event.kind, "repeating");
  assert.equal(event.recurrence.frequency, "monthly");
  assert.deepEqual(event.recurrence.daysOfWeek, [5]);
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
