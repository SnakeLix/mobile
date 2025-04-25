import { View, StyleSheet } from "react-native";
import Auth from "@/components/Auth";
import { useEffect } from "react"; // Import useEffect
import { useRouter } from "expo-router"; // Import useRouter
import { authStore } from "@/store/authStore"; // Import authStore

export default function AuthScreen() {
  const router = useRouter(); // Get router instance
  const user = authStore((state) => state.user); // Get user state from store

  // Effect to navigate on successful login
  useEffect(() => {
    if (user) {
      // If user exists (login successful), replace the current route with the home screen
      router.replace("/(app)/home");
    }
  }, [user, router]); // Re-run effect if user or router changes

  return (
    <View style={styles.container}>
      <Auth />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
