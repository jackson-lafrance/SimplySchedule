import { MaterialIcons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  eventsForDate,
  localDateKey,
  tasksForDate,
} from "@/domain/calendar";
import { AGENDA_ROW_LAYOUT } from "@/domain/agendaRowLayout";
import type { EventOccurrence } from "@/domain/events";
import type { TimeDisplay } from "@/domain/preferences";
import {
  scheduleColorTextValue,
  scheduleColorValue,
} from "@/domain/scheduleColors";
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

const sectionTitle = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
});

function sortItems(items: SelectedItem[]) {
  return items.sort((left, right) => {
    const leftDate =
      left.type === "task" ? left.item.dueAt : left.item.startsAt;
    const rightDate =
      right.type === "task" ? right.item.dueAt : right.item.startsAt;
    return (leftDate?.getTime() ?? 0) - (rightDate?.getTime() ?? 0);
  });
}

export default function AgendaList({
  dates,
  events,
  tasks,
  timeDisplay,
  onCompleteTask,
  sectioned = false,
  currentDate,
  onCurrentDateLayout,
}: {
  dates: Date[];
  events: EventOccurrence[];
  tasks: ScheduleTask[];
  timeDisplay: TimeDisplay;
  onCompleteTask: (taskId: string) => Promise<void>;
  sectioned?: boolean;
  currentDate?: Date;
  onCurrentDateLayout?: (offset: number) => void;
}) {
  const [selected, setSelected] = useState<SelectedItem | null>(null);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const sections = dates.map((date) => ({
    date,
    items: sortItems([
      ...tasksForDate(tasks, date).map(
        (item): SelectedItem => ({ type: "task", item }),
      ),
      ...eventsForDate(events, date).map(
        (item): SelectedItem => ({ type: "event", item }),
      ),
    ]),
  }));
  const items = sections.flatMap((section) => section.items);

  const openDetails = (item: SelectedItem) => {
    setActionError(null);
    setSelected(item);
  };
  const closeDetails = () => {
    if (completingTaskId) return;
    setActionError(null);
    setSelected(null);
  };
  const completeTask = async (task: ScheduleTask) => {
    setActionError(null);
    setCompletingTaskId(task.id);
    try {
      await onCompleteTask(task.id);
      if (selected?.type === "task" && selected.item.id === task.id) {
        setSelected(null);
      }
    } catch (error) {
      console.error("Could not complete task", error);
      setSelected({ type: "task", item: task });
      setActionError("THE TASK COULD NOT BE COMPLETED. TRY AGAIN.");
    } finally {
      setCompletingTaskId(null);
    }
  };

  const renderItem = (selectedItem: SelectedItem, keyPrefix = "") => {
    const item = selectedItem.item;
    const isTask = selectedItem.type === "task";
    const taskCompleted =
      selectedItem.type === "task" && selectedItem.item.status === "completed";
    const timing = selectedItem.type === "task"
      ? selectedItem.item.dueAt
        ? `DUE ${timeLabel(selectedItem.item.dueAt, timeDisplay)}`
        : "NO DUE TIME"
      : eventTime(selectedItem.item, timeDisplay);
    const displayTiming = taskCompleted ? `COMPLETED · ${timing}` : timing;
    const accentColor = scheduleColorValue(item.color);
    const textColor = scheduleColorTextValue(item.color);
    const completing = isTask && completingTaskId === item.id;

    return (
      <View
        key={`${keyPrefix}${selectedItem.type}-${item.id}`}
        style={[styles.item, taskCompleted && styles.completedItem]}
      >
        <View
          accessibilityElementsHidden
          pointerEvents="none"
          style={[styles.colorRail, { backgroundColor: accentColor }]}
        />
        {selectedItem.type === "task" ? (
          <Pressable
            accessibilityLabel={
              taskCompleted ? `${item.title}, completed` : `Complete ${item.title}`
            }
            accessibilityRole="checkbox"
            accessibilityState={{
              busy: completing,
              checked: taskCompleted,
              disabled: taskCompleted || completing,
            }}
            disabled={taskCompleted || completing}
            hitSlop={4}
            onPress={() => void completeTask(selectedItem.item)}
            style={({ pressed }) => [
              styles.checkButton,
              pressed && styles.pressed,
            ]}
          >
            <View
              style={[
                styles.checkGlyph,
                taskCompleted && styles.completedCheckGlyph,
                { borderColor: taskCompleted ? colors.success : textColor },
              ]}
            >
              {completing ? (
                <ActivityIndicator color={textColor} size="small" />
              ) : taskCompleted ? (
                <MaterialIcons name="check" size={20} color={colors.inverse} />
              ) : null}
            </View>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityHint="Opens item details"
          accessibilityLabel={`${isTask ? "Task" : "Event"}, ${item.title}, ${displayTiming}`}
          accessibilityRole="button"
          onPress={() => openDetails(selectedItem)}
          style={({ pressed }) => [
            styles.itemMain,
            pressed && styles.pressed,
          ]}
        >
          <Text
            style={[
              styles.timing,
              taskCompleted && styles.completedTiming,
              { color: taskCompleted ? colors.muted : textColor },
            ]}
          >
            {displayTiming}
          </Text>
          <Text
            numberOfLines={1}
            style={[styles.title, taskCompleted && styles.completedTitle]}
          >
            {item.title}
          </Text>
        </Pressable>
      </View>
    );
  };

  const currentKey = currentDate ? localDateKey(currentDate) : null;

  return (
    <View style={[styles.container, sectioned && styles.sectionedContainer]}>
      {sectioned ? (
        sections.map((section) => {
          const sectionKey = localDateKey(section.date);
          return (
            <View
              key={sectionKey}
              onLayout={
                sectionKey === currentKey && onCurrentDateLayout
                  ? (event) =>
                      onCurrentDateLayout(event.nativeEvent.layout.y)
                  : undefined
              }
              style={styles.section}
            >
              <Text
                accessibilityRole="header"
                style={[
                  styles.sectionTitle,
                  sectionKey === currentKey && styles.currentSectionTitle,
                ]}
              >
                {sectionTitle.format(section.date).toUpperCase()}
              </Text>
              <View style={styles.sectionItems}>
                {section.items.map((item) =>
                  renderItem(item, `${sectionKey}-`),
                )}
              </View>
            </View>
          );
        })
      ) : (
        items.map((item) => renderItem(item))
      )}

      <Modal
        animationType="fade"
        onRequestClose={closeDetails}
        transparent
        visible={selected !== null}
      >
        <View style={styles.overlay}>
          {selected ? (
            <View
              accessibilityViewIsModal
              style={[
                styles.detailCard,
                { borderTopColor: scheduleColorValue(selected.item.color) },
              ]}
            >
              <ScrollView
                contentContainerStyle={styles.detailContent}
                showsVerticalScrollIndicator={false}
                style={styles.detailScroll}
              >
                <Text
                  numberOfLines={3}
                  style={[
                    styles.detailTitle,
                    selected.type === "task" &&
                      selected.item.status === "completed" &&
                      styles.completedDetailTitle,
                  ]}
                >
                  {selected.item.title}
                </Text>
                <Text style={styles.detailTiming}>
                  {selected.type === "task"
                    ? `${selected.item.status === "completed" ? "COMPLETED · " : ""}${selected.item.dueAt
                        ? `DUE ${selected.item.dueAt.toLocaleDateString("en-US", {
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                          })} · ${timeLabel(selected.item.dueAt, timeDisplay)}`
                        : "NO DUE DATE"}`
                    : `${selected.item.startsAt.toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      })} · ${eventTime(selected.item, timeDisplay)}`}
                </Text>
                {selected.type === "task" && selected.item.status === "completed" ? (
                  <View style={styles.completedStatus}>
                    <MaterialIcons name="check" size={18} color={colors.inverse} />
                    <Text style={styles.completedStatusText}>COMPLETED</Text>
                  </View>
                ) : null}
                {selected.item.notes ? (
                  <Text style={styles.detailNotes}>{selected.item.notes}</Text>
                ) : null}
                {selected.type === "event" && selected.item.isRepeating ? (
                  <Text style={styles.detailMeta}>REPEATING</Text>
                ) : null}
              </ScrollView>

              {actionError ? (
                <Text accessibilityRole="alert" style={styles.actionError}>
                  {actionError}
                </Text>
              ) : null}
              {selected.type === "task" && selected.item.status === "open" ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{
                    busy: completingTaskId === selected.item.id,
                    disabled: completingTaskId === selected.item.id,
                  }}
                  disabled={completingTaskId === selected.item.id}
                  onPress={() => void completeTask(selected.item)}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && styles.primaryPressed,
                    completingTaskId === selected.item.id && styles.disabled,
                  ]}
                >
                  {completingTaskId === selected.item.id ? (
                    <ActivityIndicator color={colors.inverse} />
                  ) : (
                    <Text style={styles.primaryText}>MARK COMPLETE</Text>
                  )}
                </Pressable>
              ) : null}
              <Pressable
                accessibilityRole="button"
                disabled={completingTaskId !== null}
                onPress={closeDetails}
                style={({ pressed }) => [
                  styles.doneButton,
                  pressed && styles.pressed,
                  completingTaskId !== null && styles.disabled,
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
  sectionedContainer: {
    gap: spacing.xl,
  },
  section: {
    gap: spacing.sm,
  },
  currentSectionTitle: {
    alignSelf: "flex-start",
    borderRadius: 6,
    backgroundColor: colors.ink,
    color: colors.inverse,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.25,
    textTransform: "uppercase",
  },
  sectionItems: {
    gap: spacing.sm,
  },
  item: {
    minHeight: 72,
    borderWidth: AGENDA_ROW_LAYOUT.borderWidth,
    borderColor: colors.ink,
    borderRadius: radii.card,
    backgroundColor: colors.background,
    flexDirection: "row",
    alignItems: "stretch",
    overflow: "hidden",
  },
  colorRail: {
    width: AGENDA_ROW_LAYOUT.accentRailWidth,
    alignSelf: "stretch",
    flexShrink: 0,
  },
  completedItem: {
    backgroundColor: colors.surfaceMuted,
  },
  itemMain: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    justifyContent: "center",
  },
  checkButton: {
    width: 52,
    minHeight: 68,
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: 1,
    borderRightColor: colors.divider,
  },
  checkGlyph: {
    width: 30,
    height: 30,
    borderWidth: 2,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  completedCheckGlyph: {
    backgroundColor: colors.success,
  },
  pressed: {
    opacity: 0.6,
  },
  disabled: {
    opacity: 0.5,
  },
  timing: {
    ...typography.label,
    marginBottom: spacing.xxs,
  },
  completedTiming: {
    fontWeight: "900",
  },
  title: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  completedTitle: {
    color: colors.muted,
    textDecorationLine: "line-through",
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
    maxHeight: "85%",
    padding: spacing.xl,
    borderWidth: 2,
    borderTopWidth: 8,
    borderColor: colors.ink,
    borderRadius: 12,
    backgroundColor: colors.background,
  },
  detailScroll: {
    flexShrink: 1,
  },
  detailContent: {
    paddingBottom: spacing.xs,
  },
  detailTitle: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.5,
    textTransform: "uppercase",
  },
  completedDetailTitle: {
    color: colors.muted,
    textDecorationLine: "line-through",
  },
  detailTiming: {
    ...typography.caption,
    color: colors.ink,
    lineHeight: 18,
    marginTop: spacing.sm,
  },
  completedStatus: {
    alignSelf: "flex-start",
    marginTop: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.control,
    backgroundColor: colors.success,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xxs,
  },
  completedStatusText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "900",
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
  actionError: {
    borderWidth: 2,
    borderColor: colors.destructive,
    borderRadius: radii.control,
    padding: spacing.sm,
    color: colors.destructive,
    fontSize: 12,
    fontWeight: "800",
    marginTop: spacing.sm,
  },
  primaryButton: {
    minHeight: 50,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radii.control,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.md,
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
