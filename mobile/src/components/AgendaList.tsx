import { useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { eventsForDate, tasksForDate } from "@/domain/calendar";
import type { EventOccurrence } from "@/domain/events";
import type { TimeDisplay } from "@/domain/preferences";
import type { ScheduleTask } from "@/domain/tasks";
import { colors, radii, spacing, typography } from "@/theme";

type SelectedItem =
  | { type: "task"; item: ScheduleTask }
  | { type: "event"; item: EventOccurrence };

function timeLabel(date: Date, timeDisplay: TimeDisplay) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: timeDisplay === "12-hour",
  }).format(date);
}

function eventTime(event: EventOccurrence, timeDisplay: TimeDisplay) {
  if (event.allDay) return "ALL DAY";
  const start = timeLabel(event.startsAt, timeDisplay);
  return event.endsAt
    ? `${start}–${timeLabel(event.endsAt, timeDisplay)}`
    : start;
}

export default function AgendaList({
  dates,
  events,
  tasks,
  timeDisplay,
  onCompleteTask,
}: {
  dates: Date[];
  events: EventOccurrence[];
  tasks: ScheduleTask[];
  timeDisplay: TimeDisplay;
  onCompleteTask: (taskId: string) => Promise<void>;
}) {
  const [selected, setSelected] = useState<SelectedItem | null>(null);
  const items: SelectedItem[] = dates
    .flatMap((date) => [
      ...tasksForDate(tasks, date).map(
        (item): SelectedItem => ({ type: "task", item }),
      ),
      ...eventsForDate(events, date).map(
        (item): SelectedItem => ({ type: "event", item }),
      ),
    ])
    .sort((left, right) => {
      const leftDate =
        left.type === "task" ? left.item.dueAt : left.item.startsAt;
      const rightDate =
        right.type === "task" ? right.item.dueAt : right.item.startsAt;
      return (leftDate?.getTime() ?? 0) - (rightDate?.getTime() ?? 0);
    });

  return (
    <View style={styles.container}>
      {items.length === 0 ? (
        <Text style={styles.empty}>NOTHING SCHEDULED</Text>
      ) : (
        items.map((selectedItem) => {
          let timing: string;
          if (selectedItem.type === "task") {
            timing = selectedItem.item.dueAt
              ? `DUE ${timeLabel(selectedItem.item.dueAt, timeDisplay)}`
              : "NO DUE TIME";
          } else {
            timing = eventTime(selectedItem.item, timeDisplay);
          }
          const item = selectedItem.item;
          const isTask = selectedItem.type === "task";
          return (
            <Pressable
              accessibilityHint="Opens item details"
              accessibilityLabel={`${item.title}, ${timing}`}
              accessibilityRole="button"
              key={`${selectedItem.type}-${item.id}`}
              onPress={() => setSelected(selectedItem)}
              style={({ pressed }) => [
                styles.item,
                isTask ? styles.taskItem : styles.eventItem,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.timing,
                  isTask ? styles.taskText : styles.eventText,
                ]}
              >
                {timing}
              </Text>
              <Text numberOfLines={1} style={styles.title}>
                {item.title}
              </Text>
            </Pressable>
          );
        })
      )}

      <Modal
        animationType="fade"
        onRequestClose={() => setSelected(null)}
        transparent
        visible={selected !== null}
      >
        <View style={styles.overlay}>
          {selected ? (
            <View style={styles.detailCard}>
              <Text
                style={[
                  styles.detailType,
                  selected.type === "task" ? styles.taskText : styles.eventText,
                ]}
              >
                {selected.type === "task" ? "TASK" : "EVENT"}
              </Text>
              <Text numberOfLines={1} adjustsFontSizeToFit style={styles.detailTitle}>
                {selected.item.title}
              </Text>
              <Text style={styles.detailTiming}>
                {selected.type === "task"
                  ? selected.item.dueAt
                    ? `DUE ${selected.item.dueAt.toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      })} · ${timeLabel(selected.item.dueAt, timeDisplay)}`
                    : "NO DUE DATE"
                  : `${selected.item.startsAt.toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })} · ${eventTime(selected.item, timeDisplay)}`}
              </Text>
              {selected.item.notes ? (
                <Text style={styles.detailNotes}>{selected.item.notes}</Text>
              ) : null}
              {selected.type === "event" && selected.item.isRepeating ? (
                <Text style={styles.detailMeta}>
                  REPEATING · {selected.item.timeZone.toUpperCase()}
                </Text>
              ) : null}

              {selected.type === "task" ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    void onCompleteTask(selected.item.id)
                      .then(() => setSelected(null))
                      .catch((error) =>
                        console.error("Could not complete task", error),
                      );
                  }}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && styles.primaryPressed,
                  ]}
                >
                  <Text style={styles.primaryText}>MARK COMPLETE</Text>
                </Pressable>
              ) : null}
              <Pressable
                accessibilityRole="button"
                onPress={() => setSelected(null)}
                style={({ pressed }) => [
                  styles.doneButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.doneText}>DONE</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  item: {
    minHeight: 72,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radii.card,
    backgroundColor: colors.background,
    justifyContent: "center",
    borderLeftWidth: 8,
  },
  taskItem: {
    borderLeftColor: colors.success,
  },
  eventItem: {
    borderLeftColor: colors.accent,
  },
  pressed: {
    opacity: 0.6,
  },
  timing: {
    ...typography.label,
    marginBottom: spacing.xxs,
  },
  taskText: {
    color: colors.success,
  },
  eventText: {
    color: colors.accent,
  },
  title: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  empty: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
    paddingVertical: spacing.xxl,
  },
  overlay: {
    flex: 1,
    padding: spacing.lg,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  detailCard: {
    width: "100%",
    padding: spacing.xl,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 12,
    backgroundColor: colors.background,
  },
  detailType: {
    ...typography.label,
    marginBottom: spacing.xs,
  },
  detailTitle: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.5,
    textTransform: "uppercase",
  },
  detailTiming: {
    ...typography.caption,
    color: colors.ink,
    lineHeight: 18,
    marginTop: spacing.sm,
  },
  detailNotes: {
    ...typography.caption,
    color: colors.muted,
    lineHeight: 18,
    marginTop: spacing.md,
  },
  detailMeta: {
    ...typography.label,
    color: colors.muted,
    marginTop: spacing.md,
  },
  primaryButton: {
    minHeight: 50,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radii.control,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.xl,
  },
  primaryPressed: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  primaryText: {
    color: colors.inverse,
    fontSize: 14,
    fontWeight: "900",
  },
  doneButton: {
    minHeight: 50,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radii.control,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.sm,
  },
  doneText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "900",
  },
});
