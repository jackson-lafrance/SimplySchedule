import { StyleSheet, Text, View } from "react-native";

import EventList from "@/components/EventList";
import type { AgendaDay } from "@/domain/calendar";
import { colors, radii, spacing, typography } from "@/theme";

const dayFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  weekday: "long",
});

export default function AgendaView({ agenda }: { agenda: AgendaDay[] }) {
  if (agenda.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>NO EVENTS THIS MONTH.</Text>
        <Text style={styles.emptyBody}>MOVE TO ANOTHER MONTH TO KEEP LOOKING.</Text>
      </View>
    );
  }

  return (
    <View style={styles.agenda}>
      {agenda.map(({ day, events }) => (
        <View key={day.key} style={styles.dayGroup}>
          <View style={styles.dayHeading}>
            <View>
              <Text style={styles.eyebrow}>
                {day.isToday ? "TODAY" : "SCHEDULED"}
              </Text>
              <Text style={styles.dayTitle}>{dayFormatter.format(day.date)}</Text>
            </View>
            <Text style={styles.count}>{events.length}</Text>
          </View>
          <EventList
            emptyMessage="NO EVENTS SCHEDULED."
            events={events}
            showNotes
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  agenda: {
    gap: spacing.xl,
  },
  dayGroup: {
    gap: spacing.sm,
  },
  dayHeading: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    borderBottomWidth: 2,
    borderColor: colors.ink,
    paddingBottom: spacing.xs,
  },
  eyebrow: {
    ...typography.label,
    color: colors.accent,
    marginBottom: spacing.xxs,
  },
  dayTitle: {
    ...typography.heading,
    color: colors.ink,
    textTransform: "uppercase",
  },
  count: {
    ...typography.label,
    color: colors.muted,
  },
  empty: {
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radii.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xxl,
    alignItems: "center",
  },
  emptyTitle: {
    ...typography.heading,
    color: colors.ink,
    textAlign: "center",
  },
  emptyBody: {
    ...typography.label,
    color: colors.muted,
    marginTop: spacing.xs,
    lineHeight: 16,
    textAlign: "center",
  },
});
