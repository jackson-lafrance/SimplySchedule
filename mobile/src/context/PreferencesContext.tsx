import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  DEFAULT_PREFERENCES,
  parsePreferences,
  type SchedulePreferences,
} from "@/domain/preferences";

const STORAGE_KEY = "simply-schedule:preferences:v1";

type PreferencesContextValue = {
  preferences: SchedulePreferences;
  setPreference: <Key extends keyof SchedulePreferences>(
    key: Key,
    value: SchedulePreferences[Key],
  ) => void;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!active || !stored) return;
        setPreferences(parsePreferences(JSON.parse(stored)));
      })
      .catch((error) => console.error("Could not load schedule preferences", error));
    return () => {
      active = false;
    };
  }, []);

  const setPreference = useCallback(
    <Key extends keyof SchedulePreferences>(
      key: Key,
      value: SchedulePreferences[Key],
    ) => {
      setPreferences((current) => {
        const next = { ...current, [key]: value };
        void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(
          (error) => console.error("Could not save schedule preferences", error),
        );
        return next;
      });
    },
    [],
  );

  const value = useMemo(
    () => ({ preferences, setPreference }),
    [preferences, setPreference],
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error("usePreferences must be used inside its provider.");
  return value;
}
