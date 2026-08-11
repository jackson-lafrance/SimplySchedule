import { createContext } from "react";

import type { SingleEvent } from "@/domain/events";

export type ScheduleStatus = "loading" | "ready" | "error";
export type ScheduleSource = "firebase" | "preview";

export type ScheduleState = {
  events: SingleEvent[];
  status: ScheduleStatus;
  source: ScheduleSource;
  errorMessage: string | null;
  lastUpdatedAt: Date | null;
};

export type ScheduleContextValue = ScheduleState & {
  retry: () => void;
};

export const ScheduleContext = createContext<ScheduleContextValue | null>(null);
