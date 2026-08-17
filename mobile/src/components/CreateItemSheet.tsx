import { MaterialIcons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
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
  previewEventOccurrences,
  recurrenceDraftSummary,
  type EventDraft,
} from "@/domain/eventForm";
import type {
  RecurrenceFrequency,
  RecurrenceTerminationType,
} from "@/domain/events";
import {
  DEFAULT_EVENT_COLOR,
  DEFAULT_TASK_COLOR,
  scheduleColorValue,
  SCHEDULE_COLORS,
  type ScheduleColor,
} from "@/domain/scheduleColors";
import { createTaskInputFromDraft } from "@/domain/taskForm";
import type { TaskDraft } from "@/domain/tasks";
import { colors, radii, spacing, typography } from "@/theme";

const { height } = Dimensions.get("window");
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
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
const MONTHS = [
  { label: "JAN", accessibilityLabel: "January" },
  { label: "FEB", accessibilityLabel: "February" },
  { label: "MAR", accessibilityLabel: "March" },
  { label: "APR", accessibilityLabel: "April" },
  { label: "MAY", accessibilityLabel: "May" },
  { label: "JUN", accessibilityLabel: "June" },
  { label: "JUL", accessibilityLabel: "July" },
  { label: "AUG", accessibilityLabel: "August" },
  { label: "SEP", accessibilityLabel: "September" },
  { label: "OCT", accessibilityLabel: "October" },
  { label: "NOV", accessibilityLabel: "November" },
  { label: "DEC", accessibilityLabel: "December" },
];

type ItemType = "task" | "event";

function deviceTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function readableItemError(error: unknown) {
  console.error("Could not save schedule item", error);
  if (
    error instanceof Error &&
    !("code" in error) &&
    error.message.trim().length > 0
  ) {
    return error.message;
  }
  return "THE ITEM COULD NOT BE SAVED. TRY AGAIN.";
}

function initialEventDraft(date: string): EventDraft {
  const parsed = new Date(`${date}T12:00:00`);
  return {
    title: "",
    notes: "",
    color: DEFAULT_EVENT_COLOR,
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
  return {
    title: "",
    notes: "",
    color: DEFAULT_TASK_COLOR,
    date,
    time: "09:00",
  };
}

function Chip({
  label,
  selected,
  onPress,
  accessibilityLabel,
  role = "checkbox",
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
  role?: "checkbox" | "radio";
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole={role}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.selectedChip,
        pressed && styles.pressed,
      ]}
    >
      <Text
        maxFontSizeMultiplier={1.3}
        style={[styles.chipText, selected && styles.selectedChipText]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function FieldLabel({ children }: { children: string }) {
  return <Text style={styles.fieldLabel}>{children}</Text>;
}

function ColorPicker({
  value,
  onChange,
}: {
  value: ScheduleColor;
  onChange: (value: ScheduleColor) => void;
}) {
  return (
    <View style={styles.field}>
      <FieldLabel>COLOR</FieldLabel>
      <View
        accessibilityLabel="Schedule color"
        accessibilityRole="radiogroup"
        style={styles.colorPicker}
      >
        {SCHEDULE_COLORS.map((color) => {
          const selected = color.id === value;
          return (
            <Pressable
              accessibilityLabel={color.label}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              key={color.id}
              onPress={() => onChange(color.id)}
              style={({ pressed }) => [
                styles.colorOption,
                selected && styles.colorOptionSelected,
                pressed && styles.pressed,
              ]}
            >
              <View
                style={[
                  styles.colorSwatch,
                  { backgroundColor: scheduleColorValue(color.id) },
                ]}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
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
  onSaved: (date: Date, type: ItemType) => void;
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
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const slide = useRef(new Animated.Value(height)).current;
  const insets = useSafeAreaInsets();
  const timeZone = deviceTimeZone();
  const previewDates = useMemo(() => {
    if (!eventDraft.recurrenceEnabled) return [];
    try {
      const input = createEventInputFromDraft(
        {
          ...eventDraft,
          title: eventDraft.title.trim() || "Recurrence preview",
        },
        timeZone,
      );
      return previewEventOccurrences(input);
    } catch {
      return [];
    }
  }, [eventDraft, timeZone]);
  const previewFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: eventDraft.allDay ? undefined : "numeric",
        minute: eventDraft.allDay ? undefined : "2-digit",
      }),
    [eventDraft.allDay],
  );

  useEffect(() => {
    if (!visible) return;
    setItemType("task");
    setAdvanced(false);
    setEventDraft(initialEventDraft(initialDate));
    setTaskDraft(initialTaskDraft(initialDate));
    setErrorMessage(null);
    setSaving(false);
    setConfirmingDiscard(false);
    slide.setValue(height);
    Animated.spring(slide, {
      toValue: 0,
      useNativeDriver: true,
      tension: 60,
      friction: 12,
    }).start();
  }, [initialDate, slide, visible]);

  const finishClose = () => {
    Animated.timing(slide, {
      toValue: height,
      duration: 200,
      useNativeDriver: true,
    }).start(onClose);
  };
  const hasUnsavedChanges = () =>
    JSON.stringify(eventDraft) !== JSON.stringify(initialEventDraft(initialDate)) ||
    JSON.stringify(taskDraft) !== JSON.stringify(initialTaskDraft(initialDate));
  const requestClose = () => {
    if (saving) return;
    if (confirmingDiscard) {
      setConfirmingDiscard(false);
      return;
    }
    if (hasUnsavedChanges()) {
      setConfirmingDiscard(true);
      return;
    }
    finishClose();
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
        onSaved(input.dueAt, "task");
      } else {
        const input = createEventInputFromDraft(eventDraft, timeZone);
        await createEvent(input);
        onSaved(input.startsAt, "event");
      }
      onClose();
    } catch (error) {
      setSaving(false);
      setErrorMessage(readableItemError(error));
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
      onRequestClose={requestClose}
      transparent
      visible={visible}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.overlay}
      >
        <Animated.View
          accessibilityElementsHidden={confirmingDiscard}
          importantForAccessibility={
            confirmingDiscard ? "no-hide-descendants" : "auto"
          }
          style={[
            styles.sheet,
            {
              paddingBottom: insets.bottom + spacing.md,
              transform: [{ translateY: slide }],
            },
          ]}
        >
          <View style={styles.header}>
            <Text maxFontSizeMultiplier={1.4} style={styles.title}>
              SCHEDULE
            </Text>
            <Pressable
              accessibilityLabel="Close add item"
              accessibilityRole="button"
              hitSlop={8}
              onPress={requestClose}
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
              { value: "task", label: "TO DO" },
              { value: "event", label: "CALENDAR" },
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
                  <FieldLabel>TITLE</FieldLabel>
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
                <ColorPicker
                  onChange={(value) => updateTask("color", value)}
                  value={taskDraft.color}
                />
                {advanced ? (
                  <View style={styles.field}>
                    <FieldLabel>NOTES</FieldLabel>
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
                  <FieldLabel>TITLE</FieldLabel>
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
                  <FieldLabel>DATE</FieldLabel>
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

                <ColorPicker
                  onChange={(value) => updateEvent("color", value)}
                  value={eventDraft.color}
                />

                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: eventDraft.recurrenceEnabled }}
                  onPress={() => {
                    const enabled = !eventDraft.recurrenceEnabled;
                    updateEvent("recurrenceEnabled", enabled);
                    if (enabled) setAdvanced(true);
                  }}
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
                  <MaterialIcons
                    name={eventDraft.recurrenceEnabled ? "expand-less" : "expand-more"}
                    size={22}
                    color={colors.ink}
                  />
                </Pressable>

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
                      <FieldLabel>NOTES</FieldLabel>
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
                          <View
                            accessibilityLabel="Repeat frequency"
                            accessibilityRole="radiogroup"
                            style={styles.frequencyChips}
                          >
                            {FREQUENCIES.map((option) => (
                              <Chip
                                key={option.value}
                                label={option.label}
                                onPress={() =>
                                  updateEvent("frequency", option.value)
                                }
                                role="radio"
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
                                  accessibilityLabel={`Repeat on ${WEEKDAY_NAMES[day]}`}
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
                                <FieldLabel>MONTH</FieldLabel>
                                <View
                                  accessibilityLabel="Month of year"
                                  accessibilityRole="radiogroup"
                                  style={styles.wrapChips}
                                >
                                  {MONTHS.map((option, index) => {
                                    const month = index + 1;
                                    return (
                                      <Chip
                                        accessibilityLabel={
                                          option.accessibilityLabel
                                        }
                                        key={option.label}
                                        label={option.label}
                                        onPress={() =>
                                          updateEvent(
                                            "monthOfYear",
                                            String(month),
                                          )
                                        }
                                        role="radio"
                                        selected={
                                          Number(eventDraft.monthOfYear) === month
                                        }
                                      />
                                    );
                                  })}
                                </View>
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
                                <FieldLabel>DAY OF MONTH</FieldLabel>
                                <View style={styles.quickRow}>
                                  <TextInput
                                    accessibilityLabel="Numeric day of month"
                                    keyboardType="number-pad"
                                    maxLength={2}
                                    onChangeText={(value) =>
                                      updateEvent("dayOfMonth", value)
                                    }
                                    placeholder="1–31"
                                    placeholderTextColor={colors.muted}
                                    style={[styles.input, styles.quickField]}
                                    value={
                                      eventDraft.dayOfMonth === "-1"
                                        ? ""
                                        : eventDraft.dayOfMonth
                                    }
                                  />
                                  <View style={styles.lastDayOption}>
                                    <Chip
                                      label="LAST DAY"
                                      onPress={() =>
                                        updateEvent(
                                          "dayOfMonth",
                                          eventDraft.dayOfMonth === "-1"
                                            ? String(
                                                Number(eventDraft.date.slice(-2)) ||
                                                  1,
                                              )
                                            : "-1",
                                        )
                                      }
                                      selected={eventDraft.dayOfMonth === "-1"}
                                    />
                                  </View>
                                </View>
                              </View>
                            ) : (
                              <>
                                <View
                                  accessibilityLabel="Week of month"
                                  accessibilityRole="radiogroup"
                                  style={styles.wrapChips}
                                >
                                  {ORDINALS.map((option) => (
                                    <Chip
                                      key={option.value}
                                      label={option.label}
                                      onPress={() =>
                                        updateEvent("weekOfMonth", option.value)
                                      }
                                      role="radio"
                                      selected={
                                        eventDraft.weekOfMonth === option.value
                                      }
                                    />
                                  ))}
                                </View>
                                <View
                                  accessibilityLabel="Weekday of month"
                                  accessibilityRole="radiogroup"
                                  style={styles.weekdays}
                                >
                                  {WEEKDAYS.map((label, day) => (
                                    <Chip
                                      accessibilityLabel={WEEKDAY_NAMES[day]}
                                      key={`${label}-${day}`}
                                      label={label}
                                      onPress={() =>
                                        updateEvent("ordinalWeekday", day)
                                      }
                                      role="radio"
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

                        {previewDates.length > 0 ? (
                          <View style={styles.preview}>
                            <FieldLabel>UPCOMING</FieldLabel>
                            {previewDates.map((date) => (
                              <Text
                                key={date.toISOString()}
                                style={styles.previewDate}
                              >
                                {previewFormatter.format(date).toUpperCase()}
                              </Text>
                            ))}
                          </View>
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
              <Text maxFontSizeMultiplier={1.3} style={styles.moreText}>
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
              onPress={requestClose}
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && styles.pressed,
              ]}
            >
              <Text
                adjustsFontSizeToFit
                maxFontSizeMultiplier={1.3}
                minimumFontScale={0.8}
                numberOfLines={1}
                style={styles.cancelText}
              >
                CANCEL
              </Text>
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
              <Text
                adjustsFontSizeToFit
                maxFontSizeMultiplier={1.3}
                minimumFontScale={0.8}
                numberOfLines={1}
                style={styles.saveText}
              >
                {saving ? "SAVING…" : "SAVE"}
              </Text>
            </Pressable>
          </View>
        </Animated.View>

        {confirmingDiscard ? (
          <View accessibilityViewIsModal style={styles.confirmOverlay}>
            <View style={styles.confirmCard}>
              <Text style={styles.confirmTitle}>DISCARD ITEM?</Text>
              <Text style={styles.confirmBody}>
                YOUR CHANGES WILL NOT BE SAVED.
              </Text>
              <View style={styles.confirmActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setConfirmingDiscard(false)}
                  style={({ pressed }) => [
                    styles.confirmButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.confirmButtonText}>KEEP EDITING</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setConfirmingDiscard(false);
                    finishClose();
                  }}
                  style={({ pressed }) => [
                    styles.confirmButton,
                    styles.discardButton,
                    pressed && styles.discardPressed,
                  ]}
                >
                  <Text style={styles.discardText}>DISCARD</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ) : null}
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
  confirmOverlay: {
    ...StyleSheet.absoluteFillObject,
    padding: spacing.lg,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  confirmCard: {
    width: "100%",
    maxWidth: 360,
    padding: spacing.xl,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 12,
    backgroundColor: colors.background,
  },
  confirmTitle: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "900",
  },
  confirmBody: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    marginTop: spacing.xs,
  },
  confirmActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  confirmButton: {
    flex: 1,
    minHeight: 50,
    paddingHorizontal: spacing.xs,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radii.control,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmButtonText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center",
  },
  discardButton: {
    backgroundColor: colors.ink,
  },
  discardPressed: {
    backgroundColor: colors.destructive,
    borderColor: colors.destructive,
  },
  discardText: {
    color: colors.inverse,
    fontSize: 12,
    fontWeight: "900",
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
  lastDayOption: {
    justifyContent: "center",
  },
  moreButton: {
    minHeight: 48,
    borderRadius: radii.control,
    backgroundColor: colors.surfaceMuted,
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
    borderRadius: radii.control,
    backgroundColor: colors.surfaceMuted,
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
    borderTopWidth: 2,
    borderTopColor: colors.ink,
    paddingTop: spacing.md,
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
    flexWrap: "wrap",
    justifyContent: "flex-start",
    gap: 3,
  },
  wrapChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xxs,
  },
  colorPicker: {
    minHeight: 48,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: spacing.xxs,
  },
  colorOption: {
    width: 42,
    height: 42,
    borderWidth: 2,
    borderColor: "transparent",
    borderRadius: radii.control,
    alignItems: "center",
    justifyContent: "center",
  },
  colorOptionSelected: {
    borderColor: colors.ink,
  },
  colorSwatch: {
    width: 26,
    height: 26,
    borderRadius: 13,
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
  preview: {
    padding: spacing.sm,
    borderRadius: radii.control,
    backgroundColor: colors.surfaceMuted,
    gap: spacing.xxs,
  },
  previewDate: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: "800",
    fontFamily: "ui-monospace",
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
