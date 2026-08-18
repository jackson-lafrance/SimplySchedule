import assert from "node:assert/strict";
import test from "node:test";

import { DONE_BUTTON_PRESSED_STYLE } from "@/domain/interactionStyles";

test("Done button press feedback uses the positive SimplyLift green", () => {
  assert.deepEqual(DONE_BUTTON_PRESSED_STYLE, {
    backgroundColor: "#34C759",
    borderColor: "#34C759",
  });
});
