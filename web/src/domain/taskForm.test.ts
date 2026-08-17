import { describe, expect, it } from "vitest";

import { createTaskInputFromDraft } from "@/domain/taskForm";

describe("task creation normalization", () => {
  it("creates a local due instant and preserves the selected color", () => {
    const input = createTaskInputFromDraft({
      title: "  Send agenda  ",
      notes: "Attach notes.",
      date: "2026-08-19",
      time: "14:30",
      color: "teal",
    });

    expect(input.title).toBe("Send agenda");
    expect(input.dueAt.getFullYear()).toBe(2026);
    expect(input.dueAt.getMonth()).toBe(7);
    expect(input.dueAt.getDate()).toBe(19);
    expect(input.dueAt.getHours()).toBe(14);
    expect(input.color).toBe("teal");
  });

  it("rejects missing titles and malformed due values", () => {
    expect(() =>
      createTaskInputFromDraft({
        title: " ",
        notes: "",
        date: "2026-08-19",
        time: "14:30",
        color: "green",
      }),
    ).toThrow("ADD A TASK TITLE");
    expect(() =>
      createTaskInputFromDraft({
        title: "Send agenda",
        notes: "",
        date: "2026-02-31",
        time: "14:30",
        color: "green",
      }),
    ).toThrow("VALID DUE DATE AND TIME");
  });
});
