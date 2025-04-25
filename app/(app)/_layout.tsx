import React, { useEffect } from "react";
import { Redirect, Stack, useRouter } from "expo-router";
import { authStore } from "@/store/authStore";
import { Alert, View } from "react-native"; // Import View
import FloatingProcessBubble from "@/components/FloatingProcessBubble"; // Import the bubble component

export default function AppLayout() {
  const { user } = authStore();
  const router = useRouter();

  useEffect(() => {
    // Redirect to auth screen if user is not logged in
    if (!user) {
      // Use replace to prevent going back to the app stack after logging out
      router.replace("/auth");
      // Optionally show an alert
      // Alert.alert("Session expired", "Please log in again.");
    }
  }, [user, router]); // Add router to dependency array

  // If user is not logged in, render nothing or a loading indicator while redirecting
  if (!user) {
    return null; // Or <ActivityIndicator />;
  }

  // Render the stack navigator for authenticated users
  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        {/* ...existing Stack.Screen definitions... */}
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen
          name="home"
          options={{
            title: "Documents",
            headerShown: false,
            headerStyle: { backgroundColor: "#10ac84" },
            headerTintColor: "#fff",
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="scan"
          options={{
            title: "Scanner",
            headerShown: false,
            headerStyle: { backgroundColor: "#10ac84" },
            headerTintColor: "#fff",
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="profile"
          options={{
            title: "Profile",
            headerShown: false,
            headerStyle: { backgroundColor: "#10ac84" },
            headerTintColor: "#fff",
            gestureEnabled: false,
          }}
        />
      </Stack>
      {/* Render the floating bubble globally within the app layout */}
      <FloatingProcessBubble />
    </View>
  );
}
