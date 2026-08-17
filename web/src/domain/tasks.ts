import type { ScheduleColor } from "@/domain/colors";

export type TaskStatus = "open" | "completed";

/** The unchanged task document shape shared with the mobile client. */
export type ScheduleTask = {
  id: string;
  title: string;
  notes: string;
  status: TaskStatus;
  parentId: string | null;
  dueAt: Date | null;
  completedAt: Date | null;
  position: number;
  color?: ScheduleColor;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateTaskInput = {
  title: string;
  notes: string;
  dueAt: Date;
  color: ScheduleColor;
};
