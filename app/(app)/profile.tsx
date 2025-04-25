import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { authStore } from "@/store/authStore";
import { documentStore } from "@/store/documentStore";
import { UserUpdate } from "@/types/user";
import BottomNavigation from "@/components/BottomNavigation";

export default function ProfileScreen() {
  const router = useRouter();
  // Use selective Zustand subscriptions to avoid infinite re-renders
  const user = authStore((state) => state.user);
  const updateUser = authStore((state) => state.updateUser);
  const setUser = authStore((state) => state.setUser);
  const logout = authStore((state) => state.logout);
  const loading = authStore((state) => state.loading);
  const clearDocuments = documentStore((state) => state.clearDocuments);

  // Form state
  const [email, setEmail] = useState(user?.email || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);

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

  // Toggle edit mode
  const toggleEditMode = () => {
    if (isEditing) {
      // Discard changes
      setEmail(user?.email || "");
      setPassword("");
      setConfirmPassword("");
    }
    setIsEditing(!isEditing);
  };

  // Handle profile update
  const handleUpdateProfile = async () => {
    // Basic validation
    if (!email) {
      Alert.alert("Error", "Email cannot be empty");
      return;
    }

    if (password && password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    if (password && password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    // Prepare update data
    const updateData: UserUpdate = { email };
    if (password) {
      updateData.password = password;
    }

    try {
      setLocalLoading(true);
      await updateUser(updateData);
      setLocalLoading(false);
      setIsEditing(false);
      setPassword("");
      setConfirmPassword("");
      Alert.alert("Success", "Profile updated successfully");
    } catch (error) {
      setLocalLoading(false);
      console.error("Update profile error:", error);
      Alert.alert("Error", "Failed to update profile");
    }
  };

  // Handle logout
  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Logout",
        style: "destructive",
        onPress: () => {
          // First clear documents to avoid stale data
          // clearDocuments(); // Consider if this is needed or handled elsewhere
          // Then clear auth state
          logout();
          // Finally navigate to the auth screen with replace
          router.replace("/auth");
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Image
              source={require("@/assets/images/icon.png")}
              style={styles.avatar}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.username}>{user?.email}</Text>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {new Date(user?.created_at || Date.now()).toLocaleDateString()}
              </Text>
              <Text style={styles.statLabel}>Joined</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Account Information</Text>
            <TouchableOpacity
              style={styles.editButton}
              onPress={toggleEditMode}
              disabled={localLoading || loading}
            >
              <Text style={styles.editButtonText}>
                {isEditing ? "Cancel" : "Edit"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.disabledInput]}
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              editable={isEditing}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          {isEditing && (
            <>
              <View style={styles.formGroup}>
                <Text style={styles.label}>New Password</Text>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Leave blank to keep current password"
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Confirm New Password</Text>
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm new password"
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleUpdateProfile}
                disabled={localLoading || loading}
              >
                {localLoading || loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          disabled={localLoading || loading}
        >
          <Ionicons name="log-out-outline" size={20} color="#e74c3c" />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>

        {/* Version info */}
        <Text style={styles.versionText}>App Version 1.0.0</Text>
      </ScrollView>

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
    backgroundColor: "#fff",
  },
  scrollContent: {
    paddingBottom: 100, // Space for bottom navigation
  },
  profileHeader: {
    alignItems: "center",
    paddingVertical: 30,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
    overflow: "hidden",
  },
  avatar: {
    width: 70,
    height: 70,
  },
  username: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 5,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 15,
  },
  statItem: {
    alignItems: "center",
    marginHorizontal: 15,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#10ac84",
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  editButton: {
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  editButtonText: {
    color: "#10ac84",
    fontWeight: "600",
  },
  formGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    color: "#666",
    marginBottom: 5,
  },
  input: {
    backgroundColor: "#f8f9fa",
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#eee",
    fontSize: 16,
    color: "#333",
  },
  disabledInput: {
    backgroundColor: "#f0f0f0",
    color: "#666",
  },
  saveButton: {
    backgroundColor: "#10ac84",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    margin: 20,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e74c3c",
  },
  logoutButtonText: {
    color: "#e74c3c",
    fontWeight: "600",
    fontSize: 16,
    marginLeft: 8,
  },
  versionText: {
    textAlign: "center",
    color: "#999",
    fontSize: 12,
    marginBottom: 20,
  },
});
