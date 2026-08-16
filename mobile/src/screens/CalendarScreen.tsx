import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import AgendaList from "@/components/AgendaList";
import MonthGrid from "@/components/MonthGrid";
import SegmentedControl from "@/components/SegmentedControl";
import WeekdayStrip from "@/components/WeekdayStrip";
import { usePreferences } from "@/context/PreferencesContext";
import { useSchedule } from "@/context/useSchedule";
import {
  addDays,
  addMonths,
  atLocalNoon,
  getMonthDays,
  localDateKey,
  startOfMonth,
  visibleRangeForDay,
  visibleRangeForMonth,
  visibleRangeForWeek,
} from "@/domain/calendar";
import type { CalendarMode } from "@/domain/preferences";
import { expandEventsInRange } from "@/domain/recurrence";
import { colors, spacing } from "@/theme";

const dayTitle = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
});
const monthTitle = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});

export default function CalendarScreen() {
  const {
    events: canonicalEvents,
    tasks,
    completeTask,
    setVisibleRange,
  } = useSchedule();
  const { preferences } = usePreferences();
  const [mode, setMode] = useState<CalendarMode>(
    preferences.defaultCalendarView,
  );
  const [selectedDate, setSelectedDate] = useState(() =>
    atLocalNoon(new Date()),
  );

  const range = useMemo(() => {
    if (mode === "day") return visibleRangeForDay(selectedDate);
    if (mode === "week") {
      return visibleRangeForWeek(selectedDate, preferences.weekStartsOn);
    }
    return visibleRangeForMonth(selectedDate, preferences.weekStartsOn);
  }, [mode, preferences.weekStartsOn, selectedDate]);
  const events = useMemo(
    () => expandEventsInRange(canonicalEvents, range),
    [canonicalEvents, range],
  );
  const stripDates = useMemo(
    () =>
      Array.from({ length: 29 }, (_, index) =>
        addDays(selectedDate, index - 14),
      ),
    [selectedDate],
  );
  const monthDays = useMemo(
    () =>
      getMonthDays(selectedDate, new Date(), preferences.weekStartsOn),
    [preferences.weekStartsOn, selectedDate],
  );

  useEffect(() => setVisibleRange(range), [range, setVisibleRange]);

  const heading =
    mode === "month"
      ? monthTitle.format(selectedDate)
      : dayTitle.format(selectedDate);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text
          adjustsFontSizeToFit
          accessibilityRole="header"
          minimumFontScale={0.72}
          numberOfLines={1}
          style={styles.title}
        >
          {heading.toUpperCase()}
        </Text>
        <SegmentedControl
          accessibilityLabel="Calendar view"
          onChange={setMode}
          options={[
            { value: "day", label: "DAY" },
            { value: "week", label: "WEEK" },
            { value: "month", label: "MONTH" },
          ]}
          value={mode}
        />
      </View>

      {mode === "month" ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.monthNavigation}>
            <Pressable
              accessibilityLabel="Previous month"
              accessibilityRole="button"
              onPress={() =>
                setSelectedDate((date) => addMonths(startOfMonth(date), -1))
              }
              style={({ pressed }) => [pressed && styles.pressed]}
            >
              <Text style={styles.navigationText}>PREV</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Next month"
              accessibilityRole="button"
              onPress={() =>
                setSelectedDate((date) => addMonths(startOfMonth(date), 1))
              }
              style={({ pressed }) => [pressed && styles.pressed]}
            >
              <Text style={styles.navigationText}>NEXT</Text>
            </Pressable>
          </View>
          <View style={styles.monthContent}>
            <MonthGrid
              days={monthDays}
              events={events}
              onSelectDay={(day) => setSelectedDate(day.date)}
              selectedKey={localDateKey(selectedDate)}
              tasks={tasks}
              weekStartsOn={preferences.weekStartsOn}
            />
          </View>
          <AgendaList
            dates={[selectedDate]}
            events={events}
            onCompleteTask={completeTask}
            tasks={tasks}
            timeDisplay={preferences.timeDisplay}
          />
        </ScrollView>
      ) : (
        <>
          <WeekdayStrip
            dates={stripDates}
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
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  title: {
    color: colors.ink,
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.5,
    textTransform: "uppercase",
  },
  monthNavigation: {
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  navigationText: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: "900",
  },
  pressed: {
    opacity: 0.5,
  },
  monthContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
});
