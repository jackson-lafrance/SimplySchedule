import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import AgendaList from "@/components/AgendaList";
import { usePreferences } from "@/context/PreferencesContext";
import { useSchedule } from "@/context/useSchedule";
import {
  atLocalNoon,
  getWeekDays,
  localDateKey,
  visibleRangeForWeek,
} from "@/domain/calendar";
import { expandEventsInRange } from "@/domain/recurrence";
import { colors, spacing } from "@/theme";

export default function HomeScreen() {
  const {
    events: canonicalEvents,
    tasks,
    toggleTaskCompletion,
    setVisibleRange,
  } = useSchedule();
  const { preferences } = usePreferences();
  const [today] = useState(() => atLocalNoon(new Date()));
  const [viewportHeight, setViewportHeight] = useState(0);
  const scroll = useRef<ScrollView>(null);
  const currentDayOffset = useRef<number | null>(null);
  const scrolledWeek = useRef<string | null>(null);
  const dates = useMemo(
    () => getWeekDays(today, preferences.weekStartsOn),
    [preferences.weekStartsOn, today],
  );
  const range = useMemo(
    () => visibleRangeForWeek(today, preferences.weekStartsOn),
    [preferences.weekStartsOn, today],
  );
  const events = useMemo(
    () => expandEventsInRange(canonicalEvents, range),
    [canonicalEvents, range],
  );
  const weekKey = localDateKey(dates[0]);

  useEffect(() => setVisibleRange(range), [range, setVisibleRange]);

  const scrollToCurrentDay = useCallback(() => {
    if (
      currentDayOffset.current === null ||
      viewportHeight === 0 ||
      scrolledWeek.current === weekKey
    ) {
      return;
    }
    requestAnimationFrame(() => {
      scroll.current?.scrollTo({
        y: Math.max(0, currentDayOffset.current! - spacing.sm),
        animated: false,
      });
      scrolledWeek.current = weekKey;
    });
  }, [viewportHeight, weekKey]);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: Math.max(
              spacing.xl,
              viewportHeight - spacing.xxl,
            ),
          },
        ]}
        onContentSizeChange={scrollToCurrentDay}
        onLayout={(event) => setViewportHeight(event.nativeEvent.layout.height)}
        ref={scroll}
        showsVerticalScrollIndicator={false}
      >
        <AgendaList
          currentDate={today}
          dates={dates}
          events={events}
          onToggleTask={toggleTaskCompletion}
          onCurrentDateLayout={(offset) => {
            currentDayOffset.current = offset;
            scrollToCurrentDay();
          }}
          sectioned
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
  content: {
    paddingTop: spacing.md,
  },
});
