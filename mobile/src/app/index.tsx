import { StatusBar } from "expo-status-bar";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, radii, spacing, typography } from "@/theme";

const FOUNDATION_ITEMS = [
  "Tasks with subtasks",
  "Calendar and list views",
  "Single and repeating events",
];

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>SIMPLY SCHEDULE</Text>
          <Text style={styles.title}>Make time for what matters.</Text>
          <Text style={styles.subtitle}>
            A clear place for tasks, subtasks, and events.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>UP NEXT</Text>
          <Text style={styles.emptyTitle}>Nothing scheduled yet.</Text>
          <Text style={styles.emptyBody}>
            Your schedule will appear here once the foundation is connected.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>FOUNDATION</Text>
          {FOUNDATION_ITEMS.map((item) => (
            <View key={item} style={styles.foundationRow}>
              <View style={styles.foundationMarker} />
              <Text style={styles.foundationLabel}>{item}</Text>
            </View>
          ))}
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  header: {
    marginBottom: spacing.xxl,
  },
  eyebrow: {
    ...typography.label,
    color: colors.muted,
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.display,
    color: colors.ink,
    maxWidth: 340,
  },
  subtitle: {
    ...typography.body,
    color: colors.muted,
    marginTop: spacing.md,
    maxWidth: 320,
  },
  card: {
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radii.card,
    padding: spacing.lg,
    backgroundColor: colors.background,
    marginBottom: spacing.xxl,
  },
  cardEyebrow: {
    ...typography.label,
    color: colors.accent,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.heading,
    color: colors.ink,
  },
  emptyBody: {
    ...typography.caption,
    color: colors.muted,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  foundationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 32,
  },
  foundationMarker: {
    width: 8,
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.success,
  },
  foundationLabel: {
    ...typography.body,
    color: colors.ink,
  },
});
