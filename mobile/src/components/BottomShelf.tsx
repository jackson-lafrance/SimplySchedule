import { MaterialIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PRIMARY_SCHEDULE_ACTION_LABEL } from "@/domain/navigationLabels";
import { colors, radii, spacing } from "@/theme";

export type PrimaryTab = "home" | "calendar" | "settings";

const tabs: {
  key: PrimaryTab;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
}[] = [
  { key: "home", label: "HOME", icon: "home" },
  { key: "calendar", label: "CALENDAR", icon: "calendar-month" },
  { key: "settings", label: "SETTINGS", icon: "settings" },
];

export default function BottomShelf({
  activeTab,
  onChangeTab,
  onAdd,
}: {
  activeTab: PrimaryTab;
  onChangeTab: (tab: PrimaryTab) => void;
  onAdd: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.shelf, { paddingBottom: insets.bottom + 10 }]}>
      <Pressable
        accessibilityLabel="Add task or event"
        accessibilityRole="button"
        onPress={onAdd}
        style={({ pressed }) => [
          styles.addButton,
          pressed && styles.addButtonPressed,
        ]}
        testID="add-item-button"
      >
        <Text
          adjustsFontSizeToFit
          maxFontSizeMultiplier={1.3}
          minimumFontScale={0.75}
          numberOfLines={1}
          style={styles.addText}
        >
          {PRIMARY_SCHEDULE_ACTION_LABEL}
        </Text>
      </Pressable>

      <View accessibilityRole="tablist" style={styles.tabBar}>
        {tabs.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              key={tab.key}
              onPress={() => onChangeTab(tab.key)}
              style={({ pressed }) => [
                styles.tabItem,
                pressed && styles.tabPressed,
              ]}
              testID={`tab-${tab.key}`}
            >
              <MaterialIcons
                name={tab.icon}
                size={28}
                color={active ? colors.ink : colors.muted}
              />
              <Text
                adjustsFontSizeToFit
                maxFontSizeMultiplier={1.3}
                minimumFontScale={0.8}
                numberOfLines={1}
                style={[
                  styles.tabLabel,
                  { color: active ? colors.ink : colors.muted },
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shelf: {
    backgroundColor: colors.background,
    borderTopWidth: 2,
    borderTopColor: colors.ink,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
  },
  addButton: {
    minHeight: 54,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radii.control,
    backgroundColor: colors.ink,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  addButtonPressed: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  addText: {
    color: colors.inverse,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1,
  },
  tabBar: {
    height: 60,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  tabItem: {
    minWidth: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  tabPressed: {
    opacity: 0.65,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "800",
    marginTop: spacing.xxs,
  },
});
