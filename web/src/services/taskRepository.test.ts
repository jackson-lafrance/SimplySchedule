import { describe, expect, it } from "vitest";

import { decodeTaskDocument } from "@/services/taskRepository";

const dueAt = new Date("2026-08-11T16:30:00.000Z");

function timestamp(value: Date) {
  return { toDate: () => value };
}

function taskDocument(overrides: Record<string, unknown> = {}) {
  return {
    title: "  Send agenda  ",
    notes: "Attach notes.",
    status: "open",
    parentId: null,
    dueAt: timestamp(dueAt),
    completedAt: null,
    position: 42,
    createdAt: timestamp(dueAt),
    updatedAt: timestamp(dueAt),
    ...overrides,
  };
}

describe("Firestore task decoding", () => {
  it("decodes the canonical mobile/web task shape", () => {
    const task = decodeTaskDocument("task-1", taskDocument());

    expect(task.id).toBe("task-1");
    expect(task.title).toBe("Send agenda");
    expect(task.status).toBe("open");
    expect(task.dueAt).toEqual(dueAt);
  });

  it("rejects malformed task data", () => {
    expect(() =>
      decodeTaskDocument("task-1", taskDocument({ status: "maybe" })),
    ).toThrow("invalid canonical fields");
    expect(() =>
      decodeTaskDocument("task-1", taskDocument({ dueAt: "tomorrow" })),
    ).toThrow("dueAt must be a Firestore timestamp");
  });
});
