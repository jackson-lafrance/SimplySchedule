import { useContext } from "react";

import { ScheduleContext } from "@/context/scheduleContextValue";

export function useSchedule() {
  const value = useContext(ScheduleContext);

  if (!value) {
    throw new Error("useSchedule must be used inside ScheduleProvider.");
  }

  return value;
}
