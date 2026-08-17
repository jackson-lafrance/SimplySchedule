import assert from "node:assert/strict";
import test from "node:test";
import { Timestamp } from "firebase/firestore";

import {
  decodeTaskDocument,
  encodeCreateTaskDocument,
} from "@/services/taskRepository";

const dueAt = new Date("2026-08-11T16:30:00.000Z");

function taskDocument(overrides: Record<string, unknown> = {}) {
  return {
    title: "  Send agenda  ",
    notes: "Attach notes.",
    color: "yellow",
    status: "open",
    parentId: null,
    dueAt: Timestamp.fromDate(dueAt),
    completedAt: null,
    position: 42,
    createdAt: Timestamp.fromDate(dueAt),
    updatedAt: Timestamp.fromDate(dueAt),
    ...overrides,
  };
}

test("decodes canonical task persistence", () => {
  const task = decodeTaskDocument("task-1", taskDocument());

  assert.equal(task.id, "task-1");
  assert.equal(task.title, "Send agenda");
  assert.equal(task.status, "open");
  assert.equal(task.color, "yellow");
  assert.equal(task.dueAt?.toISOString(), dueAt.toISOString());
});

test("defaults legacy tasks to the semantic task color", () => {
  const { color: _color, ...document } = taskDocument();

  assert.equal(decodeTaskDocument("legacy-task", document).color, "green");
});

test("encodes the canonical task color field", () => {
  const lifecycleTimestamp = { serverTimestamp: true };
  const document = encodeCreateTaskDocument(
    { title: "  Send agenda  ", notes: "", color: "peach", dueAt },
    lifecycleTimestamp,
    12,
  );

  assert.deepEqual(Object.keys(document).sort(), [
    "color",
    "completedAt",
    "createdAt",
    "dueAt",
    "notes",
    "parentId",
    "position",
    "status",
    "title",
    "updatedAt",
  ]);
  assert.equal(document.title, "Send agenda");
  assert.equal(document.color, "peach");
  assert.equal(document.dueAt.toDate().toISOString(), dueAt.toISOString());
  assert.equal(document.createdAt, lifecycleTimestamp);
  assert.equal(document.updatedAt, lifecycleTimestamp);
});

test("rejects malformed task data", () => {
  assert.throws(
    () => decodeTaskDocument("task-1", taskDocument({ status: "maybe" })),
    /invalid canonical fields/,
  );
  assert.throws(
    () => decodeTaskDocument("task-1", taskDocument({ dueAt: "tomorrow" })),
    /dueAt must be a Firestore timestamp/,
  );
  assert.throws(
    () => decodeTaskDocument("task-1", taskDocument({ color: "pink" })),
    /invalid canonical fields/,
  );
});
