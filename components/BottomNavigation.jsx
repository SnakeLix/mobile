import React from "react";
import { View, TouchableOpacity, Text, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const BottomNavigation = ({ onScanPress, onDocumentsPress, onProfilePress }) => {
    return (
        <View style={styles.container}>
            {/* Documents Button */}
            <TouchableOpacity style={styles.tab} onPress={onDocumentsPress}>
                <Ionicons name="document-text-outline" size={28} color="#222f3e" />
                <Text style={styles.label}>Documents</Text>
            </TouchableOpacity>
            {/* Center Scanner Button */}
            <View style={styles.centerButtonWrapper} pointerEvents="box-none">
                <TouchableOpacity style={styles.centerButton} onPress={onScanPress}>
                    <Ionicons name="scan" size={32} color="#fff" />
                </TouchableOpacity>
            </View>
            {/* Profile Button */}
            <TouchableOpacity style={styles.tab} onPress={onProfilePress}>
                <Ionicons name="person" size={28} color="#222f3e" />
                <Text style={styles.label}>Profile</Text>
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
        position: "relative",
    },
    tab: {
        alignItems: "center",
        flex: 1,
        justifyContent: "center",
    },
    label: {
        fontSize: 12,
        marginTop: 2,
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