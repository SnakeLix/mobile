import React from "react";
import { View, TouchableOpacity, Text, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const BottomNavigation = ({ onScanPress, onDocumentsPress, onProfilePress, activeTab = "home" }) => {
    // Determine if a tab is active
    const isHomeActive = activeTab === "home" || activeTab === "index";
    const isProfileActive = activeTab === "profile";

    // Colors for active/inactive states
    const activeColor = "#10ac84";
    const inactiveColor = "#222f3e";

    return (
        <View style={styles.container}>
            {/* Documents Button */}
            <TouchableOpacity
                style={[styles.tab, isHomeActive && styles.activeTab]}
                onPress={onDocumentsPress}
            >
                <Ionicons
                    name={isHomeActive ? "document-text" : "document-text-outline"}
                    size={28}
                    color={isHomeActive ? activeColor : inactiveColor}
                />
                <Text style={[styles.label, isHomeActive && styles.activeLabel]}>
                    Documents
                </Text>
            </TouchableOpacity>

            {/* Center Scanner Button */}
            <View style={styles.centerButtonWrapper} pointerEvents="box-none">
                <TouchableOpacity style={styles.centerButton} onPress={onScanPress}>
                    <Ionicons name="scan" size={32} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Profile Button */}
            <TouchableOpacity
                style={[styles.tab, isProfileActive && styles.activeTab]}
                onPress={onProfilePress}
            >
                <Ionicons
                    name={isProfileActive ? "person" : "person-outline"}
                    size={28}
                    color={isProfileActive ? activeColor : inactiveColor}
                />
                <Text style={[styles.label, isProfileActive && styles.activeLabel]}>
                    Profile
                </Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        height: 70,
        backgroundColor: "#fff",
        borderTopWidth: 1,
        borderColor: "#eee",
        alignItems: "center",
        justifyContent: "space-around",
        position: "absolute", // changed from "relative"
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 100,
    },
    tab: {
        alignItems: "center",
        flex: 1,
        justifyContent: "center",
        paddingVertical: 8,
    },
    activeTab: {
        // Optional: add a subtle background color or other styling for active tabs
    },
    label: {
        fontSize: 12,
        marginTop: 2,
        color: "#222f3e",
    },
    activeLabel: {
        color: "#10ac84",
        fontWeight: "600",
    },
    centerButtonWrapper: {
        position: "absolute",
        left: 0,
        right: 0,
        top: -30,
        alignItems: "center",
        zIndex: 10,
        elevation: 10,
        pointerEvents: "box-none",
    },
    centerButton: {
        backgroundColor: "#10ac84",
        borderRadius: 40,
        padding: 20,
        elevation: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        ...Platform.select({
            android: {
                marginTop: 0,
            },
            ios: {
                marginTop: 0,
            },
        }),
    },
});

export default BottomNavigation;