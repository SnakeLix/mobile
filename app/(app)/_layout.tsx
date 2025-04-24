import React from "react";
import { Redirect, Stack } from "expo-router";
import { authStore } from "@/store/authStore";

export default function AppLayout() {
  const { user } = authStore();

  // If not logged in, redirect to the main login screen
  if (!user) {
    return <Redirect href="/" />;
  }

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="home"
        options={{
          title: "Documents",
          headerShown: true,
          headerStyle: { backgroundColor: "#10ac84" },
          headerTintColor: "#fff",
        }}
      />
      <Stack.Screen
        name="scan"
        options={{
          title: "Scanner",
          headerShown: false,
          headerStyle: { backgroundColor: "#10ac84" },
          headerTintColor: "#fff",
        }}
      />
      <Stack.Screen
        name="profile"
        options={{
          title: "Profile",
          headerShown: true,
          headerStyle: { backgroundColor: "#10ac84" },
          headerTintColor: "#fff",
        }}
      />
    </Stack>
  );
}
