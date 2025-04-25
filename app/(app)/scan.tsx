import React, { useState, useRef, useEffect, useCallback } from "react";
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
  AppState,
} from "react-native";
import { CameraView, CameraType } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { documentStore } from "@/store/documentStore";
import { Document, Page } from "@/types/document";
import FloatingProcessBubble from "@/components/FloatingProcessBubble";
import { createDocument, uploadDocumentImage } from "@/service/documentService";
import { useCamera } from "@/components/scan/hooks/useCamera";
import CameraControls from "@/components/scan/ui/CameraControls";

export default function ScanScreen() {
  const router = useRouter();
  const { addDocument } = documentStore();
  const {
    permission,
    requestPermission,
    cameraRef,
    facing,
    isCapturing,
    toggleCameraFacing,
    takePicture: captureImage,
  } = useCamera();
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedImages, setCapturedImages] = useState<Page[]>([]);
  const [documentTitle, setDocumentTitle] = useState("");
  const [ocrPages, setOcrPages] = useState<Page[]>([]);
  const [step, setStep] = useState<
    "camera" | "review" | "list" | "processing" | "title" | "success"
  >("camera");
  const [currentImage, setCurrentImage] = useState<Page | null>(null);
  const [showImagesModal, setShowImagesModal] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [processingInBackground, setProcessingInBackground] = useState(false);
  const [backgroundProcessingComplete, setBackgroundProcessingComplete] =
    useState(false);
  const [isProcessingMinimized, setIsProcessingMinimized] = useState(false);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (processingInBackground && nextAppState === "active") {
        if (backgroundProcessingComplete) {
          router.push("/scan?step=title");
        }
      }
    });
    return () => {
      subscription.remove();
    };
  }, [processingInBackground, backgroundProcessingComplete, router]);
  function handleMinimizeProcessing() {
    setIsProcessingMinimized(true);
  }
  function handleMaximizeProcessing() {
    setIsProcessingMinimized(false);
  }
  const handleTakePicture = useCallback(async () => {
    const newPage = await captureImage();
    if (newPage) {
      setCurrentImage(newPage);
      setStep("review");
    }
  }, [captureImage]);
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
    router.replace("/");
    setCapturedImages(capturedImages.filter((_, i) => i !== index));
  }
  async function mockOcrInference(
    imageUri: string,
    index: number
  ): Promise<string> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return `Mock OCR text for page ${index + 1} (image: ${imageUri})`;
  }
  async function handleProcess() {
    if (capturedImages.length === 0) {
      Alert.alert(
        "Error",
        "No images to process. Please capture at least one image."
      );
      return;
    }
    setStep("processing");
    setIsProcessing(true);
    setProcessedCount(0);
    try {
      const processedPagesPromises = capturedImages.map(async (page, idx) => {
        const text = await mockOcrInference(page.image_url, idx);
        const uploadedUrl = await uploadDocumentImage(page.image_url);
        setProcessedCount((prev) => prev + 1);
        return {
          image_url: uploadedUrl,
          text,
        };
      });
      const processedPages = await Promise.all(processedPagesPromises);
      setOcrPages(processedPages);
      setIsProcessing(false);
      setStep("title");
    } catch (error) {
      console.error("Error processing document:", error);
      setIsProcessing(false);
      Alert.alert(
        "Processing Error",
        "Failed to process and save document. Please try again."
      );
      setStep("list");
    }
  }
  if (!permission) {
    return (
      <View style={styles.permissionContainer}>
        <ActivityIndicator size="large" />
        <Text>Requesting Camera Permission...</Text>
      </View>
    );
  }
  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
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
  function handleSkipImage() {
    Alert.alert(
      "Skip Image",
      "Do you want to skip this image? If yes, the image will be deleted from the list.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, Skip",
          style: "destructive",
          onPress: () => {
            setCurrentImage(null);
            setStep(capturedImages.length > 0 ? "camera" : "camera");
          },
        },
      ]
    );
  }
  function handleRetakeImage() {
    Alert.alert(
      "Retake Image",
      "Do you want to retake this image? If yes, the image will be deleted and you can capture again.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, Retake",
          style: "destructive",
          onPress: () => {
            setCurrentImage(null);
            setStep("camera");
          },
        },
      ]
    );
  }
  async function handleSaveDocument() {
    if (ocrPages.length === 0) {
      Alert.alert("Error", "No processed pages to save. Please try again.");
      return;
    }
    const title =
      documentTitle.trim() || `Scanned Document ${new Date().toLocaleString()}`;
    setIsProcessing(true);
    try {
      await addDocument({
        title: title,
        data: { pages: ocrPages },
      });
      setIsProcessing(false);
      setStep("success");
      setCapturedImages([]);
      setOcrPages([]);
      setDocumentTitle("");
      setCurrentImage(null);
    } catch (error) {
      console.error("Error saving document:", error);
      setIsProcessing(false);
      Alert.alert("Save Error", "Failed to save document. Please try again.");
    }
  }
  const exitFlow = () => {
    setShowImagesModal(false);
    setCurrentImage(null);
    setCapturedImages([]);
    setOcrPages([]);
    setDocumentTitle("");
    setStep("camera");
    router.replace("/home");
  };
  async function handleBackgroundProcess() {
    setProcessingInBackground(true);
    setIsProcessing(true);
    setProcessedCount(0);
    router.replace("/home");
    try {
      const processedPages = [];
      for (let i = 0; i < capturedImages.length; i++) {
        const page = capturedImages[i];
        const text = await mockOcrInference(page.image_url, i);
        const uploadedUrl = await uploadDocumentImage(page.image_url);
        processedPages.push({ image_url: uploadedUrl, text });
        setProcessedCount((prev) => prev + 1);
      }
      setOcrPages(processedPages);
      setBackgroundProcessingComplete(true);
      console.log("Background processing complete.");
    } catch (error) {
      console.error("Background processing error:", error);
      setBackgroundProcessingComplete(true);
    } finally {
      setIsProcessing(false);
      setProcessingInBackground(false);
    }
  }
  return (
    <View style={styles.container}>
      {step === "camera" && (
        <CameraView ref={cameraRef} style={styles.camera} facing={facing}>
          <CameraControls
            isProcessing={isCapturing}
            onTakePicture={handleTakePicture}
            onToggleFacing={toggleCameraFacing}
            onShowImages={() => setShowImagesModal(true)}
          />
        </CameraView>
      )}
      {step === "review" && currentImage && (
        <View style={{ flex: 1, backgroundColor: "#fff" }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingHorizontal: 16,
              paddingTop: 40,
              marginBottom: 10,
            }}
          >
            <TouchableOpacity
              style={{
                padding: 5,
                backgroundColor: "#fff0f0",
                borderRadius: 20,
              }}
              onPress={() => {
                Alert.alert(
                  "Discard Image",
                  "Are you sure you want to discard this image?",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Discard",
                      onPress: () => {
                        exitFlow();
                      },
                    },
                  ]
                );
              }}
            >
              <Ionicons name="close" size={28} color="#e74c3c" />
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                alignItems: "center",
                backgroundColor: "#10ac84",
                borderRadius: 20,
                paddingVertical: 6,
                paddingHorizontal: 14,
              }}
              onPress={() => setShowImagesModal(true)}
            >
              <Text
                style={{
                  color: "#fff",
                  fontWeight: "bold",
                  marginLeft: 6,
                  fontSize: 15,
                }}
              >{`Show (${
                capturedImages.length + (currentImage ? 1 : 0)
              }) images`}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                backgroundColor: "#10ac84",
                borderRadius: 20,
                paddingVertical: 6,
                paddingHorizontal: 18,
              }}
              onPress={handleDoneCapture}
            >
              <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 15 }}>
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
              style={[
                styles.actionButton,
                {
                  borderWidth: 1,
                  borderColor: "#10ac84",
                },
              ]}
              onPress={handleEditImage}
            >
              <Ionicons
                name="pencil"
                size={26}
                color="#10ac84"
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.actionButtonText, { color: "#10ac84" }]}>
                Edit
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: "#10ac84" }]}
              onPress={handleNextImage}
            >
              <Ionicons
                name="checkmark-circle"
                size={26}
                color="#fff"
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.actionButtonText, { color: "#fff" }]}>
                Next
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.actionButton,
                {
                  borderWidth: 1,
                  borderColor: "#e74c3c",
                },
              ]}
              onPress={handleRetakeImage}
            >
              <Ionicons
                name="camera-reverse"
                size={26}
                color="#e74c3c"
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.actionButtonText, { color: "#e74c3c" }]}>
                Retake
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      <Modal
        visible={showImagesModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowImagesModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: "#fff" }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowImagesModal(false)}>
              <Ionicons name="arrow-back" size={28} color="#10ac84" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              Captured Images (
              {currentImage ? capturedImages.length + 1 : capturedImages.length}
              )
            </Text>
            <View style={{ width: 28 }} />
          </View>
          <ScrollView
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={true}
          >
            {step === "review" && currentImage && (
              <View style={styles.modalImageContainer}>
                <Image
                  source={{ uri: currentImage.image_url }}
                  style={styles.modalImage}
                />
                <Text style={styles.modalImageLabel}>
                  Current Image (Not Saved)
                </Text>
              </View>
            )}
            {capturedImages.map((page, idx) => (
              <View key={idx} style={styles.modalImageContainer}>
                <Image
                  source={{ uri: page.image_url }}
                  style={styles.modalImage}
                />
                <TouchableOpacity
                  style={styles.modalRemoveButton}
                  onPress={() => handleRemoveImage(idx)}
                >
                  <Ionicons name="close-circle" size={28} color="#e74c3c" />
                </TouchableOpacity>
                <Text style={styles.modalImageLabel}>Page {idx + 1}</Text>
              </View>
            ))}
          </ScrollView>
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: "#e74c3c" }]}
              onPress={() => {
                exitFlow();
              }}
            >
              <Text style={styles.modalButtonText}>Exit & Discard</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: "#10ac84" }]}
              onPress={() => {
                setShowImagesModal(false);
                if (step === "camera" && capturedImages.length > 0) {
                  setStep("list");
                } else if (step === "list") {
                } else if (step === "review") {
                } else {
                  if (capturedImages.length > 0) setStep("list");
                  else setStep("camera");
                }
              }}
            >
              <Text style={styles.modalButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {step === "list" && (
        <View style={{ flex: 1, backgroundColor: "#fff", padding: 16 }}>
          <View style={styles.listHeader}>
            <TouchableOpacity
              style={{ padding: 5 }}
              onPress={() => setStep("camera")}
            >
              <Ionicons name="arrow-back" size={28} color="#10ac84" />
            </TouchableOpacity>
            <Text style={styles.listTitle}>
              Captured Images ({capturedImages.length})
            </Text>
          </View>
          <TextInput
            style={styles.titleInput}
            placeholder="Enter document title (optional)"
            value={documentTitle}
            onChangeText={setDocumentTitle}
          />
          <ScrollView>
            {capturedImages.length === 0 ? (
              <Text style={styles.emptyListText}>
                No images captured yet. Go back to capture.
              </Text>
            ) : (
              capturedImages.map((page, idx) => (
                <View key={idx} style={styles.listItemContainer}>
                  <Image
                    source={{ uri: page.image_url }}
                    style={styles.listItemImage}
                  />
                  <Text style={styles.listItemLabel}>Page {idx + 1}</Text>
                  <TouchableOpacity
                    onPress={() => {
                      exitFlow();
                    }}
                    style={styles.listItemRemove}
                  >
                    <Ionicons name="close-circle" size={24} color="#e74c3c" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.saveButton,
              { marginTop: 20 },
              (isProcessing || capturedImages.length === 0) &&
                styles.disabledButton,
            ]}
            onPress={handleProcess}
            disabled={isProcessing || capturedImages.length === 0}
          >
            {isProcessing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons
                  name="cloud-upload-outline"
                  size={22}
                  color="#fff"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.actionButtonText}>Process Document</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
      {step === "processing" && !isProcessingMinimized && (
        <View style={styles.processingContainer}>
          <ActivityIndicator size="large" color="#10ac84" />
          <Text style={styles.processingText}>Processing images...</Text>
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${
                    capturedImages.length > 0
                      ? (processedCount / capturedImages.length) * 100
                      : 0
                  }%`,
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {processedCount} of {capturedImages.length} pages processed
          </Text>
        </View>
      )}
      {step === "success" && (
        <View style={styles.successContainer}>
          <Ionicons
            name="checkmark-circle"
            size={80}
            color="#10ac84"
            style={{ marginBottom: 20 }}
          />
          <Text style={styles.successTitle}>Document Created!</Text>
          <Text style={styles.successSubtitle}>
            Your document "{documentTitle || "Untitled"}" has been saved.
          </Text>
          <TouchableOpacity
            style={styles.successButton}
            onPress={() => {
              setStep("camera");
              router.replace("/home");
            }}
          >
            <Text style={styles.successButtonText}>Go to Home</Text>
          </TouchableOpacity>
        </View>
      )}
      {step === "title" && (
        <View style={styles.titleScreenContainer}>
          <View style={styles.titleCard}>
            <Ionicons
              name="document-text-outline"
              size={60}
              color="#10ac84"
              style={styles.titleIcon}
            />
            <Text style={styles.titleScreenHeading}>Document Processed</Text>
            <Text style={styles.titleScreenSubheading}>
              Enter a title to save your document
            </Text>
            <TextInput
              style={styles.titleScreenInput}
              placeholder="Enter document title (optional)"
              value={documentTitle}
              onChangeText={setDocumentTitle}
              autoFocus={true}
            />
            <View style={styles.previewImagesContainer}>
              <Text style={styles.previewLabel}>
                {ocrPages.length} {ocrPages.length === 1 ? "page" : "pages"}{" "}
                processed
              </Text>
              <ScrollView
                horizontal={true}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.previewScrollContainer}
              >
                {ocrPages.map((page, idx) => (
                  <Image
                    key={idx}
                    source={{ uri: page.image_url }}
                    style={styles.previewThumbnail}
                  />
                ))}
              </ScrollView>
            </View>
            <TouchableOpacity
              style={[
                styles.saveDocumentButton,
                isProcessing && styles.disabledButton,
              ]}
              onPress={handleSaveDocument}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveDocumentButtonText}>Save Document</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
      {step === "processing" && isProcessingMinimized && (
        <FloatingProcessBubble />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  permissionText: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  permissionButton: {
    backgroundColor: "#10ac84",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  camera: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderColor: "#eee",
    paddingTop: 40,
  },
  modalTitle: {
    fontWeight: "bold",
    fontSize: 18,
    color: "#222",
  },
  modalScrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  modalImageContainer: {
    marginBottom: 24,
    alignItems: "center",
    position: "relative",
  },
  modalImage: {
    width: 220,
    height: 300,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  modalRemoveButton: {
    position: "absolute",
    top: 5,
    right: 5,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderRadius: 15,
    padding: 2,
  },
  modalImageLabel: {
    marginTop: 8,
    color: "#333",
    fontWeight: "500",
  },
  modalFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#eee",
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    flex: 1,
  },
  modalButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    paddingTop: 10,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginLeft: 15,
  },
  titleInput: {
    fontSize: 16,
    color: "#333",
    marginBottom: 15,
    borderBottomWidth: 1,
    borderColor: "#ccc",
    paddingVertical: 8,
    paddingHorizontal: 5,
  },
  emptyListText: {
    textAlign: "center",
    marginTop: 50,
    fontSize: 16,
    color: "#888",
  },
  listItemContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    backgroundColor: "#f9f9f9",
    padding: 8,
    borderRadius: 8,
  },
  listItemImage: {
    width: 60,
    height: 85,
    borderRadius: 6,
    marginRight: 12,
  },
  listItemLabel: {
    flex: 1,
    fontSize: 15,
    color: "#444",
  },
  listItemRemove: {
    padding: 5,
  },
  processingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
  },
  processingText: {
    marginTop: 20,
    color: "#333",
    fontSize: 16,
    marginBottom: 15,
  },
  progressBarContainer: {
    width: "80%",
    height: 10,
    backgroundColor: "#eee",
    borderRadius: 5,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#10ac84",
    borderRadius: 5,
  },
  progressText: {
    marginTop: 10,
    color: "#666",
    marginBottom: 20,
  },
  successContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#10ac84",
    marginBottom: 10,
    textAlign: "center",
  },
  successSubtitle: {
    fontSize: 16,
    color: "#333",
    marginBottom: 30,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  successButton: {
    backgroundColor: "#10ac84",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  successButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  titleScreenContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
  },
  titleCard: {
    width: "90%",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  titleIcon: {
    alignSelf: "center",
    marginBottom: 15,
  },
  titleScreenHeading: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginBottom: 5,
  },
  titleScreenSubheading: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  titleScreenInput: {
    height: 50,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    fontSize: 16,
    marginBottom: 20,
  },
  previewImagesContainer: {
    marginBottom: 20,
  },
  previewLabel: {
    fontSize: 14,
    color: "#333",
    marginBottom: 5,
  },
  previewScrollContainer: {
    paddingVertical: 10,
  },
  previewThumbnail: {
    width: 100,
    height: 140,
    borderRadius: 5,
    marginRight: 10,
  },
  saveDocumentButton: {
    backgroundColor: "#10ac84",
    paddingVertical: 12,
    borderRadius: 5,
    alignItems: "center",
  },
  saveDocumentButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  actionButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 25,
    minWidth: 100,
  },
  actionButtonText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 8,
    fontSize: 15,
  },
  saveButton: {
    backgroundColor: "#10ac84",
  },
  disabledButton: {
    backgroundColor: "#a0a0a0",
    opacity: 0.7,
  },
  backgroundProcessButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    backgroundColor: "#10ac84",
  },
  backgroundProcessText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
  },
});
