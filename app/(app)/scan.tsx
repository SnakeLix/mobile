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
  Modal,
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
  const [showPreview, setShowPreview] = useState(false);
  const [ocrPages, setOcrPages] = useState<Page[]>([]);
  const cameraRef = useRef<any>(null);

  // Add step state
  const [step, setStep] = useState<"camera" | "review" | "list" | "processing">(
    "camera"
  );
  const [currentImage, setCurrentImage] = useState<Page | null>(null);
  const [showImagesModal, setShowImagesModal] = useState(false);

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
      setCurrentImage(newPage);
      setStep("review");
      setIsProcessing(false);
    } catch (error) {
      console.error("Error taking picture:", error);
      setIsProcessing(false);
      Alert.alert("Error", "Failed to capture image. Please try again.");
    }
  }

  // Placeholder for edit image
  function handleEditImage() {
    Alert.alert("Edit", "Image editing not implemented yet.");
  }

  function handleNextImage() {
    if (currentImage) {
      setCapturedImages((prev) => [...prev, currentImage]);
      setCurrentImage(null);
      setStep("camera");
    }
  }

  function handleDoneCapture() {
    if (currentImage) {
      setCapturedImages((prev) => [...prev, currentImage]);
      setCurrentImage(null);
    }
    setStep("list");
  }

  function handleRemoveImage(index: number) {
    setCapturedImages(capturedImages.filter((_, i) => i !== index));
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

  // Mock upload function
  async function mockUploadImage(
    imageUri: string,
    index: number
  ): Promise<string> {
    // Simulate a delay for uploading
    await new Promise((resolve) => setTimeout(resolve, 200));
    // Return a mock uploaded URL
    return `https://mock-uploaded-url.com/image_${index + 1}.jpg`;
  }

  async function handleProcess() {
    setStep("processing");
    setIsProcessing(true);
    const processedPages = await Promise.all(
      capturedImages.map(async (page, idx) => {
        const text = await mockOcrInference(page.image_url, idx);
        const uploadedUrl = await mockUploadImage(page.image_url, idx);
        return {
          image_url: uploadedUrl,
          text,
        };
      })
    );
    setOcrPages(processedPages);
    setIsProcessing(false);
    // After processing, you can show results or go to save screen
    Alert.alert("Done", "Processing complete!");
    // Optionally, navigate to a result screen or reset
  }

  const saveDocument = async () => {
    if (ocrPages.length === 0) {
      Alert.alert(
        "Error",
        "No OCR results to save. Please finish scanning first."
      );
      return;
    }
    try {
      setIsProcessing(true);
      await addDocument({
        title:
          documentTitle || `Scanned Document ${new Date().toLocaleString()}`,
        data: { pages: ocrPages },
      });
      setIsProcessing(false);
      Alert.alert("Success", "Document saved successfully!", [
        {
          text: "OK",
          onPress: () => {
            setCapturedImages([]);
            setDocumentTitle("");
            setShowPreview(false);
            setOcrPages([]);
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

  function toggleCameraFacing() {
    setFacing((current) => (current === "back" ? "front" : "back"));
  }

  return (
    <View style={styles.container}>
      {/* Floating badge/button to show captured images count */}
      {step === "camera" && capturedImages.length > 0 && (
        <TouchableOpacity
          style={styles.capturedBadge}
          onPress={() => setShowImagesModal(true)}
        >
          <Ionicons name="images-outline" size={22} color="#fff" />
          <Text style={styles.capturedBadgeText}>{capturedImages.length}</Text>
        </TouchableOpacity>
      )}
      {/* Modal to show captured images */}
      <Modal
        visible={showImagesModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowImagesModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <Text style={{ fontWeight: "bold", fontSize: 16 }}>Captured Images</Text>
              <TouchableOpacity onPress={() => setShowImagesModal(false)}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {capturedImages.map((page, idx) => (
                <View key={idx} style={{ marginRight: 12 }}>
                  <Image
                    source={{ uri: page.image_url }}
                    style={{ width: 120, height: 160, borderRadius: 8, borderWidth: 1, borderColor: '#ccc' }}
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
      {step === "camera" && (
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
      {step === "review" && currentImage && (
        <View style={{ flex: 1, backgroundColor: "#fff" }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "flex-end",
              padding: 16,
            }}
          >
            <TouchableOpacity onPress={handleDoneCapture}>
              <Text
                style={{ color: "#10ac84", fontWeight: "bold", fontSize: 16 }}
              >
                Done
              </Text>
            </TouchableOpacity>
          </View>
          <View
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
          >
            <Image
              source={{ uri: currentImage.image_url }}
              style={{ width: 260, height: 360, borderRadius: 10 }}
            />
          </View>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-around",
              marginBottom: 32,
            }}
          >
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: "#f1c40f" }]}
              onPress={handleEditImage}
            >
              <Ionicons name="create-outline" size={22} color="#fff" />
              <Text style={styles.actionButtonText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: "#10ac84" }]}
              onPress={handleNextImage}
            >
              <Ionicons name="add-circle-outline" size={22} color="#fff" />
              <Text style={styles.actionButtonText}>Next</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      {step === "list" && (
        <View style={{ flex: 1, backgroundColor: "#fff", padding: 16 }}>
          <Text style={styles.previewTitle}>
            Captured Images ({capturedImages.length})
          </Text>
          <ScrollView>
            {capturedImages.map((page, idx) => (
              <View
                key={idx}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <Image
                  source={{ uri: page.image_url }}
                  style={{
                    width: 80,
                    height: 110,
                    borderRadius: 8,
                    marginRight: 12,
                  }}
                />
                <TouchableOpacity onPress={() => handleRemoveImage(idx)}>
                  <Ionicons name="close-circle" size={24} color="#e74c3c" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
          <TouchableOpacity
            style={[styles.actionButton, styles.saveButton, { marginTop: 20 }]}
            onPress={handleProcess}
            disabled={isProcessing || capturedImages.length === 0}
          >
            {isProcessing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={22} color="#fff" />
                <Text style={styles.actionButtonText}>Process</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
      {step === "processing" && (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color="#10ac84" />
          <Text style={{ marginTop: 20, color: "#333" }}>
            Processing images...
          </Text>
        </View>
      )}
      {/* <BottomNavigation
        onScanPress={() => router.push("/scan")}
        onDocumentsPress={() => router.push("/home")}
        onProfilePress={() => router.push("/profile")}
      /> */}
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
  capturedBadge: {
    position: "absolute",
    top: 40,
    left: 24,
    backgroundColor: "#10ac84",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    zIndex: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  capturedBadgeText: {
    color: "#fff",
    fontWeight: "bold",
    marginLeft: 6,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '85%',
    maxHeight: 260,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 10,
  },
});
