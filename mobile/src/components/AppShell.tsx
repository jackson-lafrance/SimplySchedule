import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import BottomShelf, { type PrimaryTab } from "@/components/BottomShelf";
import CreateItemSheet from "@/components/CreateItemSheet";
import TopShelf from "@/components/TopShelf";
import { useSchedule } from "@/context/useSchedule";
import { localDateKey } from "@/domain/calendar";
import CalendarScreen from "@/screens/CalendarScreen";
import HomeScreen from "@/screens/HomeScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import { colors } from "@/theme";

export default function AppShell() {
  const { source, status } = useSchedule();
  const [activeTab, setActiveTab] = useState<PrimaryTab>("home");
  const [adding, setAdding] = useState(false);
  const [addDate, setAddDate] = useState(() => localDateKey(new Date()));

  const renderScreen = () => {
    switch (activeTab) {
      case "home":
        return <HomeScreen />;
      case "calendar":
        return <CalendarScreen />;
      case "settings":
        return <SettingsScreen />;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar style="dark" />
      <TopShelf source={source} status={status} />
      <View style={styles.screen}>{renderScreen()}</View>
      <BottomShelf
        activeTab={activeTab}
        onAdd={() => {
          setAddDate(localDateKey(new Date()));
          setAdding(true);
        }}
        onChangeTab={setActiveTab}
      />
      <CreateItemSheet
        initialDate={addDate}
        onClose={() => setAdding(false)}
        onSaved={() => {
          setAdding(false);
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
});
