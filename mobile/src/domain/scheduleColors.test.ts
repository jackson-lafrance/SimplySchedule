import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_EVENT_COLOR,
  DEFAULT_TASK_COLOR,
  isScheduleColor,
  scheduleColorValue,
  SCHEDULE_COLORS,
} from "@/domain/scheduleColors";

test("exposes the shared Neovim-inspired schedule palette", () => {
  assert.deepEqual(
    SCHEDULE_COLORS.map((color) => color.id),
    ["blue", "teal", "green", "yellow", "peach", "red", "mauve"],
  );
  assert.equal(DEFAULT_TASK_COLOR, "green");
  assert.equal(DEFAULT_EVENT_COLOR, "mauve");
  assert.equal(scheduleColorValue("blue"), "#89B4FA");
});

test("validates persisted schedule color identifiers", () => {
  assert.equal(isScheduleColor("mauve"), true);
  assert.equal(isScheduleColor("pink"), false);
  assert.equal(isScheduleColor(null), false);
});
