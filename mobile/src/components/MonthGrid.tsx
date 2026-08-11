import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  eventsForDate,
  type CalendarDay,
} from "@/domain/calendar";
import type { EventOccurrence } from "@/domain/events";
import { colors, radii, spacing, typography } from "@/theme";

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const accessibilityDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "long",
  weekday: "long",
  year: "numeric",
});

export default function MonthGrid({
  days,
  events,
  selectedKey,
  onSelectDay,
}: {
  days: CalendarDay[];
  events: EventOccurrence[];
  selectedKey: string;
  onSelectDay: (day: CalendarDay) => void;
}) {
  return (
    <View>
      <View accessibilityRole="header" style={styles.weekdays}>
        {WEEKDAYS.map((weekday) => (
          <Text key={weekday} style={styles.weekday}>
            {weekday.slice(0, 1)}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {days.map((day, index) => {
          const eventCount = eventsForDate(events, day.date).length;
          const isSelected = day.key === selectedKey;

          return (
            <Pressable
              accessibilityLabel={`${accessibilityDateFormatter.format(day.date)}, ${eventCount} ${eventCount === 1 ? "event" : "events"}`}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              hitSlop={2}
              key={day.key}
              onPress={() => onSelectDay(day)}
              style={({ pressed }) => [
                styles.day,
                index % 7 === 6 && styles.lastColumn,
                index >= 35 && styles.lastRow,
                isSelected && styles.selectedDay,
                day.isToday && !isSelected && styles.today,
                pressed && styles.pressedDay,
              ]}
            >
              <Text
                style={[
                  styles.dayNumber,
                  !day.isCurrentMonth && styles.outsideNumber,
                  isSelected && styles.selectedNumber,
                ]}
              >
                {day.dayNumber}
              </Text>
              {eventCount > 0 ? (
                <View style={styles.dots}>
                  {Array.from({ length: Math.min(eventCount, 3) }, (_, dot) => (
                    <View
                      key={dot}
                      style={[
                        styles.dot,
                        isSelected && styles.selectedDot,
                      ]}
                    />
                  ))}
                </View>
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
    paddingHorizontal: spacing.xxs,
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
    overflow: "hidden",
  },
  day: {
    flexBasis: "14.285714%",
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.background,
  },
  lastColumn: {
    borderRightWidth: 0,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  selectedDay: {
    backgroundColor: colors.ink,
  },
  today: {
    backgroundColor: "#EEEDFF",
  },
  pressedDay: {
    opacity: 0.6,
  },
  dayNumber: {
    fontSize: 13,
    fontWeight: "900",
    color: colors.ink,
  },
  outsideNumber: {
    color: colors.muted,
  },
  selectedNumber: {
    color: colors.inverse,
  },
  dots: {
    flexDirection: "row",
    gap: 2,
    height: 5,
    marginTop: 3,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
  },
  selectedDot: {
    backgroundColor: colors.inverse,
  },
});
