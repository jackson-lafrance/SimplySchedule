import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  ScheduleContext,
  type ScheduleState,
} from "@/context/scheduleContextValue";
import { createDemoEvents } from "@/domain/demoEvents";
import { getFirebaseClient, getOrCreateScheduleUser } from "@/lib/firebase";
import {
  seedEmulatorEvents,
  subscribeToSingleEvents,
} from "@/services/eventRepository";

const configuredClient = getFirebaseClient();
const initialState: ScheduleState = configuredClient
  ? {
      events: [],
      status: "loading",
      source: "firebase",
      errorMessage: null,
      lastUpdatedAt: null,
    }
  : {
      events: createDemoEvents(),
      status: "ready",
      source: "preview",
      errorMessage: null,
      lastUpdatedAt: null,
    };

function readableScheduleError(error: unknown) {
  console.error(error);
  return "THE SCHEDULE COULD NOT SYNC. CHECK FIREBASE AND TRY AGAIN.";
}

export function ScheduleProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ScheduleState>(initialState);
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    if (!configuredClient) {
      return;
    }

    let active = true;
    let unsubscribe: (() => void) | undefined;
    let seedStarted = false;

    const fail = (error: unknown) => {
      if (!active) {
        return;
      }

      setState((current) => ({
        ...current,
        status: "error",
        errorMessage: readableScheduleError(error),
      }));
    };

    void getOrCreateScheduleUser(configuredClient.auth)
      .then((user) => {
        if (!active) {
          return;
        }

        unsubscribe = subscribeToSingleEvents(
          configuredClient.db,
          user.uid,
          (events) => {
            if (
              configuredClient.seedEmulator &&
              events.length === 0 &&
              !seedStarted
            ) {
              seedStarted = true;
              void seedEmulatorEvents(
                configuredClient.db,
                user.uid,
                createDemoEvents(),
              ).catch(fail);
              return;
            }

            if (!active) {
              return;
            }

            setState({
              events,
              status: "ready",
              source: "firebase",
              errorMessage: null,
              lastUpdatedAt: new Date(),
            });
          },
          fail,
        );
      })
      .catch(fail);

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [loadAttempt]);

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

  const value = useMemo(() => ({ ...state, retry }), [retry, state]);

  return (
    <ScheduleContext.Provider value={value}>
      {children}
    </ScheduleContext.Provider>
  );
}
