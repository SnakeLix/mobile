import { View, StyleSheet } from "react-native";
import { useRouter, Redirect } from "expo-router";
import Auth from "@/components/Auth";
import { authStore } from "@/store/authStore";

export default function Index() {
  const { user } = authStore();
  const router = useRouter();

  // Redirect to app if user is logged in
  if (user) {
    return <Redirect href="/(app)" />;
  }

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
