// IMPORTANT: Import react-native-gesture-handler at the very top
import "react-native-gesture-handler";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useEffect } from "react";
import { Platform, PermissionsAndroid, Alert } from "react-native";
import { Stack } from "expo-router";
import { authStore } from "@/store/authStore";

// Request storage permissions for Android
const requestStoragePermission = async () => {
  console.log("Requesting storage permission... " + Platform.OS);
  if (Platform.OS === "android") {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        {
          title: "Storage Access Permission",
          message:
            "This app needs access to your storage to load AI models for text detection",
          buttonNeutral: "Ask Me Later",
          buttonNegative: "Cancel",
          buttonPositive: "OK",
        }
      );
      console.log("Storage permission result: ", granted);

      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        console.warn("Storage permission denied");
        // Alert.alert(
        //   "Permission Required",
        //   "Storage access is needed for OCR functionality. Some features may not work properly.",
        //   [{ text: "OK" }]
        // );
      } else {
        console.log("Storage permission granted");
      }

      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn("Error requesting storage permission:", err);
      return false;
    }
  }
  return true; // iOS doesn't need explicit permission
};

export default function RootLayout() {
  const { refreshSession } = authStore();

  useEffect(() => {
    // Request permissions at startup
    requestStoragePermission();

    // Refresh authentication session
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
