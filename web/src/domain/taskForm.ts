import type { ScheduleColor } from "@/domain/colors";
import type { CreateTaskInput } from "@/domain/tasks";

export type TaskDraft = {
  title: string;
  notes: string;
  date: string;
  time: string;
  color: ScheduleColor;
};

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^(\d{2}):(\d{2})$/;

export function createTaskInputFromDraft(draft: TaskDraft): CreateTaskInput {
  const title = draft.title.trim();
  if (!title) throw new Error("ADD A TASK TITLE.");
  if (title.length > 200) throw new Error("KEEP THE TITLE TO 200 CHARACTERS.");
  if (draft.notes.length > 5_000) {
    throw new Error("KEEP NOTES TO 5,000 CHARACTERS.");
  }

  const dateMatch = DATE_PATTERN.exec(draft.date);
  const timeMatch = TIME_PATTERN.exec(draft.time);
  if (!dateMatch || !timeMatch) {
    throw new Error("CHOOSE A VALID DUE DATE AND TIME.");
  }
  const [, yearText, monthText, dayText] = dateMatch;
  const [, hourText, minuteText] = timeMatch;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const dueAt = new Date(year, month - 1, day, hour, minute);
  if (
    dueAt.getFullYear() !== year ||
    dueAt.getMonth() !== month - 1 ||
    dueAt.getDate() !== day ||
    dueAt.getHours() !== hour ||
    dueAt.getMinutes() !== minute
  ) {
    throw new Error("CHOOSE A VALID DUE DATE AND TIME.");
  }

  return {
    title,
    notes: draft.notes,
    dueAt,
    color: draft.color,
  };
}
