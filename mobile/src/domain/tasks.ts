import type { ScheduleColor } from "@/domain/scheduleColors";

export type TaskStatus = "open" | "completed";

export type ScheduleTask = {
  id: string;
  title: string;
  notes: string;
  color: ScheduleColor;
  status: TaskStatus;
  parentId: string | null;
  dueAt: Date | null;
  completedAt: Date | null;
  position: number;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateTaskInput = {
  title: string;
  notes: string;
  color: ScheduleColor;
  dueAt: Date;
};

export type TaskDraft = {
  title: string;
  notes: string;
  color: ScheduleColor;
  date: string;
  time: string;
};
