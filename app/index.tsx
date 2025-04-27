import { Redirect } from "expo-router";
import { authStore } from "@/store/authStore";
import { useEffect } from "react";
// Import to trigger model initialization
import "@/hooks/useObjectDetection";

export default function Index() {
  const { user } = authStore();

  // Pre-initialize the model when app loads
  useEffect(() => {
    // The model initialization is triggered when the module is imported
    console.log("App is initializing - object detection model loading in background");
  }, []);

  // Redirect based on auth state
  if (user) {
    return <Redirect href="/(app)/home" />; // Redirect logged-in users to the home screen inside the app group
  } else {
    return <Redirect href="/auth" />; // Redirect logged-out users to the new auth screen
  }
}
