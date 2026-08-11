import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import AgendaView from "@/components/AgendaView";
import CreateEventScreen from "@/components/CreateEventScreen";
import EventList from "@/components/EventList";
import MonthGrid from "@/components/MonthGrid";
import { useSchedule } from "@/context/useSchedule";
import {
  addMonths,
  countEventsInMonth,
  eventsForDate,
  getMonthAgenda,
  getMonthDays,
  localDateKey,
  startOfMonth,
  visibleRangeForMonth,
  type CalendarDay,
} from "@/domain/calendar";
import type { CalendarView, CreateEventInput } from "@/domain/events";
import { expandEventsInRange } from "@/domain/recurrence";
import { colors, radii, spacing, typography } from "@/theme";

const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});
const selectedDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "long",
  weekday: "long",
});
const fullDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "long",
  weekday: "long",
  year: "numeric",
});

export default function HomeScreen() {
  const {
    events: canonicalEvents,
    status,
    source,
    errorMessage,
    lastUpdatedAt,
    createEvent,
    retry,
    setVisibleRange,
  } = useSchedule();
  const [today] = useState(() => new Date());
  const [anchorDate, setAnchorDate] = useState(() => startOfMonth(today));
  const [selectedDate, setSelectedDate] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12),
  );
  const [view, setView] = useState<CalendarView>("month");
  const [creating, setCreating] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const visibleRange = useMemo(
    () => visibleRangeForMonth(anchorDate),
    [anchorDate],
  );
  const events = useMemo(
    () => expandEventsInRange(canonicalEvents, visibleRange),
    [canonicalEvents, visibleRange],
  );
  const monthDays = useMemo(
    () => getMonthDays(anchorDate, today),
    [anchorDate, today],
  );
  const selectedEvents = useMemo(
    () => eventsForDate(events, selectedDate),
    [events, selectedDate],
  );
  const agenda = useMemo(
    () => getMonthAgenda(anchorDate, events, today),
    [anchorDate, events, today],
  );
  const scheduledEntryCount = useMemo(
    () => countEventsInMonth(anchorDate, events),
    [anchorDate, events],
  );

  useEffect(() => {
    setVisibleRange(visibleRange);
  }, [setVisibleRange, visibleRange]);

  const showDateAtTop = (date: Date) => {
    setAnchorDate(startOfMonth(date));
    setSelectedDate(date);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const moveMonth = (amount: number) => {
    showDateAtTop(addMonths(anchorDate, amount));
  };

  const goToToday = () => {
    const now = new Date();
    showDateAtTop(
      new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12),
    );
  };

  const selectDay = (day: CalendarDay) => {
    setSelectedDate(day.date);
    if (!day.isCurrentMonth) {
      setAnchorDate(startOfMonth(day.date));
    }
  };

  const saveEvent = async (input: CreateEventInput) => {
    await createEvent(input);
    const eventDate = new Date(
      input.startsAt.getFullYear(),
      input.startsAt.getMonth(),
      input.startsAt.getDate(),
      12,
    );
    setAnchorDate(startOfMonth(eventDate));
    setSelectedDate(eventDate);
    setView("month");
    setCreating(false);
  };

  const sourceLabel =
    status === "loading"
      ? "SYNCING"
      : status === "error"
        ? "SYNC ERROR"
        : source === "firebase"
          ? "FIREBASE LIVE"
          : "LOCAL PREVIEW";

  if (creating) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <StatusBar style="dark" />
        <CreateEventScreen
          initialDate={localDateKey(selectedDate)}
          onCancel={() => setCreating(false)}
          onSave={saveEvent}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.content}
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.siteHeader}>
          <Pressable
            accessibilityLabel="Simply Schedule, go to today"
            accessibilityRole="button"
            onPress={goToToday}
            style={({ pressed }) => [styles.brand, pressed && styles.pressed]}
          >
            <View style={styles.brandMark}>
              <Text style={styles.brandMarkText}>SS</Text>
            </View>
            <Text style={styles.brandName}>SIMPLY SCHEDULE</Text>
          </Pressable>
          <View
            accessibilityLabel={sourceLabel}
            accessibilityLiveRegion="polite"
            style={[
              styles.sourceBadge,
              status === "error" && styles.sourceBadgeError,
            ]}
          >
            <View
              style={[
                styles.sourceDot,
                source === "preview" && styles.previewDot,
                status === "error" && styles.errorDot,
              ]}
            />
            <Text style={styles.sourceLabel}>{sourceLabel}</Text>
          </View>
        </View>

        <View style={styles.pageIntro}>
          <View style={styles.introCopy}>
            <Text style={styles.eyebrow}>YOUR SCHEDULE</Text>
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.78}
              numberOfLines={1}
              style={styles.title}
            >
              {monthFormatter.format(anchorDate)}
            </Text>
            <Text style={styles.subtitle}>
              {scheduledEntryCount} SCHEDULED {scheduledEntryCount === 1 ? "ENTRY" : "ENTRIES"}
            </Text>
          </View>
          <View style={styles.introActions}>
            <Pressable
              accessibilityLabel="Create event"
              accessibilityRole="button"
              onPress={() => setCreating(true)}
              style={({ pressed }) => [
                styles.createButton,
                pressed && styles.primaryPressed,
              ]}
              testID="create-event-button"
            >
              <Text style={styles.createButtonText}>＋ EVENT</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={goToToday}
              style={({ pressed }) => [
                styles.todayButton,
                pressed && styles.primaryPressed,
              ]}
            >
              <Text style={styles.todayButtonText}>TODAY</Text>
            </Pressable>
          </View>
        </View>

        {source === "preview" ? (
          <View accessibilityRole="summary" style={styles.previewNotice}>
            <Text style={styles.noticeTitle}>LOCAL PREVIEW</Text>
            <Text style={styles.noticeBody}>
              EVENTS CREATED HERE LAST FOR THIS APP SESSION. ADD THE EXPO FIREBASE VALUES TO USE THE SHARED SCHEDULE.
            </Text>
          </View>
        ) : null}

        {status === "error" ? (
          <View accessibilityRole="alert" style={styles.errorNotice}>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={retry}
              style={({ pressed }) => [
                styles.retryButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.retryText}>RETRY</Text>
            </Pressable>
          </View>
        ) : null}

        <View
          accessibilityLabel="Schedule calendar"
          style={styles.calendarSurface}
        >
          <View style={styles.monthNavigation}>
            <Pressable
              accessibilityLabel="Previous month"
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => moveMonth(-1)}
              style={({ pressed }) => [
                styles.iconButton,
                pressed && styles.primaryPressed,
              ]}
            >
              <Text style={styles.iconButtonText}>←</Text>
            </Pressable>
            <View style={styles.monthHeading}>
              <Text style={styles.eyebrow}>VIEWING</Text>
              <Text style={styles.monthTitle}>
                {monthFormatter.format(anchorDate)}
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Next month"
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => moveMonth(1)}
              style={({ pressed }) => [
                styles.iconButton,
                pressed && styles.primaryPressed,
              ]}
            >
              <Text style={styles.iconButtonText}>→</Text>
            </Pressable>
          </View>

          <View accessibilityRole="tablist" style={styles.viewSwitcher}>
            {(["month", "agenda"] as const).map((option) => {
              const active = view === option;
              return (
                <Pressable
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  key={option}
                  onPress={() => setView(option)}
                  style={({ pressed }) => [
                    styles.viewButton,
                    active && styles.activeViewButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.viewButtonText,
                      active && styles.activeViewButtonText,
                    ]}
                  >
                    {option.toUpperCase()}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {status === "loading" ? (
            <View
              accessibilityLabel="Loading schedule"
              accessibilityRole="progressbar"
              style={styles.loading}
            >
              <ActivityIndicator color={colors.ink} />
              <Text style={styles.loadingText}>LOADING SCHEDULE…</Text>
            </View>
          ) : null}

          {view === "month" ? (
            <View style={styles.monthView}>
              <MonthGrid
                days={monthDays}
                events={events}
                onSelectDay={selectDay}
                selectedKey={localDateKey(selectedDate)}
              />
              <View style={styles.selectedDay}>
                <View style={styles.selectedDayHeading}>
                  <View style={styles.selectedDayCopy}>
                    <Text style={styles.eyebrow}>
                      {localDateKey(selectedDate) === localDateKey(today)
                        ? "TODAY"
                        : "SELECTED DAY"}
                    </Text>
                    <Text style={styles.selectedDayTitle}>
                      {selectedDateFormatter.format(selectedDate)}
                    </Text>
                  </View>
                  <Text style={styles.eventCount}>
                    {selectedEvents.length} {selectedEvents.length === 1 ? "EVENT" : "EVENTS"}
                  </Text>
                </View>
                <EventList
                  emptyMessage="NO EVENTS SCHEDULED."
                  events={selectedEvents}
                  showNotes
                />
              </View>
            </View>
          ) : (
            <AgendaView agenda={agenda} />
          )}
        </View>

        <View style={styles.dataNote}>
          <View style={styles.dataNoteCopy}>
            <Text style={styles.eyebrow}>CALENDAR DATA</Text>
            <Text style={styles.dataNoteBody}>
              {source === "firebase"
                ? "READING AND WRITING USER-SCOPED EVENTS IN THE VISIBLE SIX-WEEK RANGE."
                : "SHOWING SAMPLE AND SESSION-ONLY CREATED EVENTS."}
            </Text>
          </View>
          <Text style={styles.updatedAt}>
            {lastUpdatedAt
              ? `UPDATED ${lastUpdatedAt.toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })}`
              : fullDateFormatter.format(today).toUpperCase()}
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>SIMPLY SCHEDULE</Text>
          <Text style={styles.footerText}>IOS CALENDAR · CREATE + REPEAT</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: 48,
  },
  siteHeader: {
    minHeight: 62,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 2,
    borderColor: colors.ink,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flexShrink: 1,
  },
  brandMark: {
    width: 34,
    height: 34,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radii.control,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  brandMarkText: {
    color: colors.inverse,
    fontSize: 11,
    fontWeight: "900",
  },
  brandName: {
    ...typography.label,
    color: colors.ink,
    fontSize: 9,
  },
  sourceBadge: {
    minHeight: 28,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xxs,
  },
  sourceBadgeError: {
    borderColor: colors.destructive,
  },
  sourceDot: {
    width: 7,
    height: 7,
    borderRadius: radii.pill,
    backgroundColor: colors.success,
  },
  previewDot: {
    backgroundColor: colors.accent,
  },
  errorDot: {
    backgroundColor: colors.destructive,
  },
  sourceLabel: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.4,
    color: colors.ink,
  },
  pageIntro: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  introCopy: {
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
    textTransform: "uppercase",
  },
  subtitle: {
    ...typography.label,
    color: colors.muted,
    marginTop: spacing.xs,
  },
  introActions: {
    alignItems: "stretch",
    gap: spacing.xs,
  },
  createButton: {
    minHeight: 44,
    minWidth: 92,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radii.control,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  createButtonText: {
    ...typography.body,
    color: colors.inverse,
    fontSize: 13,
  },
  todayButton: {
    minHeight: 44,
    minWidth: 92,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radii.control,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  todayButtonText: {
    ...typography.body,
    color: colors.inverse,
    fontSize: 13,
  },
  previewNotice: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.accent,
    borderRadius: radii.control,
    padding: spacing.sm,
    backgroundColor: "#EEEDFF",
  },
  noticeTitle: {
    ...typography.label,
    color: colors.accent,
    marginBottom: spacing.xxs,
  },
  noticeBody: {
    ...typography.caption,
    color: colors.ink,
    fontSize: 10,
    lineHeight: 15,
  },
  errorNotice: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.destructive,
    borderRadius: radii.control,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  errorText: {
    ...typography.caption,
    color: colors.destructive,
    lineHeight: 17,
  },
  retryButton: {
    minHeight: 40,
    borderWidth: 2,
    borderColor: colors.destructive,
    borderRadius: radii.control,
    alignItems: "center",
    justifyContent: "center",
  },
  retryText: {
    ...typography.body,
    color: colors.destructive,
  },
  calendarSurface: {
    marginHorizontal: spacing.lg,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radii.card,
    padding: spacing.md,
    backgroundColor: colors.background,
  },
  monthNavigation: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  monthHeading: {
    flex: 1,
    alignItems: "center",
  },
  monthTitle: {
    ...typography.heading,
    color: colors.ink,
    textTransform: "uppercase",
    textAlign: "center",
  },
  iconButton: {
    width: 44,
    height: 44,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radii.control,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  iconButtonText: {
    color: colors.ink,
    fontSize: 23,
    fontWeight: "900",
  },
  viewSwitcher: {
    flexDirection: "row",
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radii.control,
    overflow: "hidden",
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  viewButton: {
    flex: 1,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  activeViewButton: {
    backgroundColor: colors.ink,
  },
  viewButtonText: {
    ...typography.label,
    color: colors.ink,
  },
  activeViewButtonText: {
    color: colors.inverse,
  },
  loading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    minHeight: 44,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.divider,
    marginBottom: spacing.md,
  },
  loadingText: {
    ...typography.label,
    color: colors.ink,
  },
  monthView: {
    gap: spacing.xl,
  },
  selectedDay: {
    gap: spacing.sm,
  },
  selectedDayHeading: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: spacing.sm,
    borderBottomWidth: 2,
    borderColor: colors.ink,
    paddingBottom: spacing.xs,
  },
  selectedDayCopy: {
    flex: 1,
  },
  selectedDayTitle: {
    ...typography.heading,
    color: colors.ink,
    textTransform: "uppercase",
  },
  eventCount: {
    ...typography.label,
    color: colors.muted,
    paddingBottom: 2,
  },
  dataNote: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radii.card,
    padding: spacing.md,
    gap: spacing.sm,
  },
  dataNoteCopy: {
    gap: spacing.xxs,
  },
  dataNoteBody: {
    ...typography.caption,
    color: colors.ink,
    fontSize: 10,
    lineHeight: 15,
  },
  updatedAt: {
    ...typography.label,
    color: colors.muted,
    fontFamily: "ui-monospace",
    lineHeight: 15,
  },
  footer: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 2,
    borderColor: colors.ink,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  footerText: {
    ...typography.label,
    color: colors.muted,
    fontSize: 8,
  },
  pressed: {
    opacity: 0.55,
  },
  primaryPressed: {
    backgroundColor: colors.success,
  },
});
