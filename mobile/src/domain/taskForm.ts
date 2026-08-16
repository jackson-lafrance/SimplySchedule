import { dateAt, parseDateKey, parseTime } from "@/domain/eventForm";
import type { CreateTaskInput, TaskDraft } from "@/domain/tasks";

export function createTaskInputFromDraft(
  draft: TaskDraft,
  timeZone: string,
): CreateTaskInput {
  const title = draft.title.trim();
  if (!title) throw new Error("ADD A TASK TITLE.");
  if (title.length > 200) throw new Error("KEEP THE TITLE TO 200 CHARACTERS.");
  if (draft.notes.length > 5_000) {
    throw new Error("KEEP NOTES TO 5,000 CHARACTERS.");
  }
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format();
  } catch {
    throw new Error("THE TASK TIMEZONE IS NOT AVAILABLE.");
  }

  return {
    title,
    notes: draft.notes,
    dueAt: dateAt(
      parseDateKey(draft.date, "TASK"),
      parseTime(draft.time, "TASK"),
      timeZone,
    ),
  };
}
