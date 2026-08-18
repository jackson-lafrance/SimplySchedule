import assert from "node:assert/strict";
import test from "node:test";
import { deleteApp, initializeApp } from "firebase/app";
import {
  connectAuthEmulator,
  getAuth,
  signInAnonymously,
} from "firebase/auth";
import {
  collection,
  connectFirestoreEmulator,
  doc,
  getDocs,
  getFirestore,
  setDoc,
  Timestamp,
} from "firebase/firestore";

import type { CreateEventInput, RecurrenceRule } from "@/domain/events";
import { expandEventsInRange } from "@/domain/recurrence";
import type { ScheduleTask } from "@/domain/tasks";
import {
  createEvent,
  subscribeToEventsInRange,
} from "@/services/eventRepository";
import {
  completeTask,
  createTask,
  setTaskCompletion,
  subscribeToTasksInRange,
} from "@/services/taskRepository";

const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST?.split(":")[0] ??
  "127.0.0.1";
const firestorePort = Number(
  process.env.FIRESTORE_EMULATOR_HOST?.split(":")[1] ?? 8080,
);
const authPort = Number(
  process.env.FIREBASE_AUTH_EMULATOR_HOST?.split(":")[1] ?? 9099,
);

function recurrence(
  overrides: Partial<RecurrenceRule>,
): RecurrenceRule {
  return {
    version: 1,
    frequency: "daily",
    interval: 1,
    daysOfWeek: null,
    dayOfMonth: null,
    weekOfMonth: null,
    monthOfYear: null,
    termination: { type: "never", until: null, count: null },
    ...overrides,
  };
}

function repeating(
  title: string,
  startsAt: string,
  rule: RecurrenceRule,
): CreateEventInput {
  const start = new Date(startsAt);
  return {
    title,
    notes: `Emulator proof for ${title}.`,
    color: "mauve",
    kind: "repeating",
    startsAt: start,
    endsAt: new Date(start.getTime() + 60 * 60 * 1_000),
    allDay: false,
    timeZone: "UTC",
    recurrence: rule,
  };
}

function single(
  title: string,
  startsAt: string,
  endsAt: string | null,
): CreateEventInput {
  return {
    title,
    notes: "Visible-range query proof.",
    color: "blue",
    kind: "single",
    startsAt: new Date(startsAt),
    endsAt: endsAt ? new Date(endsAt) : null,
    allDay: false,
    timeZone: "UTC",
    recurrence: null,
  };
}

test("persists tasks and flexible events through shared emulators", async () => {
  const app = initializeApp(
    {
      apiKey: "demo-api-key",
      appId: "1:1234567890:ios:simply-schedule-test",
      authDomain: "simply-schedule.firebaseapp.com",
      projectId: "simply-schedule",
    },
    `mobile-emulator-${Date.now()}`,
  );
  const auth = getAuth(app);
  const db = getFirestore(app);
  connectAuthEmulator(auth, `http://${emulatorHost}:${authPort}`, {
    disableWarnings: true,
  });
  connectFirestoreEmulator(db, emulatorHost, firestorePort);

  try {
    const user = (await signInAnonymously(auth)).user;
    const inputs: CreateEventInput[] = [
      repeating(
        "First of month",
        "2026-08-01T09:00:00.000Z",
        recurrence({ frequency: "monthly", dayOfMonth: 1 }),
      ),
      repeating(
        "Third Friday",
        "2026-08-21T09:00:00.000Z",
        recurrence({
          frequency: "monthly",
          daysOfWeek: [5],
          weekOfMonth: 3,
        }),
      ),
      repeating(
        "Every other day",
        "2026-08-11T09:00:00.000Z",
        recurrence({ interval: 2 }),
      ),
      repeating(
        "Every three days",
        "2026-08-11T09:00:00.000Z",
        recurrence({ interval: 3 }),
      ),
      repeating(
        "Every five hours",
        "2026-08-11T00:00:00.000Z",
        recurrence({ frequency: "hourly", interval: 5 }),
      ),
      repeating(
        "Monday and Friday",
        "2026-08-14T09:00:00.000Z",
        recurrence({
          frequency: "weekly",
          interval: 2,
          daysOfWeek: [1, 5],
        }),
      ),
      single("Point event", "2026-08-11T13:00:00.000Z", null),
      single(
        "Overlapping duration",
        "2026-07-31T23:30:00.000Z",
        "2026-08-01T00:30:00.000Z",
      ),
    ];

    const ids = await Promise.all(
      inputs.map((input) => createEvent(db, user.uid, input)),
    );
    assert.equal(new Set(ids).size, inputs.length);

    const persisted = await getDocs(
      collection(db, "users", user.uid, "events"),
    );
    assert.equal(persisted.size, inputs.length);
    for (const eventDocument of persisted.docs) {
      const data = eventDocument.data();
      assert.deepEqual(Object.keys(data).sort(), [
        "allDay",
        "color",
        "createdAt",
        "endsAt",
        "kind",
        "notes",
        "recurrence",
        "startsAt",
        "timeZone",
        "title",
        "updatedAt",
      ]);
      assert.ok(data.createdAt instanceof Timestamp);
      assert.ok(data.updatedAt instanceof Timestamp);
      assert.equal("id" in data, false);
    }

    const range = {
      start: new Date("2026-08-01T00:00:00.000Z"),
      end: new Date("2026-10-01T00:00:00.000Z"),
    };
    const candidates = await new Promise<Parameters<typeof expandEventsInRange>[0]>(
      (resolve, reject) => {
        let unsubscribe: (() => void) | undefined;
        const timeout = setTimeout(() => {
          unsubscribe?.();
          reject(new Error("Timed out waiting for visible-range snapshots."));
        }, 10_000);
        unsubscribe = subscribeToEventsInRange(
          db,
          user.uid,
          range,
          (events) => {
            if (events.length === inputs.length) {
              clearTimeout(timeout);
              unsubscribe?.();
              resolve(events);
            }
          },
          (error) => {
            clearTimeout(timeout);
            unsubscribe?.();
            reject(error);
          },
        );
      },
    );

    assert.equal(candidates.length, inputs.length);
    assert.ok(candidates.some((event) => event.title === "Overlapping duration"));

    const taskId = await createTask(db, user.uid, {
      title: "Send emulator agenda",
      notes: "Task persistence proof.",
      color: "green",
      dueAt: new Date("2026-08-11T16:30:00.000Z"),
    });
    const visibleTasks = await new Promise<ScheduleTask[]>((resolve, reject) => {
      let unsubscribe: (() => void) | undefined;
      const timeout = setTimeout(() => {
        unsubscribe?.();
        reject(new Error("Timed out waiting for task snapshots."));
      }, 10_000);
      unsubscribe = subscribeToTasksInRange(
        db,
        user.uid,
        range,
        (tasks) => {
          if (tasks.some((task) => task.id === taskId)) {
            clearTimeout(timeout);
            unsubscribe?.();
            resolve(tasks);
          }
        },
        (error) => {
          clearTimeout(timeout);
          unsubscribe?.();
          reject(error);
        },
      );
    });
    assert.equal(visibleTasks.find((task) => task.id === taskId)?.status, "open");
    const persistedTasks = await getDocs(
      collection(db, "users", user.uid, "tasks"),
    );
    assert.equal(persistedTasks.size, 1);
    assert.deepEqual(Object.keys(persistedTasks.docs[0].data()).sort(), [
      "color",
      "completedAt",
      "createdAt",
      "dueAt",
      "notes",
      "parentId",
      "position",
      "status",
      "title",
      "updatedAt",
    ]);
    await completeTask(db, user.uid, taskId);
    const completedTasks = await getDocs(
      collection(db, "users", user.uid, "tasks"),
    );
    assert.equal(completedTasks.docs[0].data().status, "completed");
    assert.ok(completedTasks.docs[0].data().completedAt instanceof Timestamp);

    const completedVisibleTasks = await new Promise<ScheduleTask[]>(
      (resolve, reject) => {
        let unsubscribe: (() => void) | undefined;
        const timeout = setTimeout(() => {
          unsubscribe?.();
          reject(new Error("Timed out waiting for completed task snapshots."));
        }, 10_000);
        unsubscribe = subscribeToTasksInRange(
          db,
          user.uid,
          range,
          (tasks) => {
            if (
              tasks.some(
                (task) => task.id === taskId && task.status === "completed",
              )
            ) {
              clearTimeout(timeout);
              unsubscribe?.();
              resolve(tasks);
            }
          },
          (error) => {
            clearTimeout(timeout);
            unsubscribe?.();
            reject(error);
          },
        );
      },
    );
    assert.equal(
      completedVisibleTasks.find((task) => task.id === taskId)?.status,
      "completed",
    );

    await setTaskCompletion(db, user.uid, taskId, false);
    const reopenedTasks = await getDocs(
      collection(db, "users", user.uid, "tasks"),
    );
    assert.equal(reopenedTasks.docs[0].data().status, "open");
    assert.equal(reopenedTasks.docs[0].data().completedAt, null);

    const reopenedVisibleTasks = await new Promise<ScheduleTask[]>(
      (resolve, reject) => {
        let unsubscribe: (() => void) | undefined;
        const timeout = setTimeout(() => {
          unsubscribe?.();
          reject(new Error("Timed out waiting for reopened task snapshots."));
        }, 10_000);
        unsubscribe = subscribeToTasksInRange(
          db,
          user.uid,
          range,
          (tasks) => {
            if (
              tasks.some(
                (task) => task.id === taskId && task.status === "open",
              )
            ) {
              clearTimeout(timeout);
              unsubscribe?.();
              resolve(tasks);
            }
          },
          (error) => {
            clearTimeout(timeout);
            unsubscribe?.();
            reject(error);
          },
        );
      },
    );
    assert.equal(
      reopenedVisibleTasks.find((task) => task.id === taskId)?.status,
      "open",
    );

    const proofDay = {
      start: new Date("2026-08-11T00:00:00.000Z"),
      end: new Date("2026-08-12T00:00:00.000Z"),
    };
    const occurrences = expandEventsInRange(candidates, proofDay);
    assert.equal(
      occurrences.filter((event) => event.title === "Every five hours").length,
      5,
    );
    assert.equal(
      occurrences.filter((event) => event.title === "Every other day").length,
      1,
    );
    assert.equal(
      occurrences.filter((event) => event.title === "Every three days").length,
      1,
    );
    assert.equal(
      occurrences.filter((event) => event.title === "Point event").length,
      1,
    );
    assert.ok(
      occurrences.every(
        (event) =>
          event.startsAt < proofDay.end &&
          (event.endsAt === null || event.endsAt > proofDay.start),
      ),
    );

    const legacyTimestamp = Timestamp.fromDate(
      new Date("2030-01-01T09:00:00.000Z"),
    );
    await setDoc(doc(db, "users", user.uid, "events", "legacy-web-event"), {
      title: "Legacy web event",
      notes: "",
      kind: "single",
      startsAt: legacyTimestamp,
      endsAt: null,
      allDay: false,
      timeZone: "UTC",
      recurrence: null,
      createdAt: legacyTimestamp,
      updatedAt: legacyTimestamp,
    });
    await setDoc(doc(db, "users", user.uid, "tasks", "legacy-web-task"), {
      title: "Legacy web task",
      notes: "",
      status: "open",
      parentId: null,
      dueAt: legacyTimestamp,
      completedAt: null,
      position: 2,
      createdAt: legacyTimestamp,
      updatedAt: legacyTimestamp,
    });
  } finally {
    await deleteApp(app);
  }
});
