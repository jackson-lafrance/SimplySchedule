import assert from "node:assert/strict";
import test from "node:test";

import { createTaskInputFromDraft } from "@/domain/taskForm";

test("normalizes a quick task into an agenda due instant", () => {
  const input = createTaskInputFromDraft(
    {
      title: "  Send agenda  ",
      notes: "Attach notes.",
      color: "green",
      date: "2026-08-11",
      time: "09:30",
    },
    "America/Los_Angeles",
  );

  assert.equal(input.title, "Send agenda");
  assert.equal(input.color, "green");
  assert.equal(input.dueAt.toISOString(), "2026-08-11T16:30:00.000Z");
});

test("rejects malformed quick tasks", () => {
  assert.throws(
    () =>
      createTaskInputFromDraft(
        { title: " ", notes: "", color: "green", date: "2026-08-11", time: "09:00" },
        "UTC",
      ),
    /ADD A TASK TITLE/,
  );
  assert.throws(
    () =>
      createTaskInputFromDraft(
        { title: "Task", notes: "", color: "green", date: "2026-02-30", time: "09:00" },
        "UTC",
      ),
    /VALID TASK DATE/,
  );
});
