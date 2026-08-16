import { MaterialIcons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import SegmentedControl from "@/components/SegmentedControl";
import { useSchedule } from "@/context/useSchedule";
import {
  createEventInputFromDraft,
  recurrenceDraftSummary,
  type EventDraft,
} from "@/domain/eventForm";
import type {
  RecurrenceFrequency,
  RecurrenceTerminationType,
} from "@/domain/events";
import { createTaskInputFromDraft } from "@/domain/taskForm";
import type { TaskDraft } from "@/domain/tasks";
import { colors, radii, spacing, typography } from "@/theme";

const { height } = Dimensions.get("window");
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const ORDINALS: { value: number | -1; label: string }[] = [
  { value: 1, label: "1ST" },
  { value: 2, label: "2ND" },
  { value: 3, label: "3RD" },
  { value: 4, label: "4TH" },
  { value: 5, label: "5TH" },
  { value: -1, label: "LAST" },
];
const FREQUENCIES: { value: RecurrenceFrequency; label: string }[] = [
  { value: "hourly", label: "HOUR" },
  { value: "daily", label: "DAY" },
  { value: "weekly", label: "WEEK" },
  { value: "monthly", label: "MONTH" },
  { value: "yearly", label: "YEAR" },
];

type ItemType = "task" | "event";

function deviceTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function initialEventDraft(date: string): EventDraft {
  const parsed = new Date(`${date}T12:00:00`);
  return {
    title: "",
    notes: "",
    date,
    startTime: "09:00",
    endTime: "10:00",
    allDay: false,
    recurrenceEnabled: false,
    frequency: "weekly",
    interval: "1",
    weekdays: [Number.isNaN(parsed.getTime()) ? 1 : parsed.getDay()],
    calendarSelectorMode: "dayOfMonth",
    dayOfMonth: String(Number(date.slice(-2)) || 1),
    weekOfMonth: 1,
    ordinalWeekday: Number.isNaN(parsed.getTime()) ? 1 : parsed.getDay(),
    monthOfYear: String(Number(date.slice(5, 7)) || 1),
    terminationType: "never",
    untilDate: date,
    occurrenceCount: "10",
  };
}

function initialTaskDraft(date: string): TaskDraft {
  return { title: "", notes: "", date, time: "09:00" };
}

function Chip({
  label,
  selected,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.selectedChip,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.chipText, selected && styles.selectedChipText]}>
        {label}
      </Text>
    </Pressable>
  );
}

function FieldLabel({ children }: { children: string }) {
  return <Text style={styles.fieldLabel}>{children}</Text>;
}

export default function CreateItemSheet({
  visible,
  initialDate,
  onClose,
  onSaved,
}: {
  visible: boolean;
  initialDate: string;
  onClose: () => void;
  onSaved: (date: Date) => void;
}) {
  const { createEvent, createTask } = useSchedule();
  const [itemType, setItemType] = useState<ItemType>("task");
  const [advanced, setAdvanced] = useState(false);
  const [eventDraft, setEventDraft] = useState(() =>
    initialEventDraft(initialDate),
  );
  const [taskDraft, setTaskDraft] = useState(() =>
    initialTaskDraft(initialDate),
  );
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const slide = useRef(new Animated.Value(height)).current;
  const insets = useSafeAreaInsets();
  const timeZone = deviceTimeZone();

  useEffect(() => {
    if (!visible) return;
    setItemType("task");
    setAdvanced(false);
    setEventDraft(initialEventDraft(initialDate));
    setTaskDraft(initialTaskDraft(initialDate));
    setErrorMessage(null);
    setSaving(false);
    slide.setValue(height);
    Animated.spring(slide, {
      toValue: 0,
      useNativeDriver: true,
      tension: 60,
      friction: 12,
    }).start();
  }, [initialDate, slide, visible]);

  const close = () => {
    if (saving) return;
    Animated.timing(slide, {
      toValue: height,
      duration: 200,
      useNativeDriver: true,
    }).start(onClose);
  };
  const updateEvent = <Key extends keyof EventDraft>(
    key: Key,
    value: EventDraft[Key],
  ) => setEventDraft((current) => ({ ...current, [key]: value }));
  const updateTask = <Key extends keyof TaskDraft>(
    key: Key,
    value: TaskDraft[Key],
  ) => setTaskDraft((current) => ({ ...current, [key]: value }));

  const submit = async () => {
    setErrorMessage(null);
    try {
      setSaving(true);
      if (itemType === "task") {
        const input = createTaskInputFromDraft(taskDraft, timeZone);
        await createTask(input);
        onSaved(input.dueAt);
      } else {
        const input = createEventInputFromDraft(eventDraft, timeZone);
        await createEvent(input);
        onSaved(input.startsAt);
      }
      onClose();
    } catch (error) {
      setSaving(false);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "THE ITEM COULD NOT BE SAVED. TRY AGAIN.",
      );
    }
  };

  const toggleWeekday = (day: number) => {
    updateEvent(
      "weekdays",
      eventDraft.weekdays.includes(day)
        ? eventDraft.weekdays.filter((value) => value !== day)
        : [...eventDraft.weekdays, day],
    );
  };
  const setTermination = (value: RecurrenceTerminationType) =>
    updateEvent("terminationType", value);

  return (
    <Modal
      animationType="fade"
      onRequestClose={close}
      transparent
      visible={visible}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.overlay}
      >
        <Animated.View
          style={[
            styles.sheet,
            {
              paddingBottom: insets.bottom + spacing.md,
              transform: [{ translateY: slide }],
            },
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.title}>ADD ITEM</Text>
            <Pressable
              accessibilityLabel="Close add item"
              accessibilityRole="button"
              hitSlop={8}
              onPress={close}
            >
              <MaterialIcons name="close" size={28} color={colors.ink} />
            </Pressable>
          </View>

          <SegmentedControl
            accessibilityLabel="Item type"
            onChange={(value) => {
              setItemType(value);
              setAdvanced(false);
              setErrorMessage(null);
            }}
            options={[
              { value: "task", label: "TASK" },
              { value: "event", label: "EVENT" },
            ]}
            value={itemType}
          />

          <ScrollView
            contentContainerStyle={styles.form}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {itemType === "task" ? (
              <>
                <View style={styles.field}>
                  <FieldLabel>TASK NAME</FieldLabel>
                  <TextInput
                    accessibilityLabel="Task name"
                    autoFocus
                    maxLength={200}
                    onChangeText={(value) => updateTask("title", value)}
                    placeholder="WHAT NEEDS DOING?"
                    placeholderTextColor={colors.muted}
                    selectionColor={colors.ink}
                    style={styles.input}
                    testID="task-title-input"
                    value={taskDraft.title}
                  />
                </View>
                <View style={styles.quickRow}>
                  <View style={[styles.field, styles.quickField]}>
                    <FieldLabel>DUE DATE</FieldLabel>
                    <TextInput
                      accessibilityLabel="Task due date"
                      autoCorrect={false}
                      keyboardType="numbers-and-punctuation"
                      maxLength={10}
                      onChangeText={(value) => updateTask("date", value)}
                      style={styles.input}
                      value={taskDraft.date}
                    />
                  </View>
                  <View style={[styles.field, styles.quickField]}>
                    <FieldLabel>DUE TIME</FieldLabel>
                    <TextInput
                      accessibilityLabel="Task due time"
                      autoCorrect={false}
                      keyboardType="numbers-and-punctuation"
                      maxLength={5}
                      onChangeText={(value) => updateTask("time", value)}
                      style={styles.input}
                      value={taskDraft.time}
                    />
                  </View>
                </View>
                {advanced ? (
                  <View style={styles.field}>
                    <FieldLabel>NOTES · OPTIONAL</FieldLabel>
                    <TextInput
                      accessibilityLabel="Task notes"
                      maxLength={5_000}
                      multiline
                      onChangeText={(value) => updateTask("notes", value)}
                      placeholder="ADD DETAILS"
                      placeholderTextColor={colors.muted}
                      style={[styles.input, styles.notesInput]}
                      value={taskDraft.notes}
                    />
                  </View>
                ) : null}
              </>
            ) : (
              <>
                <View style={styles.field}>
                  <FieldLabel>EVENT NAME</FieldLabel>
                  <TextInput
                    accessibilityLabel="Event name"
                    autoFocus
                    maxLength={200}
                    onChangeText={(value) => updateEvent("title", value)}
                    placeholder="WHAT IS HAPPENING?"
                    placeholderTextColor={colors.muted}
                    selectionColor={colors.ink}
                    style={styles.input}
                    testID="event-title-input"
                    value={eventDraft.title}
                  />
                </View>
                <View style={styles.field}>
                  <FieldLabel>START ANCHOR · YYYY-MM-DD</FieldLabel>
                  <TextInput
                    accessibilityLabel="Event start date"
                    autoCorrect={false}
                    keyboardType="numbers-and-punctuation"
                    maxLength={10}
                    onChangeText={(value) => updateEvent("date", value)}
                    style={styles.input}
                    value={eventDraft.date}
                  />
                </View>
                {!eventDraft.allDay ? (
                  <View style={styles.quickRow}>
                    <View style={[styles.field, styles.quickField]}>
                      <FieldLabel>START</FieldLabel>
                      <TextInput
                        accessibilityLabel="Event start time"
                        autoCorrect={false}
                        keyboardType="numbers-and-punctuation"
                        maxLength={5}
                        onChangeText={(value) => updateEvent("startTime", value)}
                        style={styles.input}
                        value={eventDraft.startTime}
                      />
                    </View>
                    <View style={[styles.field, styles.quickField]}>
                      <FieldLabel>END</FieldLabel>
                      <TextInput
                        accessibilityLabel="Event end time"
                        autoCorrect={false}
                        keyboardType="numbers-and-punctuation"
                        maxLength={5}
                        onChangeText={(value) => updateEvent("endTime", value)}
                        style={styles.input}
                        value={eventDraft.endTime}
                      />
                    </View>
                  </View>
                ) : null}

                {advanced ? (
                  <>
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: eventDraft.allDay }}
                      onPress={() => updateEvent("allDay", !eventDraft.allDay)}
                      style={styles.optionRow}
                    >
                      <View
                        style={[
                          styles.checkbox,
                          eventDraft.allDay && styles.checked,
                        ]}
                      >
                        {eventDraft.allDay ? (
                          <MaterialIcons name="check" size={16} color="white" />
                        ) : null}
                      </View>
                      <Text style={styles.optionTitle}>ALL DAY</Text>
                    </Pressable>
                    <View style={styles.field}>
                      <FieldLabel>NOTES · OPTIONAL</FieldLabel>
                      <TextInput
                        accessibilityLabel="Event notes"
                        maxLength={5_000}
                        multiline
                        onChangeText={(value) => updateEvent("notes", value)}
                        placeholder="ADD DETAILS"
                        placeholderTextColor={colors.muted}
                        style={[styles.input, styles.notesInput]}
                        value={eventDraft.notes}
                      />
                    </View>
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityState={{
                        checked: eventDraft.recurrenceEnabled,
                      }}
                      onPress={() =>
                        updateEvent(
                          "recurrenceEnabled",
                          !eventDraft.recurrenceEnabled,
                        )
                      }
                      style={styles.optionRow}
                    >
                      <View
                        style={[
                          styles.checkbox,
                          eventDraft.recurrenceEnabled && styles.checked,
                        ]}
                      >
                        {eventDraft.recurrenceEnabled ? (
                          <MaterialIcons name="check" size={16} color="white" />
                        ) : null}
                      </View>
                      <View style={styles.optionCopy}>
                        <Text style={styles.optionTitle}>REPEAT</Text>
                        <Text style={styles.optionMeta}>
                          {recurrenceDraftSummary(eventDraft)}
                        </Text>
                      </View>
                    </Pressable>

                    {eventDraft.recurrenceEnabled ? (
                      <View style={styles.recurrenceCard}>
                        <Text style={styles.sectionTitle}>REPEAT RULE</Text>
                        <View style={styles.intervalRow}>
                          <View style={styles.intervalField}>
                            <FieldLabel>EVERY</FieldLabel>
                            <TextInput
                              accessibilityLabel="Repeat interval"
                              keyboardType="number-pad"
                              maxLength={2}
                              onChangeText={(value) =>
                                updateEvent("interval", value)
                              }
                              style={styles.input}
                              value={eventDraft.interval}
                            />
                          </View>
                          <View style={styles.frequencyChips}>
                            {FREQUENCIES.map((option) => (
                              <Chip
                                key={option.value}
                                label={option.label}
                                onPress={() =>
                                  updateEvent("frequency", option.value)
                                }
                                selected={eventDraft.frequency === option.value}
                              />
                            ))}
                          </View>
                        </View>

                        {eventDraft.frequency === "weekly" ? (
                          <View style={styles.field}>
                            <FieldLabel>ON DAYS</FieldLabel>
                            <View style={styles.weekdays}>
                              {WEEKDAYS.map((label, day) => (
                                <Chip
                                  accessibilityLabel={`Repeat on ${label}`}
                                  key={`${label}-${day}`}
                                  label={label}
                                  onPress={() => toggleWeekday(day)}
                                  selected={eventDraft.weekdays.includes(day)}
                                />
                              ))}
                            </View>
                          </View>
                        ) : null}

                        {eventDraft.frequency === "monthly" ||
                        eventDraft.frequency === "yearly" ? (
                          <>
                            {eventDraft.frequency === "yearly" ? (
                              <View style={styles.field}>
                                <FieldLabel>MONTH · 1–12</FieldLabel>
                                <TextInput
                                  accessibilityLabel="Month of year"
                                  keyboardType="number-pad"
                                  maxLength={2}
                                  onChangeText={(value) =>
                                    updateEvent("monthOfYear", value)
                                  }
                                  style={styles.input}
                                  value={eventDraft.monthOfYear}
                                />
                              </View>
                            ) : null}
                            <SegmentedControl
                              accessibilityLabel="Calendar repeat selector"
                              onChange={(value) =>
                                updateEvent("calendarSelectorMode", value)
                              }
                              options={[
                                { value: "dayOfMonth", label: "DATE" },
                                {
                                  value: "ordinalWeekday",
                                  label: "ORDINAL DAY",
                                },
                              ]}
                              value={eventDraft.calendarSelectorMode}
                            />
                            {eventDraft.calendarSelectorMode === "dayOfMonth" ? (
                              <View style={styles.field}>
                                <FieldLabel>DAY OF MONTH · 1–31 OR -1 FOR LAST</FieldLabel>
                                <TextInput
                                  accessibilityLabel="Day of month"
                                  keyboardType="numbers-and-punctuation"
                                  maxLength={2}
                                  onChangeText={(value) =>
                                    updateEvent("dayOfMonth", value)
                                  }
                                  style={styles.input}
                                  value={eventDraft.dayOfMonth}
                                />
                              </View>
                            ) : (
                              <>
                                <View style={styles.wrapChips}>
                                  {ORDINALS.map((option) => (
                                    <Chip
                                      key={option.value}
                                      label={option.label}
                                      onPress={() =>
                                        updateEvent("weekOfMonth", option.value)
                                      }
                                      selected={
                                        eventDraft.weekOfMonth === option.value
                                      }
                                    />
                                  ))}
                                </View>
                                <View style={styles.weekdays}>
                                  {WEEKDAYS.map((label, day) => (
                                    <Chip
                                      key={`${label}-${day}`}
                                      label={label}
                                      onPress={() =>
                                        updateEvent("ordinalWeekday", day)
                                      }
                                      selected={
                                        eventDraft.ordinalWeekday === day
                                      }
                                    />
                                  ))}
                                </View>
                              </>
                            )}
                          </>
                        ) : null}

                        <FieldLabel>ENDS</FieldLabel>
                        <SegmentedControl
                          accessibilityLabel="Repeat ends"
                          onChange={setTermination}
                          options={[
                            { value: "never", label: "NEVER" },
                            { value: "onDate", label: "DATE" },
                            { value: "afterOccurrences", label: "COUNT" },
                          ]}
                          value={eventDraft.terminationType}
                        />
                        {eventDraft.terminationType === "onDate" ? (
                          <View style={styles.field}>
                            <FieldLabel>THROUGH DATE</FieldLabel>
                            <TextInput
                              accessibilityLabel="Repeat through date"
                              keyboardType="numbers-and-punctuation"
                              maxLength={10}
                              onChangeText={(value) =>
                                updateEvent("untilDate", value)
                              }
                              style={styles.input}
                              value={eventDraft.untilDate}
                            />
                          </View>
                        ) : null}
                        {eventDraft.terminationType === "afterOccurrences" ? (
                          <View style={styles.field}>
                            <FieldLabel>OCCURRENCES · 1–999</FieldLabel>
                            <TextInput
                              accessibilityLabel="Occurrence count"
                              keyboardType="number-pad"
                              maxLength={3}
                              onChangeText={(value) =>
                                updateEvent("occurrenceCount", value)
                              }
                              style={styles.input}
                              value={eventDraft.occurrenceCount}
                            />
                          </View>
                        ) : null}

                        <View style={styles.timezoneNote}>
                          <MaterialIcons
                            name="schedule"
                            size={18}
                            color={colors.ink}
                          />
                          <Text style={styles.timezoneText}>
                            {timeZone.toUpperCase()} · DAY/WEEK/MONTH/YEAR RULES
                            KEEP LOCAL WALL TIME THROUGH DST. HOURLY RULES USE
                            ELAPSED HOURS.
                          </Text>
                        </View>
                      </View>
                    ) : null}
                  </>
                ) : null}
              </>
            )}

            <Pressable
              accessibilityRole="button"
              onPress={() => setAdvanced((current) => !current)}
              style={({ pressed }) => [
                styles.moreButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.moreText}>
                {advanced ? "HIDE OPTIONS" : "MORE OPTIONS"}
              </Text>
              <MaterialIcons
                name={advanced ? "expand-less" : "expand-more"}
                size={22}
                color={colors.ink}
              />
            </Pressable>

            {errorMessage ? (
              <Text accessibilityRole="alert" style={styles.error}>
                {errorMessage}
              </Text>
            ) : null}
          </ScrollView>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              disabled={saving}
              onPress={close}
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.cancelText}>CANCEL</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={saving}
              onPress={() => void submit()}
              style={({ pressed }) => [
                styles.saveButton,
                saving && styles.disabled,
                pressed && styles.savePressed,
              ]}
              testID="save-item-button"
            >
              <Text style={styles.saveText}>
                {saving ? "SAVING…" : `ADD ${itemType.toUpperCase()}`}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    height: "92%",
    padding: spacing.xl,
    backgroundColor: colors.background,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderColor: colors.ink,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: -0.5,
    color: colors.ink,
  },
  form: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  field: {
    gap: spacing.xxs,
  },
  fieldLabel: {
    ...typography.label,
    color: colors.muted,
  },
  input: {
    minHeight: 48,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radii.control,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.background,
    color: colors.ink,
    fontSize: 15,
    fontWeight: "700",
  },
  notesInput: {
    minHeight: 82,
    textAlignVertical: "top",
  },
  quickRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  quickField: {
    flex: 1,
  },
  moreButton: {
    minHeight: 48,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: colors.ink,
    borderRadius: radii.control,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xxs,
  },
  moreText: {
    ...typography.body,
    color: colors.ink,
    fontSize: 13,
  },
  optionRow: {
    minHeight: 52,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radii.control,
    padding: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  checked: {
    backgroundColor: colors.ink,
  },
  optionCopy: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: colors.ink,
  },
  optionMeta: {
    ...typography.label,
    color: colors.muted,
    marginTop: 2,
  },
  recurrenceCard: {
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radii.card,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.ink,
  },
  intervalRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
  },
  intervalField: {
    width: 70,
    gap: spacing.xxs,
  },
  frequencyChips: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xxs,
  },
  weekdays: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 3,
  },
  wrapChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xxs,
  },
  chip: {
    minWidth: 38,
    minHeight: 36,
    paddingHorizontal: spacing.xs,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radii.control,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  selectedChip: {
    backgroundColor: colors.ink,
  },
  chipText: {
    ...typography.label,
    color: colors.ink,
    fontSize: 8,
  },
  selectedChipText: {
    color: colors.inverse,
  },
  timezoneNote: {
    padding: spacing.sm,
    borderRadius: radii.control,
    backgroundColor: colors.surfaceMuted,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.xs,
  },
  timezoneText: {
    ...typography.caption,
    color: colors.ink,
    fontSize: 9,
    lineHeight: 14,
    flex: 1,
  },
  error: {
    borderWidth: 2,
    borderColor: colors.destructive,
    borderRadius: radii.control,
    padding: spacing.sm,
    color: colors.destructive,
    fontSize: 12,
    fontWeight: "800",
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  cancelButton: {
    minHeight: 54,
    flex: 1,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radii.control,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontSize: 14,
    fontWeight: "900",
    color: colors.ink,
  },
  saveButton: {
    minHeight: 54,
    flex: 2,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radii.control,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  savePressed: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  saveText: {
    fontSize: 14,
    fontWeight: "900",
    color: colors.inverse,
  },
  pressed: {
    opacity: 0.65,
  },
  disabled: {
    opacity: 0.5,
  },
});
