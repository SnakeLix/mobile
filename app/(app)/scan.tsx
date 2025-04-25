import React, { useState, useRef, useEffect } from "react";
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
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { documentStore } from "@/store/documentStore";
import { Document, Page } from "@/types/document";
import BottomNavigation from "@/components/BottomNavigation";
import FloatingProcessBubble from "@/components/FloatingProcessBubble";
import { createDocument, uploadDocumentImage } from "@/service/documentService";
import * as FileSystem from "expo-file-system";
import { imageUriToFormData, uriToFile } from "@/utils/fileUtils";

export default function ScanScreen() {
  const router = useRouter();
  const { addDocument } = documentStore();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);

  // All state declarations - keep them together at the top
  const [facing, setFacing] = useState<CameraType>("back");
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedImages, setCapturedImages] = useState<Page[]>([]);
  const [documentTitle, setDocumentTitle] = useState("");
  const [showPreview, setShowPreview] = useState(false);
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

  // All useEffect hooks - group them together
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

  // Function declarations
  function toggleCameraFacing() {
    setFacing((current) => (current === "back" ? "front" : "back"));
  }

  function handleMinimizeProcessing() {
    setIsProcessingMinimized(true);
  }

  function handleMaximizeProcessing() {
    setIsProcessingMinimized(false);
  }

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

    try {
      // Process all captured images with OCR and upload
      const processedPages = await Promise.all(
        capturedImages.map(async (page, idx) => {
          // 1. Mock OCR inference - keep this as requested
          const text = await mockOcrInference(page.image_url, idx);

          // 2. Real image upload using document service
          // Use our utility function to upload the image directly from URI
          const uploadedUrl = await uploadDocumentImage(page.image_url);

          return {
            image_url: uploadedUrl,
            text,
          };
        })
      );

      // Store the processed pages with OCR text
      setOcrPages(processedPages);

      // Stop processing indicator
      setIsProcessing(false);

      // Proceed to title entry screen
      setStep("title");
    } catch (error) {
      console.error("Error processing document:", error);
      setIsProcessing(false);
      Alert.alert(
        "Processing Error",
        "Failed to process and save document. Please try again."
      );
      setStep("list"); // Return to list on error
    }
  }

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

  // Handle saving document after user enters title
  async function handleSaveDocument() {
    // Validate that we have processed pages
    if (ocrPages.length === 0) {
      Alert.alert("Error", "No processed pages to save. Please try again.");
      return;
    }

    // Use user-provided title or generate a default one
    const title =
      documentTitle.trim() || `Scanned Document ${new Date().toLocaleString()}`;

    setIsProcessing(true);

    try {
      // Save document using the document store
      await addDocument({
        title: title,
        data: { pages: ocrPages },
      });

      setIsProcessing(false);
      setStep("success"); // Show success message
    } catch (error) {
      console.error("Error saving document:", error);
      setIsProcessing(false);
      Alert.alert("Save Error", "Failed to save document. Please try again.");
    }
  }

  // Function to handle background processing
  async function handleBackgroundProcess() {
    // Mark as processing in background
    setProcessingInBackground(true);

    // Allow user to navigate away
    router.replace("/home");

    try {
      // Process images in background
      const processedPages = [];
      for (let i = 0; i < capturedImages.length; i++) {
        const page = capturedImages[i];

        // Process one image at a time
        const text = await mockOcrInference(page.image_url, i);
        const uploadedUrl = await uploadDocumentImage(page.image_url);

        // Add to processed pages
        processedPages.push({
          image_url: uploadedUrl,
          text,
        });

        // Update progress count
        setProcessedCount(i + 1);
      }

      // Store processed data
      setOcrPages(processedPages);
      setBackgroundProcessingComplete(true);

      // Notify user of completion
      Alert.alert(
        "Processing Complete",
        "Your document has been processed successfully. Would you like to add a title and save it now?",
        [
          {
            text: "Later",
            style: "cancel",
            onPress: () => console.log("User will save document later"),
          },
          {
            text: "Save Now",
            onPress: () => router.push("/scan?step=title"),
          },
        ]
      );
    } catch (error) {
      console.error("Background processing error:", error);
      Alert.alert(
        "Processing Error",
        "Failed to process document in the background. Please try again."
      );
    } finally {
      setIsProcessing(false);
      setProcessingInBackground(false);
    }
  }

  return (
    <View style={styles.container}>
      {step === "review" && currentImage && (
        <View style={{ flex: 1, backgroundColor: "#fff" }}>
          {/* Top bar with Done and Show (n) images buttons */}
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
                // Background color light red
                backgroundColor: "#fff0f0",
                borderRadius: 20,
                elevation: 5,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 2,
              }}
              onPress={() => router.replace("/home")}
            >
              {/* Exit button with background red */}
              <Ionicons name="close" size={28} color="#e74c3c" />
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "#10ac84",
                borderRadius: 20,
                paddingVertical: 6,
                paddingHorizontal: 14,
              }}
              onPress={() => setShowImagesModal(true)}
            >
              <Ionicons name="images-outline" size={20} color="#fff" />
              <Text
                style={{
                  color: "#fff",
                  fontWeight: "bold",
                  marginLeft: 6,
                  fontSize: 15,
                }}
              >{`Show (${capturedImages.length + 1}) images`}</Text>
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
          {/* Image preview */}
          <View
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
          >
            <Image
              source={{ uri: currentImage.image_url }}
              style={{ width: 260, height: 360, borderRadius: 10 }}
            />
          </View>
          {/* Bottom action buttons */}
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
                  backgroundColor: "#e9f8ef",
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
                  backgroundColor: "#fff0f0",
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
      {/* Modal to show captured images (full screen) */}
      <Modal
        visible={showImagesModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowImagesModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: "#fff" }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              padding: 16,
              borderBottomWidth: 1,
              borderColor: "#eee",
            }}
          >
            <TouchableOpacity onPress={() => setShowImagesModal(false)}>
              <Ionicons name="arrow-back" size={28} color="#10ac84" />
            </TouchableOpacity>
            <Text style={{ fontWeight: "bold", fontSize: 18, color: "#222" }}>
              Captured Images (
              {currentImage ? capturedImages.length + 1 : capturedImages.length}
              )
            </Text>
            <View style={{ width: 28 }} />
          </View>
          <ScrollView
            contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
            showsVerticalScrollIndicator={true}
          >
            {currentImage && (
              <View style={{ marginBottom: 24, alignItems: "center" }}>
                <Image
                  source={{ uri: currentImage.image_url }}
                  style={{
                    width: 220,
                    height: 300,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: "#ccc",
                  }}
                />
                <Text
                  style={{ marginTop: 8, color: "#333", fontWeight: "500" }}
                >
                  Current Image (Not Saved)
                </Text>
              </View>
            )}
            {capturedImages.map((page, idx) => (
              <View
                key={idx}
                style={{ marginBottom: 24, alignItems: "center" }}
              >
                <Image
                  source={{ uri: page.image_url }}
                  style={{
                    width: 220,
                    height: 300,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: "#ccc",
                  }}
                />
                <Text
                  style={{ marginTop: 8, color: "#333", fontWeight: "500" }}
                >
                  Page {idx + 1}
                </Text>
              </View>
            ))}
          </ScrollView>

          {/* Done button at the bottom of the modal */}
          <View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              padding: 16,
              backgroundColor: "#fff",
              borderTopWidth: 1,
              borderColor: "#eee",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 5,
              flexDirection: "row", // Make buttons flex row
              gap: 12, // Add gap between buttons (React Native 0.71+)
            }}
          >
            {/* Add Exit  */}
            <TouchableOpacity
              style={{
                backgroundColor: "#e74c3c",
                paddingVertical: 14,
                borderRadius: 8,
                alignItems: "center",
                flex: 1, // Make button flex
                marginBottom: 0, // Remove margin, handled by gap
              }}
              onPress={() => {
                setShowImagesModal(false);
                setCurrentImage(null);
                router.push("/home");
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>
                Exit
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                backgroundColor: "#10ac84",
                paddingVertical: 14,
                borderRadius: 8,
                alignItems: "center",
                flex: 1, // Make button flex
              }}
              onPress={() => {
                setShowImagesModal(false);
                if (step === "review" && currentImage) {
                  // Continue with the current review
                } else if (capturedImages.length > 0) {
                  // Go to list view if coming from camera
                  setStep("list");
                }
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>
                Done
              </Text>
            </TouchableOpacity>
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
            {/* Back button to show images modal */}
            <TouchableOpacity
              style={{ position: "absolute", top: 30, left: 30 }}
              onPress={() => setShowImagesModal(true)}
            >
              <Ionicons name="arrow-back" size={32} color="#fff" />
            </TouchableOpacity>
          </View>
        </CameraView>
      )}
      {step === "list" && (
        <View style={{ flex: 1, backgroundColor: "#fff", padding: 16 }}>
          {/* Header with back button */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 15,
              paddingTop: 10,
            }}
          >
            <TouchableOpacity
              style={{ padding: 5 }}
              onPress={() => setStep("camera")}
            >
              <Ionicons name="arrow-back" size={28} color="#10ac84" />
            </TouchableOpacity>
            <Text style={styles.previewTitle}>
              Captured Images ({capturedImages.length})
            </Text>
          </View>

          {/* Document title input */}
          <TextInput
            style={styles.titleInput}
            placeholder="Enter document title"
            value={documentTitle}
            onChangeText={setDocumentTitle}
          />
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
      {step === "processing" && !isProcessingMinimized && (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <ActivityIndicator size="large" color="#10ac84" />
          <Text
            style={{
              marginTop: 20,
              color: "#333",
              fontSize: 16,
              marginBottom: 15,
            }}
          >
            Processing images...
          </Text>

          {/* Progress bar showing processing status */}
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBar,
                { width: `${(processedCount / capturedImages.length) * 100}%` },
              ]}
            />
          </View>

          <Text style={{ marginTop: 10, color: "#666", marginBottom: 20 }}>
            {processedCount} of {capturedImages.length} pages processed
          </Text>

          {/* <TouchableOpacity
              style={styles.backgroundProcessButton}
              onPress={handleMinimizeProcessing}
            >
              <Text style={styles.backgroundProcessText}>Minimize to corner</Text>
            </TouchableOpacity> */}
        </View>
      )}
      {/* Show success message after processing */}
      {step === "success" && (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Ionicons
            name="checkmark-circle"
            size={80}
            color="#10ac84"
            style={{ marginBottom: 20 }}
          />
          <Text
            style={{
              fontSize: 22,
              fontWeight: "bold",
              color: "#10ac84",
              marginBottom: 10,
            }}
          >
            Document Created!
          </Text>
          <Text style={{ color: "#333", marginBottom: 30 }}>
            Your document has been successfully created.
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: "#10ac84",
              paddingHorizontal: 32,
              paddingVertical: 12,
              borderRadius: 8,
            }}
            onPress={() => router.replace("/home")}
          >
            <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>
              Go to Home
            </Text>
          </TouchableOpacity>
        </View>
      )}
      {/* Title entry screen after processing */}
      {step === "title" && (
        <View style={styles.titleScreenContainer}>
          <View style={styles.titleCard}>
            <Ionicons
              name="document-text-outline"
              size={60}
              color="#10ac84"
              style={styles.titleIcon}
            />

            <Text style={styles.titleScreenHeading}>
              Document Processed Successfully
            </Text>

            <Text style={styles.titleScreenSubheading}>
              Please enter a title for your document
            </Text>

            <TextInput
              style={styles.titleScreenInput}
              placeholder="Enter document title"
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
              style={styles.saveDocumentButton}
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
      {/* <BottomNavigation
        onScanPress={() => router.push("/scan")}
        onDocumentsPress={() => router.push("/home")}
        onProfilePress={() => router.push("/profile")}
      /> */}
      {/* Floating bubble for minimized processing */}
      {step === "processing" && isProcessingMinimized && (
        <FloatingProcessBubble
          visible={true}
          processedCount={processedCount}
          totalCount={capturedImages.length}
          onPress={handleMaximizeProcessing}
        />
      )}
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
    shadowColor: "#000",
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
  // New styles for progress bar
  progressBarContainer: {
    width: "100%",
    height: 10,
    backgroundColor: "#eee",
    borderRadius: 5,
    overflow: "hidden",
    marginTop: 20,
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#10ac84",
    borderRadius: 5,
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
