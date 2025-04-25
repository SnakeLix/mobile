import React, { useEffect } from "react";
import { Redirect, Stack, useRouter, usePathname } from "expo-router";
import { authStore } from "@/store/authStore";
import { Alert, View } from "react-native"; // Import View
import FloatingProcessBubble from "@/components/FloatingProcessBubble"; // Import the bubble component
import BottomNavigation from "@/components/BottomNavigation"; // Import BottomNavigation

export default function AppLayout() {
  const { user } = authStore();
  const router = useRouter();
  const pathname = usePathname();

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

  // Navigation handlers
  const handleScanPress = () => {
    router.push("/scan");
  };

  const handleDocumentsPress = () => {
    router.push("/home");
  };

  const handleProfilePress = () => {
    router.push("/profile");
  };

  // Determine if we need to show the bottom navigation
  // Check multiple possible path formats to ensure we catch the scan screen
  const isScanScreen =
    pathname === "/(app)/scan" ||
    pathname === "/scan" ||
    pathname.includes("scan");
  const showBottomNav = !isScanScreen;

  // Determine current active tab
  const currentRoute = pathname.split("/").pop();

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
      {/* Only render the BottomNavigation when not on the scan screen */}
      {showBottomNav && (
        <BottomNavigation
          onScanPress={handleScanPress}
          onDocumentsPress={handleDocumentsPress}
          onProfilePress={handleProfilePress}
          activeTab={currentRoute || "home"}
        />
      )}
      {/* Render the floating bubble globally within the app layout */}
      <FloatingProcessBubble />
    </View>
  );
}
