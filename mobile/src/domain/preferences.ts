export type WeekStart = 0 | 1;
export type CalendarMode = "day" | "week" | "month";
export type TimeDisplay = "12-hour" | "24-hour";

export type SchedulePreferences = {
  weekStartsOn: WeekStart;
  defaultCalendarView: CalendarMode;
  timeDisplay: TimeDisplay;
};

export const DEFAULT_PREFERENCES: SchedulePreferences = {
  weekStartsOn: 1,
  defaultCalendarView: "week",
  timeDisplay: "12-hour",
};

export function parsePreferences(value: unknown): SchedulePreferences {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return DEFAULT_PREFERENCES;
  }
  const record = value as Record<string, unknown>;
  return {
    weekStartsOn: record.weekStartsOn === 0 ? 0 : 1,
    defaultCalendarView:
      record.defaultCalendarView === "day" ||
      record.defaultCalendarView === "month"
        ? record.defaultCalendarView
        : "week",
    timeDisplay:
      record.timeDisplay === "24-hour" ? "24-hour" : "12-hour",
  };
}
