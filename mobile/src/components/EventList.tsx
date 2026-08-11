import { StyleSheet, Text, View } from "react-native";

import type { SingleEvent } from "@/domain/events";
import { colors, radii, spacing, typography } from "@/theme";

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

function eventTime(event: SingleEvent) {
  if (event.allDay) {
    return "ALL DAY";
  }

  const start = timeFormatter.format(event.startsAt);
  return event.endsAt
    ? `${start}–${timeFormatter.format(event.endsAt)}`
    : start;
}

export default function EventList({
  events,
  emptyMessage,
  showNotes = false,
}: {
  events: SingleEvent[];
  emptyMessage: string;
  showNotes?: boolean;
}) {
  if (events.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>{emptyMessage}</Text>
        <Text style={styles.emptyBody}>CHOOSE ANOTHER DAY OR MONTH.</Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {events.map((event) => (
        <View
          accessibilityLabel={`${event.title}, ${eventTime(event)}`}
          key={event.id}
          style={styles.event}
        >
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={styles.marker}
          />
          <View style={styles.eventCopy}>
            <Text style={styles.eventTime}>{eventTime(event)}</Text>
            <Text style={styles.eventTitle}>{event.title}</Text>
            {showNotes && event.notes ? (
              <Text style={styles.eventNotes}>{event.notes}</Text>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
  },
  event: {
    minHeight: 64,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radii.card,
    backgroundColor: colors.background,
    padding: spacing.sm,
    flexDirection: "row",
    gap: spacing.sm,
  },
  marker: {
    width: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
  },
  eventCopy: {
    flex: 1,
  },
  eventTime: {
    ...typography.label,
    color: colors.muted,
    fontFamily: "ui-monospace",
    marginBottom: spacing.xxs,
  },
  eventTitle: {
    ...typography.body,
    color: colors.ink,
    textTransform: "uppercase",
  },
  eventNotes: {
    ...typography.caption,
    color: colors.muted,
    lineHeight: 18,
    marginTop: spacing.xxs,
  },
  empty: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: colors.divider,
    borderRadius: radii.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xl,
    alignItems: "center",
  },
  emptyTitle: {
    ...typography.body,
    color: colors.ink,
    textAlign: "center",
  },
  emptyBody: {
    ...typography.label,
    color: colors.muted,
    marginTop: spacing.xs,
    textAlign: "center",
  },
});
