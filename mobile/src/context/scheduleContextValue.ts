import { createContext } from "react";

import type {
  CalendarEvent,
  CreateEventInput,
  VisibleRange,
} from "@/domain/events";
import type { CreateTaskInput, ScheduleTask } from "@/domain/tasks";

export type ScheduleStatus = "loading" | "ready" | "error";
export type ScheduleSource = "firebase" | "preview";

export type ScheduleState = {
  events: CalendarEvent[];
  tasks: ScheduleTask[];
  status: ScheduleStatus;
  source: ScheduleSource;
  errorMessage: string | null;
  lastUpdatedAt: Date | null;
};

export type ScheduleContextValue = ScheduleState & {
  visibleRange: VisibleRange;
  setVisibleRange: (range: VisibleRange) => void;
  createEvent: (input: CreateEventInput) => Promise<string>;
  createTask: (input: CreateTaskInput) => Promise<string>;
  completeTask: (taskId: string) => Promise<void>;
  retry: () => void;
};

export const ScheduleContext = createContext<ScheduleContextValue | null>(null);
