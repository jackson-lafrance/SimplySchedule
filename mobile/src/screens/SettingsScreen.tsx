import { ScrollView, StyleSheet, Text, View } from "react-native";

import SegmentedControl from "@/components/SegmentedControl";
import { usePreferences } from "@/context/PreferencesContext";
import { colors, radii, spacing } from "@/theme";

export default function SettingsScreen() {
  const { preferences, setPreference } = usePreferences();
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>WEEK START</Text>
        <SegmentedControl
          accessibilityLabel="Week starts on"
          onChange={(value) => setPreference("weekStartsOn", value)}
          options={[
            { value: 1 as const, label: "MONDAY" },
            { value: 0 as const, label: "SUNDAY" },
          ]}
          value={preferences.weekStartsOn}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>DEFAULT CALENDAR VIEW</Text>
        <SegmentedControl
          accessibilityLabel="Default calendar view"
          onChange={(value) => setPreference("defaultCalendarView", value)}
          options={[
            { value: "day" as const, label: "DAY" },
            { value: "week" as const, label: "WEEK" },
            { value: "month" as const, label: "MONTH" },
          ]}
          value={preferences.defaultCalendarView}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>TIME DISPLAY</Text>
        <SegmentedControl
          accessibilityLabel="Time display"
          onChange={(value) => setPreference("timeDisplay", value)}
          options={[
            { value: "12-hour" as const, label: "12 HOUR" },
            { value: "24-hour" as const, label: "24 HOUR" },
          ]}
          value={preferences.timeDisplay}
        />
      </View>

      <Text style={styles.version}>SIMPLYSCHEDULE V0.1.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  card: {
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radii.card,
    backgroundColor: colors.background,
    gap: spacing.sm,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.ink,
    textTransform: "uppercase",
  },
  version: {
    color: colors.divider,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    marginTop: spacing.xxl,
  },
});
