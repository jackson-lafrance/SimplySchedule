import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
  where,
  type DocumentData,
  type Firestore,
  type QueryDocumentSnapshot,
} from "firebase/firestore";

import {
  DEFAULT_TASK_COLOR,
  isScheduleColor,
} from "@/domain/colors";
import type { VisibleRange } from "@/domain/events";
import type { CreateTaskInput, ScheduleTask } from "@/domain/tasks";

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
  return value === null || value === undefined ? null : dateValue(value, field);
}

function taskColor(value: unknown) {
  if (value === undefined) {
    return DEFAULT_TASK_COLOR;
  }
  if (isScheduleColor(value)) {
    return value;
  }
  throw new Error("Task color is invalid.");
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
    color: taskColor(value.color),
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

/** Reads tasks in the active range so completed items remain in every projection. */
export function subscribeToTasksInRange(
  db: Firestore,
  userId: string,
  range: VisibleRange,
  onTasks: (tasks: ScheduleTask[]) => void,
  onError: (error: Error) => void,
) {
  const tasksQuery = query(
    collection(db, "users", userId, "tasks"),
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

export function encodeCreateTaskDocument(
  input: CreateTaskInput,
  lifecycleTimestamp: unknown,
  position: number,
) {
  return {
    title: input.title.trim(),
    notes: input.notes,
    status: "open" as const,
    parentId: null,
    dueAt: Timestamp.fromDate(input.dueAt),
    completedAt: null,
    position,
    color: input.color ?? DEFAULT_TASK_COLOR,
    createdAt: lifecycleTimestamp,
    updatedAt: lifecycleTimestamp,
  };
}

export async function createTask(
  db: Firestore,
  userId: string,
  input: CreateTaskInput,
) {
  const now = new Date();
  const position = Date.now();
  decodeTaskDocument("new-task", {
    title: input.title,
    notes: input.notes,
    status: "open",
    parentId: null,
    dueAt: input.dueAt,
    completedAt: null,
    position,
    color: input.color,
    createdAt: now,
    updatedAt: now,
  });
  const reference = doc(collection(db, "users", userId, "tasks"));
  const lifecycleTimestamp = serverTimestamp();
  await setDoc(
    reference,
    encodeCreateTaskDocument(input, lifecycleTimestamp, position),
  );
  return reference.id;
}

export async function completeTask(
  db: Firestore,
  userId: string,
  taskId: string,
) {
  const completedAt = serverTimestamp();
  await updateDoc(doc(db, "users", userId, "tasks", taskId), {
    status: "completed",
    completedAt,
    updatedAt: completedAt,
  });
}

/** Writes development-only preview tasks for an empty emulator user. */
export async function seedEmulatorTasks(
  db: Firestore,
  userId: string,
  tasks: ScheduleTask[],
) {
  const batch = writeBatch(db);

  tasks.forEach((task) => {
    if (!task.dueAt) {
      return;
    }
    const document = encodeCreateTaskDocument(
      {
        title: task.title,
        notes: task.notes,
        dueAt: task.dueAt,
        color: task.color ?? DEFAULT_TASK_COLOR,
      },
      Timestamp.fromDate(task.createdAt),
      task.position,
    );
    document.updatedAt = Timestamp.fromDate(task.updatedAt);
    batch.set(doc(db, "users", userId, "tasks", task.id), document);
  });

  await batch.commit();
}
