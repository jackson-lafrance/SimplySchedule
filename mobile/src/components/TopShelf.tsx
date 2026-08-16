import { MaterialIcons } from "@expo/vector-icons";
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useEffect, useRef, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type {
  ScheduleSource,
  ScheduleStatus,
} from "@/context/scheduleContextValue";
import { colors, radii, spacing, typography } from "@/theme";

const { height } = Dimensions.get("window");

export default function TopShelf({
  source,
  status,
}: {
  source: ScheduleSource;
  status: ScheduleStatus;
}) {
  const [visible, setVisible] = useState(false);
  const slide = useRef(new Animated.Value(height)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!visible) return;
    Animated.spring(slide, {
      toValue: 0,
      useNativeDriver: true,
      tension: 60,
      friction: 12,
    }).start();
  }, [slide, visible]);

  const close = () => {
    Animated.timing(slide, {
      toValue: height,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setVisible(false));
  };

  const sourceLabel = source === "firebase" ? "CLOUD SYNC" : "THIS SESSION";
  const statusLabel =
    status === "loading"
      ? "CONNECTING"
      : status === "error"
        ? "NEEDS ATTENTION"
        : "READY";

  return (
    <View style={styles.shelf}>
      <Text
        accessibilityRole="header"
        adjustsFontSizeToFit
        maxFontSizeMultiplier={1.2}
        minimumFontScale={0.78}
        numberOfLines={1}
        style={styles.logo}
      >
        SimplySchedule
      </Text>
      <Pressable
        accessibilityLabel="Open profile"
        accessibilityRole="button"
        onPress={() => setVisible(true)}
        style={({ pressed }) => [
          styles.profileItem,
          pressed && styles.profilePressed,
        ]}
      >
        <MaterialIcons name="person" size={28} color={colors.ink} />
        <Text
          adjustsFontSizeToFit
          maxFontSizeMultiplier={1.3}
          minimumFontScale={0.8}
          numberOfLines={1}
          style={styles.profileLabel}
        >
          PROFILE
        </Text>
      </Pressable>

      <Modal
        animationType="fade"
        onRequestClose={close}
        transparent
        visible={visible}
      >
        <View style={styles.overlay}>
          <Animated.View
            style={[
              styles.sheet,
              {
                paddingBottom: insets.bottom + spacing.lg,
                transform: [{ translateY: slide }],
              },
            ]}
          >
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>PROFILE</Text>
              <Pressable
                accessibilityLabel="Close profile"
                accessibilityRole="button"
                hitSlop={8}
                onPress={close}
              >
                <MaterialIcons name="close" size={28} color={colors.ink} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.sheetContent}>
              <View style={styles.avatar}>
                <MaterialIcons name="person" size={40} color={colors.ink} />
              </View>
              <Text style={styles.profileTitle}>
                {source === "firebase" ? "SYNCED SCHEDULE" : "LOCAL PREVIEW"}
              </Text>

              <View style={styles.statusCard}>
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>DATA</Text>
                  <Text style={styles.statusValue}>{sourceLabel}</Text>
                </View>
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>STATUS</Text>
                  <Text style={styles.statusValue}>{statusLabel}</Text>
                </View>
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>TIMEZONE</Text>
                  <Text numberOfLines={1} style={styles.statusValue}>
                    {Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"}
                  </Text>
                </View>
              </View>

              <Text style={styles.version}>SIMPLYSCHEDULE V0.1.0</Text>
            </ScrollView>
            <Pressable
              accessibilityRole="button"
              onPress={close}
              style={({ pressed }) => [
                styles.doneButton,
                pressed && styles.donePressed,
              ]}
            >
              <Text style={styles.doneText}>DONE</Text>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  shelf: {
    height: 80,
    width: "100%",
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background,
    borderBottomWidth: 2,
    borderBottomColor: colors.ink,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logo: {
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: -1,
    color: colors.ink,
    textTransform: "uppercase",
    flexShrink: 1,
  },
  profileItem: {
    minWidth: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  profilePressed: {
    opacity: 0.7,
  },
  profileLabel: {
    fontSize: 10,
    fontWeight: "800",
    marginTop: 2,
    color: colors.ink,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    height: "72%",
    padding: spacing.xl,
    backgroundColor: colors.background,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderColor: colors.ink,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xl,
  },
  sheetTitle: {
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: -0.5,
    color: colors.ink,
  },
  sheetContent: {
    alignItems: "center",
    paddingBottom: spacing.xl,
  },
  avatar: {
    width: 76,
    height: 76,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  profileTitle: {
    ...typography.heading,
    color: colors.ink,
    textAlign: "center",
  },
  statusCard: {
    marginTop: spacing.xl,
    width: "100%",
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radii.card,
    padding: spacing.md,
    gap: spacing.sm,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  statusLabel: {
    ...typography.label,
    color: colors.muted,
  },
  statusValue: {
    ...typography.label,
    color: colors.ink,
    flexShrink: 1,
    textAlign: "right",
  },
  version: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.divider,
    marginTop: spacing.xxl,
  },
  doneButton: {
    minHeight: 54,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radii.control,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  donePressed: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  doneText: {
    color: colors.inverse,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1,
  },
});
