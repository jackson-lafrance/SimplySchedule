import { useEffect, useRef } from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";

import { localDateKey } from "@/domain/calendar";
import { colors, radii, spacing, typography } from "@/theme";

const weekday = new Intl.DateTimeFormat("en-US", { weekday: "short" });

export default function WeekdayStrip({
  dates,
  selectedDate,
  onSelectDate,
  fitted = false,
}: {
  dates: Date[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  fitted?: boolean;
}) {
  const scroll = useRef<ScrollView>(null);
  const selectedKey = localDateKey(selectedDate);

  useEffect(() => {
    if (fitted) return;
    const index = dates.findIndex((date) => localDateKey(date) === selectedKey);
    if (index >= 0) {
      scroll.current?.scrollTo({
        x: Math.max(0, index * 62 - 120),
        animated: false,
      });
    }
  }, [dates, fitted, selectedKey]);

  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        fitted && styles.fittedContent,
      ]}
      horizontal
      ref={scroll}
      scrollEnabled={!fitted}
      showsHorizontalScrollIndicator={false}
    >
      {dates.map((date) => {
        const selected = localDateKey(date) === selectedKey;
        return (
          <Pressable
            accessibilityLabel={date.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={localDateKey(date)}
            onPress={() => onSelectDate(date)}
            style={({ pressed }) => [
              styles.day,
              fitted && styles.fittedDay,
              selected && styles.selectedDay,
              pressed && styles.pressed,
            ]}
          >
            <Text
              maxFontSizeMultiplier={1.3}
              style={[styles.weekday, selected && styles.selectedText]}
            >
              {weekday.format(date).slice(0, 2)}
            </Text>
            <Text
              maxFontSizeMultiplier={1.3}
              style={[styles.number, selected && styles.selectedText]}
            >
              {date.getDate()}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  fittedContent: {
    flexGrow: 1,
    gap: spacing.xxs,
  },
  day: {
    width: 54,
    height: 62,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radii.control,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  fittedDay: {
    flex: 1,
    width: undefined,
  },
  selectedDay: {
    backgroundColor: colors.ink,
  },
  pressed: {
    opacity: 0.6,
  },
  weekday: {
    ...typography.label,
    color: colors.muted,
    fontSize: 8,
  },
  number: {
    marginTop: 2,
    color: colors.ink,
    fontSize: 17,
    fontWeight: "900",
  },
  selectedText: {
    color: colors.inverse,
  },
});
