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
  getMonthDays,
  getWeekDays,
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
const shortMonth = new Intl.DateTimeFormat("en-US", { month: "short" });

function weekTitle(days: Date[]) {
  const first = days[0];
  const last = days[days.length - 1];
  if (first.getMonth() === last.getMonth()) {
    return `${shortMonth.format(first)} ${first.getDate()}–${last.getDate()}`;
  }
  return `${shortMonth.format(first)} ${first.getDate()}–${shortMonth.format(last)} ${last.getDate()}`;
}

function PeriodNavigation({
  onPrevious,
  onNext,
  period,
}: {
  onPrevious: () => void;
  onNext: () => void;
  period: "day" | "week" | "month";
}) {
  return (
    <View style={styles.periodNavigation}>
      <Pressable
        accessibilityLabel={`Previous ${period}`}
        accessibilityRole="button"
        onPress={onPrevious}
        style={({ pressed }) => [
          styles.navigationButton,
          pressed && styles.pressed,
        ]}
      >
        <Text maxFontSizeMultiplier={1.3} style={styles.navigationText}>
          PREV
        </Text>
      </Pressable>
      <Pressable
        accessibilityLabel={`Next ${period}`}
        accessibilityRole="button"
        onPress={onNext}
        style={({ pressed }) => [
          styles.navigationButton,
          pressed && styles.pressed,
        ]}
      >
        <Text maxFontSizeMultiplier={1.3} style={styles.navigationText}>
          NEXT
        </Text>
      </Pressable>
    </View>
  );
}

export default function CalendarScreen({
  selectedDate,
  onSelectDate,
}: {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}) {
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

  useEffect(() => {
    setMode(preferences.defaultCalendarView);
  }, [preferences.defaultCalendarView]);

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
  const weekDays = useMemo(
    () => getWeekDays(selectedDate, preferences.weekStartsOn),
    [preferences.weekStartsOn, selectedDate],
  );
  const monthDays = useMemo(
    () => getMonthDays(selectedDate, new Date(), preferences.weekStartsOn),
    [preferences.weekStartsOn, selectedDate],
  );

  useEffect(() => setVisibleRange(range), [range, setVisibleRange]);

  const heading = mode === "month"
    ? monthTitle.format(selectedDate)
    : mode === "week"
      ? weekTitle(weekDays)
      : dayTitle.format(selectedDate);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text
          adjustsFontSizeToFit
          accessibilityRole="header"
          maxFontSizeMultiplier={1.3}
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

      <ScrollView showsVerticalScrollIndicator={false}>
        {mode === "day" ? (
          <PeriodNavigation
            onNext={() => onSelectDate(addDays(selectedDate, 1))}
            onPrevious={() => onSelectDate(addDays(selectedDate, -1))}
            period="day"
          />
        ) : null}

        {mode === "week" ? (
          <>
            <PeriodNavigation
              onNext={() => onSelectDate(addDays(selectedDate, 7))}
              onPrevious={() => onSelectDate(addDays(selectedDate, -7))}
              period="week"
            />
            <WeekdayStrip
              dates={weekDays}
              fitted
              onSelectDate={onSelectDate}
              selectedDate={selectedDate}
            />
          </>
        ) : null}

        {mode === "month" ? (
          <>
            <PeriodNavigation
              onNext={() =>
                onSelectDate(addMonths(startOfMonth(selectedDate), 1))
              }
              onPrevious={() =>
                onSelectDate(addMonths(startOfMonth(selectedDate), -1))
              }
              period="month"
            />
            <View style={styles.monthContent}>
              <MonthGrid
                days={monthDays}
                events={events}
                onSelectDay={(day) => onSelectDate(day.date)}
                selectedKey={localDateKey(selectedDate)}
                tasks={tasks}
                weekStartsOn={preferences.weekStartsOn}
              />
            </View>
          </>
        ) : null}

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
  periodNavigation: {
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  navigationButton: {
    minWidth: 56,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
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
