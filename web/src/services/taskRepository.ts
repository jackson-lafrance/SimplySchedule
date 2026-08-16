import {
  collection,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
  type DocumentData,
  type Firestore,
  type QueryDocumentSnapshot,
} from "firebase/firestore";

import type { VisibleRange } from "@/domain/events";
import type { ScheduleTask } from "@/domain/tasks";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function dateValue(value: unknown, field: string): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  if (isRecord(value) && typeof value.toDate === "function") {
    const date = (value.toDate as () => unknown)();
    if (date instanceof Date && !Number.isNaN(date.getTime())) {
      return date;
    }
  }
  throw new Error(`Task ${field} must be a Firestore timestamp.`);
}

function nullableDate(value: unknown, field: string) {
  return value === null ? null : dateValue(value, field);
}

export function decodeTaskDocument(id: string, value: unknown): ScheduleTask {
  if (!isRecord(value)) {
    throw new Error(`Task ${id} is not a document.`);
  }

  const { title, notes, status, parentId, position } = value;
  if (
    typeof title !== "string" ||
    !title.trim() ||
    title.length > 200 ||
    typeof notes !== "string" ||
    notes.length > 5_000 ||
    (status !== "open" && status !== "completed") ||
    (parentId !== null && typeof parentId !== "string") ||
    typeof position !== "number" ||
    !Number.isFinite(position)
  ) {
    throw new Error(`Task ${id} has invalid canonical fields.`);
  }

  return {
    id,
    title: title.trim(),
    notes,
    status,
    parentId,
    dueAt: nullableDate(value.dueAt, "dueAt"),
    completedAt: nullableDate(value.completedAt, "completedAt"),
    position,
    createdAt: dateValue(value.createdAt, "createdAt"),
    updatedAt: dateValue(value.updatedAt, "updatedAt"),
  };
}

function decodeSnapshot(document: QueryDocumentSnapshot<DocumentData>) {
  return decodeTaskDocument(
    document.id,
    document.data({ serverTimestamps: "estimate" }),
  );
}

/** Reads only open tasks due inside the same active range as calendar events. */
export function subscribeToTasksInRange(
  db: Firestore,
  userId: string,
  range: VisibleRange,
  onTasks: (tasks: ScheduleTask[]) => void,
  onError: (error: Error) => void,
) {
  const tasksQuery = query(
    collection(db, "users", userId, "tasks"),
    where("status", "==", "open"),
    where("dueAt", ">=", Timestamp.fromDate(range.start)),
    where("dueAt", "<", Timestamp.fromDate(range.end)),
    orderBy("dueAt", "asc"),
  );

  return onSnapshot(
    tasksQuery,
    (snapshot) => {
      try {
        onTasks(snapshot.docs.map(decodeSnapshot));
      } catch (error) {
        onError(
          error instanceof Error
            ? error
            : new Error("The task data could not be read."),
        );
      }
    },
    onError,
  );
}
