export type TaskStatus = "open" | "completed";

export type ScheduleTask = {
  id: string;
  title: string;
  notes: string;
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
  dueAt: Date;
};

export type TaskDraft = {
  title: string;
  notes: string;
  date: string;
  time: string;
};
