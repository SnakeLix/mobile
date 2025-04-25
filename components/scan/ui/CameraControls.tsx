import React from "react";
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface CameraControlsProps {
  isProcessing: boolean;
  onTakePicture: () => void;
  onToggleFacing: () => void;
  onShowImages: () => void; // Renamed from onBack for clarity
}

export default function CameraControls({
  isProcessing,
  onTakePicture,
  onToggleFacing,
  onShowImages,
}: CameraControlsProps) {
  return (
    <View style={styles.cameraOverlay}>
      {/* Back button to show images modal */}
      <TouchableOpacity
        style={[styles.iconButton, styles.topLeft]}
        onPress={onShowImages}
        disabled={isProcessing}
      >
        <Ionicons name="arrow-back" size={32} color="#fff" />
      </TouchableOpacity>

      {/* Toggle Camera Button */}
      <TouchableOpacity
        style={[styles.iconButton, styles.topRight]}
        onPress={onToggleFacing}
        disabled={isProcessing}
      >
        <Ionicons name="camera-reverse-outline" size={32} color="#fff" />
      </TouchableOpacity>

      {/* Capture Button */}
      <TouchableOpacity
        style={styles.captureButton}
        onPress={onTakePicture}
        disabled={isProcessing}
      >
        {isProcessing ? (
          <ActivityIndicator color="#fff" size="large" />
        ) : (
          <Ionicons name="camera-outline" size={40} color="#fff" />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  cameraOverlay: {
    flex: 1,
    backgroundColor: "transparent", // Ensure overlay doesn't block view
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 30,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(0, 0, 0, 0.4)", // Slightly transparent background
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "#fff",
  },
  iconButton: {
    position: "absolute",
    padding: 10, // Add padding for easier touch
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 30,
  },
  topLeft: {
    top: 40, // Adjust positioning as needed (consider safe area)
    left: 20,
  },
  topRight: {
    top: 40, // Adjust positioning as needed
    right: 20,
  },
});
