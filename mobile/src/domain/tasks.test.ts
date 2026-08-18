import assert from "node:assert/strict";
import test from "node:test";

import { setTaskCompletion, type ScheduleTask } from "@/domain/tasks";

const createdAt = new Date("2026-08-01T09:00:00.000Z");
const dueAt = new Date("2026-08-11T16:30:00.000Z");
const task: ScheduleTask = {
  id: "task-1",
  title: "Send agenda",
  notes: "Attach notes.",
  color: "green",
  status: "open",
  parentId: null,
  dueAt,
  completedAt: null,
  position: 42,
  createdAt,
  updatedAt: createdAt,
};

test("toggles completion without changing task identity or position", () => {
  const completedAt = new Date("2026-08-11T17:00:00.000Z");
  const completed = setTaskCompletion(task, true, completedAt);

  assert.equal(completed.status, "completed");
  assert.equal(completed.completedAt, completedAt);
  assert.equal(completed.createdAt, createdAt);
  assert.equal(completed.position, 42);
  assert.equal(completed.dueAt, dueAt);

  const reopenedAt = new Date("2026-08-11T17:05:00.000Z");
  const reopened = setTaskCompletion(completed, false, reopenedAt);

  assert.equal(reopened.status, "open");
  assert.equal(reopened.completedAt, null);
  assert.equal(reopened.updatedAt, reopenedAt);
  assert.equal(reopened.createdAt, createdAt);
  assert.equal(reopened.position, 42);
  assert.equal(reopened.dueAt, dueAt);
});
