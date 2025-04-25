import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { documentStore } from "@/store/documentStore"; // Import the store

const FloatingProcessBubble = () => {
  // Get state and actions from the document store
  const isProcessing = documentStore((state) => state.isProcessing);
  const progressData = documentStore((state) => state.processingProgress);
  const isMinimized = documentStore((state) => state.isProcessingMinimized);
  const toggleMinimized = documentStore(
    (state) => state.toggleProcessingMinimized
  );

  // Don't render if not processing
  if (!isProcessing || !progressData) return null;

  const { processed, total } = progressData;
  const progress = total > 0 ? processed / total : 0;

  // Handle press: toggle the minimized state
  const handlePress = () => {
    toggleMinimized();
  };

  return (
    <TouchableOpacity
      style={[styles.floatingBubble, isMinimized && styles.minimizedBubble]}
      onPress={handlePress}
      activeOpacity={0.9}
    >
      {isMinimized ? (
        // Minimized view: Just show the icon
        <Ionicons name="document-attach-outline" size={24} color="#fff" />
      ) : (
        // Maximized view: Show details
        <View style={styles.bubbleContent}>
          <ActivityIndicator size="small" color="#fff" style={styles.spinner} />
          <View style={styles.progressTextContainer}>
            <Text style={styles.progressText}>
              Processing: {processed}/{total}
            </Text>
            <View style={styles.miniBubbleProgressContainer}>
              <View
                style={[
                  styles.miniBubbleProgress,
                  { width: `${progress * 100}%` },
                ]}
              />
            </View>
          </View>
          {/* Optional: Add a minimize icon/button inside the bubble */}
          {/* <TouchableOpacity onPress={handlePress} style={styles.minimizeIcon}> */}
          {/*  <Ionicons name="chevron-down" size={18} color="#fff" /> */}
          {/* </TouchableOpacity> */}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  floatingBubble: {
    position: "absolute",
    bottom: 90, // Adjust position to be above bottom nav
    right: 20,
    minWidth: 60, // Minimum width for minimized state
    height: 50,
    borderRadius: 25,
    backgroundColor: "#10ac84", // Theme color
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 15,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
    overflow: "hidden", // Ensure content fits
    transitionProperty: "width", // Animate width change (web/future RN)
    transitionDuration: "0.3s",
  },
  minimizedBubble: {
    width: 60, // Fixed width when minimized
    paddingHorizontal: 0, // No padding needed for just icon
  },
  bubbleContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  spinner: {
    marginRight: 8,
  },
  progressTextContainer: {
    flexDirection: "column",
    alignItems: "flex-start", // Align text to the left
    marginRight: 10, // Add some space before potential minimize icon
  },
  progressText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
    marginBottom: 2, // Space between text and progress bar
  },
  miniBubbleProgressContainer: {
    width: 80, // Make progress bar wider
    height: 4,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 2,
    // marginTop: 4, // Removed as marginBottom added to text
    overflow: "hidden",
  },
  miniBubbleProgress: {
    height: "100%",
    backgroundColor: "#fff",
    borderRadius: 2,
  },
  // Optional style for an explicit minimize icon within the bubble
  // minimizeIcon: {
  //   paddingLeft: 5,
  // },
});

export default FloatingProcessBubble;
