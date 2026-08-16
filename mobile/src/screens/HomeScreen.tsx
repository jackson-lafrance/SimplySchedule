import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import AgendaList from "@/components/AgendaList";
import WeekdayStrip from "@/components/WeekdayStrip";
import { usePreferences } from "@/context/PreferencesContext";
import { useSchedule } from "@/context/useSchedule";
import {
  addDays,
  atLocalNoon,
  visibleRangeForDay,
} from "@/domain/calendar";
import { expandEventsInRange } from "@/domain/recurrence";
import { colors } from "@/theme";

export default function HomeScreen() {
  const {
    events: canonicalEvents,
    tasks,
    completeTask,
    setVisibleRange,
  } = useSchedule();
  const { preferences } = usePreferences();
  const [today] = useState(() => atLocalNoon(new Date()));
  const [selectedDate, setSelectedDate] = useState(today);
  const dates = useMemo(
    () => Array.from({ length: 29 }, (_, index) => addDays(today, index - 14)),
    [today],
  );
  const range = useMemo(
    () => visibleRangeForDay(selectedDate),
    [selectedDate],
  );
  const events = useMemo(
    () => expandEventsInRange(canonicalEvents, range),
    [canonicalEvents, range],
  );

  useEffect(() => setVisibleRange(range), [range, setVisibleRange]);

  return (
    <View style={styles.container}>
      <WeekdayStrip
        dates={dates}
        onSelectDate={setSelectedDate}
        selectedDate={selectedDate}
      />
      <ScrollView showsVerticalScrollIndicator={false}>
        <AgendaList
          dates={[selectedDate]}
          events={events}
          onCompleteTask={completeTask}
          tasks={tasks}
          timeDisplay={preferences.timeDisplay}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
