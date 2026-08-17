import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  eventsForDate,
  tasksForDate,
  type CalendarDay,
} from "@/domain/calendar";
import type { EventOccurrence } from "@/domain/events";
import type { ScheduleTask } from "@/domain/tasks";
import { scheduleColorValue } from "@/domain/scheduleColors";
import type { WeekStart } from "@/domain/preferences";
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
          const selected = day.key === selectedKey;
          const dayEvents = eventsForDate(events, day.date);
          const dayTasks = tasksForDate(tasks, day.date);
          const itemColors = [
            ...dayTasks.map((task) => scheduleColorValue(task.color)),
            ...dayEvents.map((event) => scheduleColorValue(event.color)),
          ];
          const itemCount = itemColors.length;
          return (
            <Pressable
              accessibilityLabel={`${accessibilityDateFormatter.format(day.date)}, ${itemCount} ${
                itemCount === 1 ? "item" : "items"
              }`}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={day.key}
              onPress={() => onSelectDay(day)}
              style={({ pressed }) => [
                styles.day,
                selected && styles.selected,
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
              <View
                accessibilityElementsHidden
                style={styles.markers}
              >
                {itemColors.slice(0, 3).map((color, index) => (
                  <View
                    key={`${day.key}-marker-${index}`}
                    style={[styles.marker, { backgroundColor: color }]}
                  />
                ))}
                {itemCount > 3 ? <Text style={styles.moreMarker}>+</Text> : null}
              </View>
              {day.isToday ? <View style={styles.todayDot} /> : null}
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
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
  },
  selected: {
    backgroundColor: colors.ink,
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
  markers: {
    minHeight: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    marginTop: 2,
  },
  marker: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  moreMarker: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: "900",
    lineHeight: 9,
  },
  todayDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 2,
    backgroundColor: colors.accent,
  },
});
