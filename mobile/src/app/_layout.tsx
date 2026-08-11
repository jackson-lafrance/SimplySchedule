import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ScheduleProvider } from "@/context/ScheduleContext";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ScheduleProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </ScheduleProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
