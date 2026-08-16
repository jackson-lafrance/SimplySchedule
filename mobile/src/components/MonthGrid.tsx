import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  eventsForDate,
  tasksForDate,
  type CalendarDay,
} from "@/domain/calendar";
import type { EventOccurrence } from "@/domain/events";
import type { WeekStart } from "@/domain/preferences";
import type { ScheduleTask } from "@/domain/tasks";
import { colors, radii, spacing, typography } from "@/theme";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const accessibilityDateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});

export default function MonthGrid({
  days,
  events,
  tasks,
  selectedKey,
  weekStartsOn,
  onSelectDay,
}: {
  days: CalendarDay[];
  events: EventOccurrence[];
  tasks: ScheduleTask[];
  selectedKey: string;
  weekStartsOn: WeekStart;
  onSelectDay: (day: CalendarDay) => void;
}) {
  const weekdays = weekStartsOn === 0
    ? WEEKDAYS
    : [...WEEKDAYS.slice(1), WEEKDAYS[0]];
  return (
    <View>
      <View style={styles.weekdays}>
        {weekdays.map((day, index) => (
          <Text
            key={`${day}-${index}`}
            maxFontSizeMultiplier={1.3}
            style={styles.weekday}
          >
            {day}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {days.map((day) => {
          const count =
            eventsForDate(events, day.date).length +
            tasksForDate(tasks, day.date).length;
          const selected = day.key === selectedKey;
          return (
            <Pressable
              accessibilityLabel={`${accessibilityDateFormatter.format(day.date)}, ${count} items`}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={day.key}
              onPress={() => onSelectDay(day)}
              style={({ pressed }) => [
                styles.day,
                selected && styles.selected,
                day.isToday && !selected && styles.today,
                pressed && styles.pressed,
              ]}
            >
              <Text
                maxFontSizeMultiplier={1.3}
                style={[
                  styles.dayNumber,
                  !day.isCurrentMonth && styles.outside,
                  selected && styles.selectedText,
                ]}
              >
                {day.dayNumber}
              </Text>
              {count > 0 ? (
                <View style={[styles.dot, selected && styles.selectedDot]} />
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  weekdays: {
    flexDirection: "row",
    marginBottom: spacing.xs,
  },
  weekday: {
    ...typography.label,
    color: colors.muted,
    flexBasis: "14.285714%",
    textAlign: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radii.card,
    paddingVertical: spacing.xxs,
    overflow: "hidden",
  },
  day: {
    flexBasis: "14.285714%",
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
  },
  selected: {
    backgroundColor: colors.ink,
  },
  today: {
    backgroundColor: colors.surfaceMuted,
  },
  pressed: {
    opacity: 0.6,
  },
  dayNumber: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "900",
  },
  outside: {
    color: colors.muted,
  },
  selectedText: {
    color: colors.inverse,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
    backgroundColor: colors.ink,
  },
  selectedDot: {
    backgroundColor: colors.success,
  },
});
