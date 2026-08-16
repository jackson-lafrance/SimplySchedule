import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import BottomShelf, { type PrimaryTab } from "@/components/BottomShelf";
import CreateItemSheet from "@/components/CreateItemSheet";
import TopShelf from "@/components/TopShelf";
import { useSchedule } from "@/context/useSchedule";
import { atLocalNoon, localDateKey } from "@/domain/calendar";
import CalendarScreen from "@/screens/CalendarScreen";
import HomeScreen from "@/screens/HomeScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import { colors, radii, spacing } from "@/theme";

export default function AppShell() {
  const {
    errorMessage,
    events,
    retry,
    source,
    status,
    tasks,
  } = useSchedule();
  const [activeTab, setActiveTab] = useState<PrimaryTab>("home");
  const [adding, setAdding] = useState(false);
  const [homeDate, setHomeDate] = useState(() => atLocalNoon(new Date()));
  const [calendarDate, setCalendarDate] = useState(() =>
    atLocalNoon(new Date()),
  );
  const [addDate, setAddDate] = useState(() => localDateKey(new Date()));

  const renderScreen = () => {
    if (status === "error") {
      return (
        <View style={styles.stateContainer}>
          <Text accessibilityRole="alert" style={styles.errorTitle}>
            SYNC UNAVAILABLE
          </Text>
          <Text style={styles.stateMessage}>
            {errorMessage ?? "THE SCHEDULE COULD NOT LOAD."}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={retry}
            style={({ pressed }) => [
              styles.retryButton,
              pressed && styles.retryPressed,
            ]}
          >
            <Text style={styles.retryText}>TRY AGAIN</Text>
          </Pressable>
        </View>
      );
    }

    switch (activeTab) {
      case "home":
        return (
          <HomeScreen
            onSelectDate={setHomeDate}
            selectedDate={homeDate}
          />
        );
      case "calendar":
        return (
          <CalendarScreen
            onSelectDate={setCalendarDate}
            selectedDate={calendarDate}
          />
        );
      case "settings":
        return <SettingsScreen />;
    }
  };

  if (status === "loading" && events.length === 0 && tasks.length === 0) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar style="dark" />
        <ActivityIndicator
          accessibilityLabel="Loading schedule"
          color={colors.ink}
          size="large"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar style="dark" />
      <TopShelf source={source} status={status} />
      <View style={styles.screen}>{renderScreen()}</View>
      <BottomShelf
        activeTab={activeTab}
        onAdd={() => {
          const selectedDate = activeTab === "calendar"
            ? calendarDate
            : activeTab === "home"
              ? homeDate
              : new Date();
          setAddDate(localDateKey(selectedDate));
          setAdding(true);
        }}
        onChangeTab={setActiveTab}
      />
      <CreateItemSheet
        initialDate={addDate}
        onClose={() => setAdding(false)}
        onSaved={(date) => {
          setAdding(false);
          setHomeDate(atLocalNoon(date));
          setActiveTab("home");
        }}
        visible={adding}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screen: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  stateContainer: {
    flex: 1,
    padding: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  errorTitle: {
    color: colors.destructive,
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
  },
  stateMessage: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
    textAlign: "center",
    marginTop: spacing.xs,
    maxWidth: 300,
  },
  retryButton: {
    minWidth: 160,
    minHeight: 50,
    marginTop: spacing.lg,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radii.control,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  retryPressed: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  retryText: {
    color: colors.inverse,
    fontSize: 14,
    fontWeight: "900",
  },
});
