import React, { useState, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  ScrollView,
  Image,
} from "react-native";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { documentStore } from "@/store/documentStore";
import { Document, Page } from "@/types/document";
import BottomNavigation from "@/components/BottomNavigation";

export default function ScanScreen() {
  const router = useRouter();
  const { addDocument } = documentStore();
  const [facing, setFacing] = useState<CameraType>("back");
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedImages, setCapturedImages] = useState<Page[]>([]);
  const [documentTitle, setDocumentTitle] = useState("");
  const cameraRef = useRef<any>(null);

  async function takePicture() {
    if (!cameraRef.current) return;
    try {
      setIsProcessing(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
        skipProcessing: false,
      });
      const newPage: Page = {
        image_url: photo.uri,
        text: "Scanned text would appear here...",
      };
      setCapturedImages([...capturedImages, newPage]);
      setIsProcessing(false);
    } catch (error) {
      console.error("Error taking picture:", error);
      setIsProcessing(false);
      Alert.alert("Error", "Failed to capture image. Please try again.");
    }
  }

  function toggleCameraFacing() {
    setFacing((current) => (current === "back" ? "front" : "back"));
  }

  // Mock OCR function
  async function mockOcrInference(
    imageUri: string,
    index: number
  ): Promise<string> {
    // Simulate a delay for OCR processing
    await new Promise((resolve) => setTimeout(resolve, 300));
    return `Mock OCR text for page ${index + 1} (image: ${imageUri})`;
  }

  const saveDocument = async () => {
    if (capturedImages.length === 0) {
      Alert.alert("Error", "Please scan at least one page.");
      return;
    }
    try {
      setIsProcessing(true);
      // Run mock OCR for each page
      const processedPages = await Promise.all(
        capturedImages.map(async (page, idx) => ({
          image_url: page.image_url,
          text: await mockOcrInference(page.image_url, idx),
        }))
      );
      await addDocument({
        title:
          documentTitle || `Scanned Document ${new Date().toLocaleString()}`,
        data: { pages: processedPages },
      });
      setIsProcessing(false);
      Alert.alert("Success", "Document saved successfully!", [
        {
          text: "OK",
          onPress: () => {
            setCapturedImages([]);
            setDocumentTitle("");
            router.replace("/home");
          },
        },
      ]);
    } catch (error) {
      console.error("Error saving document:", error);
      setIsProcessing(false);
      Alert.alert("Error", "Failed to save document. Please try again.");
    }
  };

  const removePage = (index: number) => {
    setCapturedImages(capturedImages.filter((_, i) => i !== index));
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
        <Text>Requesting Camera Permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>
          Camera access is required to scan documents.
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={requestPermission}
        >
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {capturedImages.length > 0 ? (
        <ScrollView style={styles.previewContainer}>
          <TextInput
            style={styles.titleInput}
            placeholder="Document Title"
            value={documentTitle}
            onChangeText={setDocumentTitle}
            placeholderTextColor="#999"
          />
          <Text style={styles.previewTitle}>
            Scanned Pages ({capturedImages.length})
          </Text>
          {capturedImages.map((page, index) => (
            <View key={index} style={styles.imagePreviewContainer}>
              <Image
                source={{ uri: page.image_url }}
                style={styles.imagePreview}
              />
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removePage(index)}
              >
                <Ionicons name="close-circle" size={24} color="#e74c3c" />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity
            style={[styles.actionButton, styles.saveButton]}
            onPress={saveDocument}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="save-outline" size={22} color="#fff" />
                <Text style={styles.actionButtonText}>Save Document</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <CameraView ref={cameraRef} style={styles.camera} facing={facing}>
          <View style={styles.cameraOverlay}>
            <TouchableOpacity
              style={styles.captureButton}
              onPress={takePicture}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color="#fff" size="large" />
              ) : (
                <Ionicons name="camera-outline" size={40} color="#fff" />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={{ position: "absolute", top: 30, right: 30 }}
              onPress={toggleCameraFacing}
            >
              <Ionicons name="camera-reverse-outline" size={32} color="#fff" />
            </TouchableOpacity>
          </View>
        </CameraView>
      )}
      <BottomNavigation
        onScanPress={() => router.push("/scan")}
        onDocumentsPress={() => router.push("/home")}
        onProfilePress={() => router.push("/profile")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  permissionText: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
    marginTop: 20,
    paddingHorizontal: 40,
  },
  permissionButton: {
    marginTop: 20,
    backgroundColor: "#10ac84",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  camera: { flex: 1 },
  cameraOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 30,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#10ac84",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  previewContainer: { flex: 1, padding: 16 },
  titleInput: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 10,
    borderBottomWidth: 1,
    borderColor: "#ccc",
    paddingVertical: 8,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginVertical: 10,
  },
  imagePreviewContainer: {
    position: "relative",
    marginBottom: 16,
  },
  imagePreview: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    resizeMode: "cover",
  },
  removeButton: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  actionButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 14,
    borderRadius: 8,
    marginTop: 20,
  },
  saveButton: {
    backgroundColor: "#10ac84",
  },
  actionButtonText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 8,
  },
});
