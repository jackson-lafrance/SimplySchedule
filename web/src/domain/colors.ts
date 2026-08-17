export const SCHEDULE_COLORS = [
  { key: "blue", label: "Blue", value: "#89B4FA", text: "#245A9B" },
  { key: "teal", label: "Teal", value: "#94E2D5", text: "#176B63" },
  { key: "green", label: "Green", value: "#A6E3A1", text: "#28733A" },
  { key: "yellow", label: "Yellow", value: "#F9E2AF", text: "#725A13" },
  { key: "peach", label: "Peach", value: "#FAB387", text: "#8A451F" },
  { key: "red", label: "Red", value: "#F38BA8", text: "#9A284D" },
  { key: "mauve", label: "Mauve", value: "#CBA6F7", text: "#623F8E" },
] as const;

export type ScheduleColor = (typeof SCHEDULE_COLORS)[number]["key"];

export const DEFAULT_EVENT_COLOR: ScheduleColor = "mauve";
export const DEFAULT_TASK_COLOR: ScheduleColor = "green";

export function isScheduleColor(value: unknown): value is ScheduleColor {
  return SCHEDULE_COLORS.some((color) => color.key === value);
}

export function scheduleColorValue(
  value: ScheduleColor | undefined,
  fallback: ScheduleColor,
) {
  return SCHEDULE_COLORS.find((color) => color.key === (value ?? fallback)) ??
    SCHEDULE_COLORS.find((color) => color.key === fallback)!;
}
