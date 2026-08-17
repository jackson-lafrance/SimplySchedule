import { DEFAULT_TASK_COLOR } from "@/domain/scheduleColors";
import type { ScheduleTask } from "@/domain/tasks";

function onRelativeDay(anchor: Date, dayOffset: number, hour: number) {
  return new Date(
    anchor.getFullYear(),
    anchor.getMonth(),
    anchor.getDate() + dayOffset,
    hour,
  );
}

export function createDemoTasks(anchor = new Date()): ScheduleTask[] {
  const createdAt = onRelativeDay(anchor, -2, 9);
  return [
    {
      id: "preview-send-agenda",
      title: "Send meeting agenda",
      notes: "Attach the decision notes.",
      color: DEFAULT_TASK_COLOR,
      status: "open",
      parentId: null,
      dueAt: onRelativeDay(anchor, 0, 11),
      completedAt: null,
      position: 1,
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: "preview-review-roadmap",
      title: "Review roadmap",
      notes: "",
      color: "yellow",
      status: "open",
      parentId: null,
      dueAt: onRelativeDay(anchor, 1, 15),
      completedAt: null,
      position: 2,
      createdAt,
      updatedAt: createdAt,
    },
  ];
}
