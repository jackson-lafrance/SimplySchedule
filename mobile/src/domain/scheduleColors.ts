export const SCHEDULE_COLORS = [
  { id: "blue", label: "Blue", value: "#89B4FA", text: "#245A9B" },
  { id: "teal", label: "Teal", value: "#94E2D5", text: "#176B63" },
  { id: "green", label: "Green", value: "#A6E3A1", text: "#28733A" },
  { id: "yellow", label: "Yellow", value: "#F9E2AF", text: "#725A13" },
  { id: "peach", label: "Peach", value: "#FAB387", text: "#8A451F" },
  { id: "red", label: "Red", value: "#F38BA8", text: "#9A284D" },
  { id: "mauve", label: "Mauve", value: "#CBA6F7", text: "#623F8E" },
] as const;

export type ScheduleColor = (typeof SCHEDULE_COLORS)[number]["id"];

export const DEFAULT_TASK_COLOR: ScheduleColor = "green";
export const DEFAULT_EVENT_COLOR: ScheduleColor = "mauve";

export function isScheduleColor(value: unknown): value is ScheduleColor {
  return SCHEDULE_COLORS.some((color) => color.id === value);
}

function scheduleColor(color: ScheduleColor) {
  return SCHEDULE_COLORS.find((option) => option.id === color) ??
    SCHEDULE_COLORS[0];
}

export function scheduleColorValue(color: ScheduleColor) {
  return scheduleColor(color).value;
}

export function scheduleColorTextValue(color: ScheduleColor) {
  return scheduleColor(color).text;
}
