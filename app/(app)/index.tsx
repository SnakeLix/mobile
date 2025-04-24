import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Text } from "react-native";
import { useRouter, Redirect } from "expo-router";
import BottomNavigation from "@/components/BottomNavigation";
import { documentStore } from "@/store/documentStore";

export default function AppIndex() {
  const router = useRouter();
  const { fetchDocuments } = documentStore();
  const initialFetchDone = useRef(false);

  useEffect(() => {
    // Load documents when the app is opened
    if (!initialFetchDone.current) {
      fetchDocuments();
      initialFetchDone.current = true;
    }
  }, [fetchDocuments]);

  // Navigate to the main documents screen
  useEffect(() => {
    router.replace("/home");
  }, [router]);

  const handleScanPress = () => {
    router.push("/scan");
  };

  const handleDocumentsPress = () => {
    router.push("/home");
  };

  const handleProfilePress = () => {
    router.push("/profile");
  };

  return (
    <View style={styles.container}>
      <Text>Loading...</Text>
      {/* Bottom navigation bar */}
      <BottomNavigation
        onScanPress={handleScanPress}
        onDocumentsPress={handleDocumentsPress}
        onProfilePress={handleProfilePress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end",
  },
});
