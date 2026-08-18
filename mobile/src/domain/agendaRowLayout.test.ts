import assert from "node:assert/strict";
import test from "node:test";

import { AGENDA_ROW_LAYOUT } from "@/domain/agendaRowLayout";

test("keeps the black outline separate from the colored row rail", () => {
  assert.equal(AGENDA_ROW_LAYOUT.borderWidth, 2);
  assert.equal(AGENDA_ROW_LAYOUT.accentRailWidth, 8);
  assert.equal("borderLeftWidth" in AGENDA_ROW_LAYOUT, false);
  assert.notEqual(
    AGENDA_ROW_LAYOUT.borderWidth,
    AGENDA_ROW_LAYOUT.accentRailWidth,
  );
});
