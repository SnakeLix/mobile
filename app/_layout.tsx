import { useEffect } from "react";
import { Stack } from "expo-router";
import { authStore } from "@/store/authStore";

export default function AppLayout() {
  const { refreshSession } = authStore();

  useEffect(() => {
    // Check for existing session when app loads
    refreshSession();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(app)" options={{ headerShown: false }} />
    </Stack>
  );
}
