import { useContext } from "react";

import { ScheduleContext } from "@/context/scheduleContextValue";

export function useSchedule() {
  const context = useContext(ScheduleContext);

  if (!context) {
    throw new Error("useSchedule must be used inside ScheduleProvider.");
  }

  return context;
}
