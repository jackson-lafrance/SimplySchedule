import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  ScheduleContext,
  type ScheduleState,
} from "@/context/scheduleContextValue";
import { visibleRangeForMonth } from "@/domain/calendar";
import { createDemoEvents } from "@/domain/demoEvents";
import { createDemoTasks } from "@/domain/demoTasks";
import type { CreateEventInput, VisibleRange } from "@/domain/events";
import type { CreateTaskInput } from "@/domain/tasks";
import { getFirebaseClient, getOrCreateScheduleUser } from "@/lib/firebase";
import {
  createEvent as persistEvent,
  seedEmulatorEvents,
  subscribeToEventsInRange,
} from "@/services/eventRepository";
import {
  completeTask as persistTaskCompletion,
  createTask as persistTask,
  seedEmulatorTasks,
  subscribeToTasksInRange,
} from "@/services/taskRepository";

const configuredClient = getFirebaseClient();
const previewEvents = createDemoEvents();
const initialState: ScheduleState = configuredClient
  ? {
      events: [],
      tasks: [],
      status: "loading",
      source: "firebase",
      errorMessage: null,
      lastUpdatedAt: null,
    }
  : {
      events: previewEvents,
      tasks: createDemoTasks(),
      status: "ready",
      source: "preview",
      errorMessage: null,
      lastUpdatedAt: null,
    };

function readableScheduleError(error: unknown) {
  console.error(error);
  return "THE SCHEDULE COULD NOT SYNC. CHECK FIREBASE AND TRY AGAIN.";
}

function sameRange(left: VisibleRange, right: VisibleRange) {
  return (
    left.start.getTime() === right.start.getTime() &&
    left.end.getTime() === right.end.getTime()
  );
}

export function ScheduleProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ScheduleState>(initialState);
  const [visibleRange, setVisibleRangeState] = useState(() =>
    visibleRangeForMonth(new Date()),
  );
  const visibleRangeRef = useRef(visibleRange);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const userIdRef = useRef<string | null>(null);
  const userReadyRef = useRef<Promise<string> | null>(null);
  const seededEmulatorRef = useRef(false);

  useEffect(() => {
    if (!configuredClient) {
      return;
    }

    let active = true;
    let failed = false;
    let eventsReady = false;
    let tasksReady = false;
    let eventsFirstSnapshot = false;
    let tasksFirstSnapshot = false;
    let eventsEmpty = false;
    let tasksEmpty = false;
    const unsubscribes: (() => void)[] = [];

    const fail = (error: unknown) => {
      if (!active || failed) {
        return;
      }
      failed = true;
      setState((current) => ({
        ...current,
        status: "error",
        errorMessage: readableScheduleError(error),
      }));
    };
    const markReady = <Key extends "events" | "tasks">(
      key: Key,
      value: ScheduleState[Key],
    ) => {
      if (!active || failed) {
        return;
      }
      if (key === "events") eventsReady = true;
      if (key === "tasks") tasksReady = true;
      const scheduleReady = eventsReady && tasksReady;
      setState((current) => ({
        ...current,
        [key]: value,
        status: scheduleReady ? "ready" : "loading",
        source: "firebase",
        errorMessage: null,
        lastUpdatedAt: scheduleReady ? new Date() : current.lastUpdatedAt,
      }));
    };
    const seedEmulatorSchedule = (userId: string) => {
      if (
        !configuredClient.seedEmulator ||
        seededEmulatorRef.current ||
        (!eventsFirstSnapshot && !tasksFirstSnapshot) ||
        (!eventsEmpty && !tasksEmpty)
      ) {
        return false;
      }
      seededEmulatorRef.current = true;
      void Promise.all([
        seedEmulatorEvents(configuredClient.db, userId, createDemoEvents()),
        seedEmulatorTasks(configuredClient.db, userId, createDemoTasks()),
      ]).catch((error) => {
        seededEmulatorRef.current = false;
        fail(error);
      });
      return true;
    };

    const userReady = getOrCreateScheduleUser(configuredClient.auth).then(
      (user) => user.uid,
    );
    userReadyRef.current = userReady;

    void userReady
      .then((userId) => {
        if (!active) {
          return;
        }
        userIdRef.current = userId;

        unsubscribes.push(
          subscribeToEventsInRange(
            configuredClient.db,
            userId,
            visibleRange,
            (events) => {
              if (!eventsFirstSnapshot) {
                eventsFirstSnapshot = true;
                eventsEmpty = events.length === 0;
              }
              if (seedEmulatorSchedule(userId)) {
                return;
              }
              markReady("events", events);
            },
            fail,
          ),
          subscribeToTasksInRange(
            configuredClient.db,
            userId,
            visibleRange,
            (tasks) => {
              if (!tasksFirstSnapshot) {
                tasksFirstSnapshot = true;
                tasksEmpty = tasks.length === 0;
              }
              if (seedEmulatorSchedule(userId)) {
                return;
              }
              markReady("tasks", tasks);
            },
            fail,
          ),
        );
      })
      .catch(fail);

    return () => {
      active = false;
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [loadAttempt, visibleRange]);

  const setVisibleRange = useCallback((range: VisibleRange) => {
    if (sameRange(visibleRangeRef.current, range)) {
      return;
    }
    visibleRangeRef.current = range;
    setState((current) => ({
      ...current,
      status: "loading",
      errorMessage: null,
    }));
    setVisibleRangeState(range);
  }, []);

  const createEvent = useCallback(async (input: CreateEventInput) => {
    if (!configuredClient) {
      const now = new Date();
      const id = globalThis.crypto?.randomUUID?.() ?? `preview-${now.getTime()}`;
      setState((current) => ({
        ...current,
        events: [
          ...current.events,
          { ...input, id, createdAt: now, updatedAt: now },
        ],
        lastUpdatedAt: now,
      }));
      return id;
    }

    const userId =
      userIdRef.current ?? (await userReadyRef.current);
    if (!userId) {
      throw new Error("THE SCHEDULE IS STILL CONNECTING. TRY AGAIN.");
    }
    return persistEvent(configuredClient.db, userId, input);
  }, []);

  const createTask = useCallback(async (input: CreateTaskInput) => {
    if (!configuredClient) {
      const now = new Date();
      const id = globalThis.crypto?.randomUUID?.() ?? `preview-task-${now.getTime()}`;
      setState((current) => ({
        ...current,
        tasks: [
          ...current.tasks,
          {
            ...input,
            id,
            status: "open",
            parentId: null,
            completedAt: null,
            position: now.getTime(),
            createdAt: now,
            updatedAt: now,
          },
        ],
        lastUpdatedAt: now,
      }));
      return id;
    }
    const userId =
      userIdRef.current ?? (await userReadyRef.current);
    if (!userId) {
      throw new Error("THE SCHEDULE IS STILL CONNECTING. TRY AGAIN.");
    }
    return persistTask(configuredClient.db, userId, input);
  }, []);

  const completeTask = useCallback(async (taskId: string) => {
    if (!configuredClient) {
      const completedAt = new Date();
      setState((current) => ({
        ...current,
        tasks: current.tasks.map((task) =>
          task.id === taskId
            ? { ...task, status: "completed", completedAt, updatedAt: completedAt }
            : task,
        ),
        lastUpdatedAt: completedAt,
      }));
      return;
    }
    if (!userIdRef.current) {
      throw new Error("THE SCHEDULE IS STILL CONNECTING. TRY AGAIN.");
    }
    await persistTaskCompletion(configuredClient.db, userIdRef.current, taskId);
  }, []);

  const retry = useCallback(() => {
    if (!configuredClient) {
      return;
    }

    setState((current) => ({
      ...current,
      status: "loading",
      errorMessage: null,
    }));
    setLoadAttempt((attempt) => attempt + 1);
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      visibleRange,
      setVisibleRange,
      createEvent,
      createTask,
      completeTask,
      retry,
    }),
    [
      completeTask,
      createEvent,
      createTask,
      retry,
      setVisibleRange,
      state,
      visibleRange,
    ],
  );

  return (
    <ScheduleContext.Provider value={value}>
      {children}
    </ScheduleContext.Provider>
  );
}
