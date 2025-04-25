import { Redirect } from "expo-router";
import { authStore } from "@/store/authStore";

export default function Index() {
  const { user } = authStore();

  // Redirect based on auth state
  if (user) {
    return <Redirect href="/(app)/home" />; // Redirect logged-in users to the home screen inside the app group
  } else {
    return <Redirect href="/auth" />; // Redirect logged-out users to the new auth screen
  }
}
