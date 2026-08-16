import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_PREFERENCES,
  parsePreferences,
} from "@/domain/preferences";

test("uses focused product defaults", () => {
  assert.deepEqual(DEFAULT_PREFERENCES, {
    weekStartsOn: 1,
    defaultCalendarView: "week",
    timeDisplay: "12-hour",
  });
});

test("restores valid saved preferences", () => {
  assert.deepEqual(
    parsePreferences({
      weekStartsOn: 0,
      defaultCalendarView: "month",
      timeDisplay: "24-hour",
      ignoredSetting: true,
    }),
    {
      weekStartsOn: 0,
      defaultCalendarView: "month",
      timeDisplay: "24-hour",
    },
  );
});

test("sanitizes malformed preference storage", () => {
  assert.deepEqual(parsePreferences({ weekStartsOn: 8 }), DEFAULT_PREFERENCES);
  assert.deepEqual(parsePreferences(null), DEFAULT_PREFERENCES);
});
