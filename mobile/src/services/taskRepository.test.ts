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
  assert.equal(task.dueAt?.toISOString(), dueAt.toISOString());
});

test("encodes exactly the canonical task fields", () => {
  const lifecycleTimestamp = { serverTimestamp: true };
  const document = encodeCreateTaskDocument(
    { title: "  Send agenda  ", notes: "", dueAt },
    lifecycleTimestamp,
    12,
  );

  assert.deepEqual(Object.keys(document).sort(), [
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
});
