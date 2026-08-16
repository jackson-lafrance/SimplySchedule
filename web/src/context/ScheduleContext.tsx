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
import { getFirebaseClient, getOrCreateScheduleUser } from "@/lib/firebase";
import {
  createEvent as persistEvent,
  seedEmulatorEvents,
  subscribeToEventsInRange,
} from "@/services/eventRepository";
import { subscribeToTasksInRange } from "@/services/taskRepository";

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
  const [loadAttempt, setLoadAttempt] = useState(0);
  const userIdRef = useRef<string | null>(null);
  const seededEmulatorRef = useRef(false);

  useEffect(() => {
    if (!configuredClient) {
      return;
    }

    let active = true;
    let failed = false;
    let eventsReady = false;
    let tasksReady = false;
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

    void getOrCreateScheduleUser(configuredClient.auth)
      .then((user) => {
        if (!active) {
          return;
        }
        userIdRef.current = user.uid;

        unsubscribes.push(
          subscribeToEventsInRange(
            configuredClient.db,
            user.uid,
            visibleRange,
            (events) => {
              if (
                configuredClient.seedEmulator &&
                events.length === 0 &&
                !seededEmulatorRef.current
              ) {
                seededEmulatorRef.current = true;
                void seedEmulatorEvents(
                  configuredClient.db,
                  user.uid,
                  createDemoEvents(),
                ).catch(fail);
                return;
              }
              markReady("events", events);
            },
            fail,
          ),
          subscribeToTasksInRange(
            configuredClient.db,
            user.uid,
            visibleRange,
            (tasks) => markReady("tasks", tasks),
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
    setVisibleRangeState((current) => (sameRange(current, range) ? current : range));
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

    const userId = userIdRef.current;
    if (!userId) {
      throw new Error("THE SCHEDULE IS STILL CONNECTING. TRY AGAIN.");
    }
    return persistEvent(configuredClient.db, userId, input);
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
      retry,
    }),
    [createEvent, retry, setVisibleRange, state, visibleRange],
  );

  return (
    <ScheduleContext.Provider value={value}>
      {children}
    </ScheduleContext.Provider>
  );
}
