// IMPORTANT: Import react-native-gesture-handler at the very top
import "react-native-gesture-handler";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useEffect } from "react";
import { Stack } from "expo-router";
import { authStore } from "@/store/authStore";

export default function RootLayout() {
  const { refreshSession } = authStore();

  useEffect(() => {
    refreshSession();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="index"
        options={{
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="(app)"
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />
    </Stack>
  );
}
