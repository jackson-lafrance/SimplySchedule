import assert from "node:assert/strict";
import test from "node:test";

import { PRIMARY_SCHEDULE_ACTION_LABEL } from "@/domain/navigationLabels";

test("uses the uppercase primary schedule action label", () => {
  assert.equal(PRIMARY_SCHEDULE_ACTION_LABEL, "+ SCHEDULE");
  assert.equal(PRIMARY_SCHEDULE_ACTION_LABEL, PRIMARY_SCHEDULE_ACTION_LABEL.toUpperCase());
});
