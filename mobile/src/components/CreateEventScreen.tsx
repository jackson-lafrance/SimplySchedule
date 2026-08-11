import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  alignDateKeyForPreset,
  createEventInputFromDraft,
  recurrencePresetSummary,
  type EventDraft,
  type RecurrencePreset,
} from "@/domain/eventForm";
import type {
  CreateEventInput,
  RecurrenceTerminationType,
} from "@/domain/events";
import { colors, radii, spacing, typography } from "@/theme";

const recurrenceOptions: { value: RecurrencePreset; label: string }[] = [
  { value: "none", label: "DOES NOT REPEAT" },
  { value: "firstOfMonth", label: "FIRST OF EVERY MONTH" },
  { value: "thirdFriday", label: "THIRD FRIDAY OF EVERY MONTH" },
  { value: "everyOtherDay", label: "EVERY OTHER DAY" },
  { value: "everyThreeDays", label: "EVERY THREE DAYS" },
  { value: "everyFiveHours", label: "EVERY FIVE HOURS" },
];

const terminationOptions: {
  value: RecurrenceTerminationType;
  label: string;
}[] = [
  { value: "never", label: "NEVER" },
  { value: "onDate", label: "THROUGH DATE" },
  { value: "afterOccurrences", label: "AFTER COUNT" },
];

function deviceTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function initialDraft(date: string): EventDraft {
  return {
    title: "",
    notes: "",
    date,
    startTime: "09:00",
    endTime: "10:00",
    allDay: false,
    recurrencePreset: "none",
    terminationType: "never",
    untilDate: date,
    occurrenceCount: "10",
  };
}

function FieldLabel({ children }: { children: string }) {
  return <Text style={styles.fieldLabel}>{children}</Text>;
}

export default function CreateEventScreen({
  initialDate,
  onCancel,
  onSave,
}: {
  initialDate: string;
  onCancel: () => void;
  onSave: (event: CreateEventInput) => Promise<void>;
}) {
  const [draft, setDraft] = useState(() => initialDraft(initialDate));
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const timeZone = deviceTimeZone();

  const update = <Field extends keyof EventDraft>(
    field: Field,
    value: EventDraft[Field],
  ) => setDraft((current) => ({ ...current, [field]: value }));

  const selectRecurrence = (preset: RecurrencePreset) => {
    setDraft((current) => {
      const date = alignDateKeyForPreset(current.date, preset);
      return {
        ...current,
        recurrencePreset: preset,
        date,
        untilDate: current.untilDate < date ? date : current.untilDate,
      };
    });
  };

  const selectDate = (selectedDate: string) => {
    setDraft((current) => {
      let date = selectedDate;
      try {
        date = alignDateKeyForPreset(selectedDate, current.recurrencePreset);
      } catch {
        // Keep partial input editable; submit validation provides the message.
      }
      return {
        ...current,
        date,
        untilDate: current.untilDate < date ? date : current.untilDate,
      };
    });
  };

  const submit = async () => {
    setErrorMessage(null);
    try {
      const event = createEventInputFromDraft(draft, timeZone);
      setSaving(true);
      await onSave(event);
    } catch (error) {
      setSaving(false);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "THE EVENT COULD NOT BE SAVED. TRY AGAIN.",
      );
    }
  };

  const repeats = draft.recurrencePreset !== "none";

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>NEW SCHEDULE ENTRY</Text>
            <Text style={styles.title}>EVENT DETAILS</Text>
          </View>
          <Pressable
            accessibilityLabel="Cancel event creation"
            accessibilityRole="button"
            disabled={saving}
            onPress={onCancel}
            style={({ pressed }) => [
              styles.closeButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.closeText}>×</Text>
          </Pressable>
        </View>

        <View style={styles.timeZoneBadge}>
          <Text style={styles.timeZoneLabel}>EVENT TIMEZONE</Text>
          <Text numberOfLines={1} style={styles.timeZoneValue}>
            {timeZone}
          </Text>
        </View>

        <View style={[styles.section, styles.primarySection]}>
          <Text style={styles.sectionTitle}>WHAT</Text>
          <View style={styles.field}>
            <FieldLabel>TITLE</FieldLabel>
            <TextInput
              accessibilityLabel="Event title"
              autoCapitalize="sentences"
              autoFocus
              maxLength={200}
              onChangeText={(value) => update("title", value)}
              placeholder="WHAT IS HAPPENING?"
              placeholderTextColor={colors.muted}
              selectionColor={colors.accent}
              style={styles.input}
              testID="event-title-input"
              value={draft.title}
            />
          </View>
          <View style={styles.field}>
            <FieldLabel>NOTES · OPTIONAL</FieldLabel>
            <TextInput
              accessibilityLabel="Event notes"
              maxLength={5_000}
              multiline
              onChangeText={(value) => update("notes", value)}
              placeholder="ADD THE USEFUL DETAILS."
              placeholderTextColor={colors.muted}
              selectionColor={colors.accent}
              style={[styles.input, styles.notesInput]}
              testID="event-notes-input"
              textAlignVertical="top"
              value={draft.notes}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>WHEN</Text>
          <View style={styles.field}>
            <FieldLabel>FIRST OCCURRENCE · YYYY-MM-DD</FieldLabel>
            <TextInput
              accessibilityLabel="First occurrence date, year month day"
              autoCorrect={false}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
              onChangeText={selectDate}
              placeholder="2026-08-11"
              placeholderTextColor={colors.muted}
              selectionColor={colors.accent}
              style={styles.input}
              testID="event-date-input"
              value={draft.date}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchCopy}>
              <Text style={styles.switchTitle}>ALL DAY</Text>
              <Text style={styles.helpText}>
                USE LOCAL MIDNIGHT BOUNDARIES.
              </Text>
            </View>
            <Switch
              accessibilityLabel="All day"
              ios_backgroundColor={colors.divider}
              onValueChange={(value) => update("allDay", value)}
              testID="event-all-day-switch"
              thumbColor={colors.background}
              trackColor={{ false: colors.divider, true: colors.accent }}
              value={draft.allDay}
            />
          </View>

          {!draft.allDay ? (
            <View style={styles.timeRow}>
              <View style={[styles.field, styles.timeField]}>
                <FieldLabel>START · HH:MM</FieldLabel>
                <TextInput
                  accessibilityLabel="Start time, 24 hour hour minute"
                  autoCorrect={false}
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                  onChangeText={(value) => update("startTime", value)}
                  placeholder="09:00"
                  placeholderTextColor={colors.muted}
                  selectionColor={colors.accent}
                  style={styles.input}
                  testID="event-start-time-input"
                  value={draft.startTime}
                />
              </View>
              <View style={[styles.field, styles.timeField]}>
                <FieldLabel>END · HH:MM</FieldLabel>
                <TextInput
                  accessibilityLabel="End time, 24 hour hour minute"
                  autoCorrect={false}
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                  onChangeText={(value) => update("endTime", value)}
                  placeholder="10:00"
                  placeholderTextColor={colors.muted}
                  selectionColor={colors.accent}
                  style={styles.input}
                  testID="event-end-time-input"
                  value={draft.endTime}
                />
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>REPEAT</Text>
          <Text style={styles.helpText}>
            CHOOSE A READY-TO-USE PATTERN. OCCURRENCES ARE CALCULATED ONLY FOR
            THE CALENDAR RANGE YOU VIEW.
          </Text>
          <View style={styles.optionList}>
            {recurrenceOptions.map((option) => {
              const selected = draft.recurrencePreset === option.value;
              return (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  key={option.value}
                  onPress={() => selectRecurrence(option.value)}
                  style={({ pressed }) => [
                    styles.option,
                    selected && styles.selectedOption,
                    pressed && styles.pressed,
                  ]}
                  testID={`recurrence-${option.value}`}
                >
                  <View
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                    style={[
                      styles.radio,
                      selected && styles.selectedRadio,
                    ]}
                  />
                  <Text
                    style={[
                      styles.optionLabel,
                      selected && styles.selectedOptionLabel,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {repeats ? (
            <>
              <View accessibilityRole="summary" style={styles.repeatSummary}>
                <Text style={styles.repeatIcon}>↻</Text>
                <View style={styles.repeatCopy}>
                  <Text style={styles.repeatTitle}>
                    {recurrencePresetSummary(draft.recurrencePreset)}
                  </Text>
                  <Text style={styles.repeatBody}>
                    FIRST OCCURRENCE: {draft.date}
                  </Text>
                </View>
              </View>

              <FieldLabel>ENDS</FieldLabel>
              <View style={styles.terminationList}>
                {terminationOptions.map((option) => {
                  const selected = draft.terminationType === option.value;
                  return (
                    <Pressable
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      key={option.value}
                      onPress={() => update("terminationType", option.value)}
                      style={({ pressed }) => [
                        styles.terminationOption,
                        selected && styles.selectedTermination,
                        pressed && styles.pressed,
                      ]}
                      testID={`termination-${option.value}`}
                    >
                      <Text
                        style={[
                          styles.terminationLabel,
                          selected && styles.selectedTerminationLabel,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {draft.terminationType === "onDate" ? (
                <View style={styles.field}>
                  <FieldLabel>THROUGH DATE · YYYY-MM-DD</FieldLabel>
                  <TextInput
                    accessibilityLabel="Repeat through date, year month day"
                    autoCorrect={false}
                    keyboardType="numbers-and-punctuation"
                    maxLength={10}
                    onChangeText={(value) => update("untilDate", value)}
                    placeholder={draft.date}
                    placeholderTextColor={colors.muted}
                    selectionColor={colors.accent}
                    style={styles.input}
                    testID="event-until-date-input"
                    value={draft.untilDate}
                  />
                </View>
              ) : null}

              {draft.terminationType === "afterOccurrences" ? (
                <View style={styles.field}>
                  <FieldLabel>OCCURRENCES · 1–999</FieldLabel>
                  <TextInput
                    accessibilityLabel="Number of occurrences"
                    keyboardType="number-pad"
                    maxLength={3}
                    onChangeText={(value) => update("occurrenceCount", value)}
                    placeholder="10"
                    placeholderTextColor={colors.muted}
                    selectionColor={colors.accent}
                    style={styles.input}
                    testID="event-occurrence-count-input"
                    value={draft.occurrenceCount}
                  />
                </View>
              ) : null}
            </>
          ) : null}
        </View>

        {errorMessage ? (
          <View accessibilityRole="alert" style={styles.error}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            disabled={saving}
            onPress={onCancel}
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
            onPress={submit}
            style={({ pressed }) => [
              styles.saveButton,
              saving && styles.disabled,
              pressed && styles.savePressed,
            ]}
            testID="save-event-button"
          >
            <Text style={styles.saveText}>
              {saving ? "SAVING…" : "SAVE EVENT"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: 56,
    gap: spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  headerCopy: {
    flex: 1,
  },
  eyebrow: {
    ...typography.label,
    color: colors.accent,
    marginBottom: spacing.xxs,
  },
  title: {
    ...typography.display,
    color: colors.ink,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radii.control,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: {
    color: colors.ink,
    fontSize: 30,
    fontWeight: "700",
    lineHeight: 32,
  },
  timeZoneBadge: {
    minHeight: 42,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radii.control,
    paddingHorizontal: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  timeZoneLabel: {
    ...typography.label,
    color: colors.muted,
  },
  timeZoneValue: {
    ...typography.label,
    color: colors.ink,
    flexShrink: 1,
    textAlign: "right",
  },
  section: {
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radii.card,
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.background,
  },
  primarySection: {
    borderTopColor: colors.accent,
    borderTopWidth: 6,
  },
  sectionTitle: {
    ...typography.heading,
    color: colors.ink,
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
    color: colors.ink,
    backgroundColor: colors.background,
    fontSize: 15,
    fontWeight: "700",
  },
  notesInput: {
    minHeight: 88,
  },
  switchRow: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    borderTopWidth: 1,
    borderColor: colors.divider,
    paddingTop: spacing.sm,
  },
  switchCopy: {
    flex: 1,
  },
  switchTitle: {
    ...typography.body,
    color: colors.ink,
  },
  helpText: {
    ...typography.caption,
    color: colors.muted,
    fontSize: 10,
    lineHeight: 15,
  },
  timeRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  timeField: {
    flex: 1,
  },
  optionList: {
    gap: spacing.xs,
  },
  option: {
    minHeight: 46,
    borderWidth: 2,
    borderColor: colors.divider,
    borderRadius: radii.control,
    paddingHorizontal: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  selectedOption: {
    borderColor: colors.ink,
    backgroundColor: colors.ink,
  },
  radio: {
    width: 14,
    height: 14,
    borderWidth: 2,
    borderColor: colors.muted,
    borderRadius: radii.pill,
  },
  selectedRadio: {
    borderColor: colors.inverse,
    backgroundColor: colors.success,
  },
  optionLabel: {
    ...typography.label,
    color: colors.ink,
    flex: 1,
  },
  selectedOptionLabel: {
    color: colors.inverse,
  },
  repeatSummary: {
    borderWidth: 2,
    borderColor: colors.accent,
    borderRadius: radii.control,
    padding: spacing.sm,
    backgroundColor: "#EEEDFF",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  repeatIcon: {
    color: colors.accent,
    fontSize: 24,
    fontWeight: "900",
  },
  repeatCopy: {
    flex: 1,
  },
  repeatTitle: {
    ...typography.label,
    color: colors.accent,
    marginBottom: spacing.xxs,
  },
  repeatBody: {
    ...typography.caption,
    color: colors.ink,
    fontSize: 10,
  },
  terminationList: {
    flexDirection: "row",
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radii.control,
    overflow: "hidden",
  },
  terminationOption: {
    minHeight: 44,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xxs,
  },
  selectedTermination: {
    backgroundColor: colors.ink,
  },
  terminationLabel: {
    ...typography.label,
    color: colors.ink,
    fontSize: 8,
    textAlign: "center",
  },
  selectedTerminationLabel: {
    color: colors.inverse,
  },
  error: {
    borderWidth: 2,
    borderColor: colors.destructive,
    borderRadius: radii.control,
    padding: spacing.sm,
  },
  errorText: {
    ...typography.caption,
    color: colors.destructive,
    lineHeight: 17,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  cancelButton: {
    minHeight: 52,
    flex: 1,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radii.control,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    ...typography.body,
    color: colors.ink,
  },
  saveButton: {
    minHeight: 52,
    flex: 2,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radii.control,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: {
    ...typography.body,
    color: colors.inverse,
  },
  pressed: {
    opacity: 0.55,
  },
  savePressed: {
    backgroundColor: colors.success,
  },
  disabled: {
    opacity: 0.5,
  },
});
