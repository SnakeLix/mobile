// import { useTextDetector } from "@/hooks/useTextDetector";
import { useObjectDetection } from "@/hooks/useObjectDetection";
import { styles } from "./scan.style";
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
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
  Dimensions,
} from "react-native";
import { CameraView } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { documentStore } from "@/store/documentStore";
import { Page } from "@/types/document";
import FloatingProcessBubble from "@/components/FloatingProcessBubble";
import { uploadDocumentImage } from "@/service/documentService";
import { ocrFromFile, ocrFromBase64 } from "@/service/ocrService"; // <-- UPDATE THIS IMPORT
import { useCamera } from "@/components/scan/hooks/useCamera";
import CameraControls from "@/components/scan/ui/CameraControls";
import * as Device from "expo-device";
import * as FileSystem from "expo-file-system";
import * as Clipboard from "expo-clipboard";

async function getLocalPlaceholderImage(): Promise<string> {
  const remoteUrl =
    "https://www.dropbox.com/scl/fi/0q57enzpi9o8ic4g8hd6u/z6529927408925_2a6ef6e9d94e4a04e7bdfcd9262de3a6.jpg?rlkey=1gxi8jx0c201ydme55trwhjrs&st=387os9p0&dl=1";
  const localUri =
    FileSystem.cacheDirectory +
    Math.random().toString(36).substring(2) +
    ".jpg";
  try {
    const fileInfo = await FileSystem.getInfoAsync(localUri);
    if (!fileInfo.exists) {
      await FileSystem.downloadAsync(remoteUrl, localUri);
    }
    return localUri;
  } catch (e) {
    console.error("Failed to download placeholder image", e);
    return remoteUrl; // fallback (will still fail for OCR)
  }
}

// Define ModelLoadingOverlay outside of the main component with proper TypeScript typing
const ModelLoadingOverlay = ({ isLoading }: { isLoading: boolean }) => {
  if (!isLoading) return null;

  return (
    <View style={{
      position: 'absolute',
      bottom: 20,
      right: 20,
      backgroundColor: 'white',
      borderRadius: 10,
      padding: 10,
      flexDirection: 'row',
      alignItems: 'center',
      maxWidth: 250,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
      zIndex: 9999
    }}>
      <ActivityIndicator size="small" color="#10ac84" style={{ marginRight: 10 }} />
      <View style={{ flex: 1 }}>
        <Text style={{
          fontSize: 12,
          fontWeight: 'bold'
        }}>Loading Object Detection</Text>
        <Text style={{
          fontSize: 10,
          color: '#555'
        }}>Continue using the app normally</Text>
      </View>
    </View>
  );
};

export default function ScanScreen() {
  const router = useRouter();
  const modelsReady = true;
  const modelLoading = false;
  const textDetect = async (a: any, b: any) => { };
  // const {
  //   isLoading: modelLoading,
  //   modelsReady: modelsReady,
  //   textDetect,
  // } = useTextDetector();

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
  const [activeTab, setActiveTab] = useState<"images" | "document">("images");
  const [previewIndex, setPreviewIndex] = useState(0);

  // Copy all text from all pages
  const handleCopyAllText = async () => {
    if (ocrPages.length === 0) return;
    const allText = ocrPages
      .map((p, i) => `Page ${i + 1}:\n${p.text}`)
      .join("\n\n");

    try {
      await Clipboard.setStringAsync(allText);
      Alert.alert("Copied", "All text copied to clipboard");
    } catch (error) {
      console.error("Failed to copy text", error);
      Alert.alert("Error", "Failed to copy text to clipboard");
    }
  };

  // Copy text from current page
  const handleCopyText = async () => {
    if (ocrPages.length === 0 || previewIndex >= ocrPages.length) return;
    const pageText = ocrPages[previewIndex].text;

    try {
      await Clipboard.setStringAsync(pageText);
      Alert.alert("Copied", "Text copied to clipboard");
    } catch (error) {
      console.error("Failed to copy text", error);
      Alert.alert("Error", "Failed to copy text to clipboard");
    }
  };

  // Move the model loading alert to the top of the component with other hooks
  const { runModelOnImage, isLoadingModel, modelLoaded, modelError } = useObjectDetection();

  // All useEffects grouped together
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

  useEffect(() => {
    if (isLoadingModel) {
      Alert.alert(
        "Object Detection Model Loading",
        "The object detection model is being loaded. This happens only once when you first use the app.",
        [{ text: "OK" }]
      );
    }
  }, [isLoadingModel]);

  const handleTakePicture = useCallback(async () => {
    let newPage;
    if (
      Device.isDevice === false ||
      Device.deviceType === Device.DeviceType.DESKTOP
    ) {
      const localUri = await getLocalPlaceholderImage();
      newPage = {
        image_url: localUri,
        text: "",
        detection: {
          label: "Unknown",
          confidence: 0
        }
      };
    } else {
      newPage = await captureImage();
    }
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
    setCapturedImages(capturedImages.filter((_, i) => i !== index));
  }

  async function ocrInference(
    imageUri: string,
    index: number
  ): Promise<{ text: string; boxes: any[]; detection: { label: string; confidence: number } }> {
    try {
      console.log("Performing OCR on image:", imageUri);

      // Read as base64 and send directly without trying to create a File/Blob
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Extract filename from URI for better identification on server
      const filename = imageUri.split("/").pop() || `image_${index}.jpg`;

      // Use the new base64 method instead of the file method
      const result = await ocrFromBase64(base64, filename);
      let detection: any = await runModelOnImage(base64);
      return { text: result.final_text, boxes: result.boxes, detection: detection };
    } catch (error) {
      console.error(`OCR inference error for image ${index}:`, error);
      return {
        text: `Failed to extract text from page ${index + 1}`,
        boxes: [],
        detection: {
          label: "Unknown",
          confidence: 0
        }
      };
    }
  }

  async function handleProcess() {
    if (capturedImages.length === 0) {
      Alert.alert(
        "Error",
        "No images to process. Please capture at least one image."
      );
      return;
    }

    if (!modelsReady) {
      Alert.alert(
        "Models Not Ready",
        "The OCR models are still loading. Please wait a moment and try again."
      );
      return;
    }

    setStep("processing");
    setIsProcessing(true);
    setProcessedCount(0);

    try {
      const processedPages: Page[] = [];
      for (let idx = 0; idx < capturedImages.length; idx++) {
        const page = capturedImages[idx];
        // Upload image first
        const uploadedUrl = await uploadDocumentImage(page.image_url);
        // OCR using the local file (not the uploaded URL)
        const ocrResult = await ocrInference(page.image_url, idx);
        processedPages.push({
          image_url: uploadedUrl,
          text: ocrResult.text,
          detection: ocrResult.detection,
          // <-- Only assign the string
          // Optionally, you can store ocrResult.boxes elsewhere if needed
        });
        setProcessedCount((prev) => prev + 1);
      }
      setOcrPages(processedPages);
      setIsProcessing(false);
      setStep("title");
    } catch (error) {
      console.error("Error processing document:", error);
      setIsProcessing(false);
      Alert.alert(
        "Processing Error",
        "Failed to process document. " +
        (error instanceof Error ? error.message : "Please try again later.")
      );
      setStep("list");
    }
  }

  // Show loading screen if camera permission is being checked
  if (!permission) {
    return (
      <View style={styles.permissionContainer}>
        <ActivityIndicator size="large" color="#10ac84" />
        <Text>Requesting Camera Permission...</Text>
      </View>
    );
  }

  // Show permission request screen if camera permission is not granted
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
    if (!modelsReady) {
      Alert.alert(
        "Models Not Ready",
        "The OCR models are still loading. Please wait a moment and try again."
      );
      return;
    }

    setProcessingInBackground(true);
    setIsProcessing(true);
    setProcessedCount(0);
    router.replace("/home");

    try {
      const processedPages: Page[] = [];
      for (let i = 0; i < capturedImages.length; i++) {
        const page = capturedImages[i];
        const ocrResult = await ocrInference(page.image_url, i);
        const uploadedUrl = await uploadDocumentImage(page.image_url);

        // Extract just the text string from ocrResult
        processedPages.push({
          image_url: uploadedUrl,
          text: ocrResult.text,
          detection: ocrResult.detection
        });
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

  // Show model loading overlay if models are not ready
  if (modelLoading && !modelsReady && step === "camera") {
    return (
      <View style={styles.permissionContainer}>
        <ActivityIndicator size="large" color="#10ac84" />
        <Text style={styles.loadingText}>Loading OCR models...</Text>
        <Text style={styles.loadingSubText}>This may take a few moments</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Models not ready warning for camera screen */}
      {!modelsReady && step === "camera" && (
        <View style={styles.modelWarningBanner}>
          <Ionicons name="warning" size={20} color="#fff" />
          <Text style={styles.modelWarningText}>
            OCR models still loading. You can capture images, but processing
            will be delayed.
          </Text>
        </View>
      )}

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
                exitFlow();
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
              >{`Show (${capturedImages.length + (currentImage ? 1 : 0)
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
              gap: 40,
              justifyContent: "center",
              marginBottom: 32,
            }}
          >
            {/* <TouchableOpacity
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
            </TouchableOpacity> */}
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
          {/* Show model warning if needed */}
          {!modelsReady && (
            <View style={styles.modelWarningCard}>
              <Ionicons name="warning" size={24} color="#f39c12" />
              <Text style={styles.modelWarningCardText}>
                OCR models are still loading. Processing will be available once
                they're ready.
              </Text>
            </View>
          )}
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
          {/* <TextInput
            style={styles.titleInput}
            placeholder="Enter document title (optional)"
            value={documentTitle}
            onChangeText={setDocumentTitle}
          /> */}
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
              (!modelsReady || isProcessing || capturedImages.length === 0) &&
              styles.disabledButton,
            ]}
            onPress={handleProcess}
            disabled={
              !modelsReady || isProcessing || capturedImages.length === 0
            }
          >
            {isProcessing ? (
              <ActivityIndicator color="#fff" />
            ) : !modelsReady ? (
              <>
                <Ionicons
                  name="hourglass-outline"
                  size={22}
                  color="#fff"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.actionButtonText}>Waiting for Models</Text>
              </>
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
                  width: `${capturedImages.length > 0
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

            {/* Tab navigation */}
            <View style={styles.previewTabContainer}>
              <TouchableOpacity
                style={[
                  styles.previewTab,
                  activeTab === "images" && styles.activePreviewTab,
                ]}
                onPress={() => setActiveTab("images")}
              >
                <Text
                  style={[
                    styles.previewTabText,
                    activeTab === "images" && styles.activePreviewTabText,
                  ]}
                >
                  Images
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.previewTab,
                  activeTab === "document" && styles.activePreviewTab,
                ]}
                onPress={() => setActiveTab("document")}
              >
                <Text
                  style={[
                    styles.previewTabText,
                    activeTab === "document" && styles.activePreviewTabText,
                  ]}
                >
                  Document
                </Text>
              </TouchableOpacity>
            </View>

            {/* Preview content */}
            <View style={styles.previewContent}>
              {activeTab === "images" && (
                <View style={styles.imagePreviewContainer}>
                  <ScrollView
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={(e) => {
                      const width = Dimensions.get("window").width * 0.8;
                      setPreviewIndex(
                        Math.round(e.nativeEvent.contentOffset.x / width)
                      );
                    }}
                    contentOffset={{
                      x: previewIndex * Dimensions.get("window").width * 0.8,
                      y: 0,
                    }}
                  >
                    {ocrPages.map((page, idx) => (
                      <View key={idx} style={styles.imagePreviewPage}>
                        <Image
                          source={{ uri: page.image_url }}
                          style={styles.previewImage}
                          resizeMode="contain"
                        />
                        <Text style={styles.pageIndicatorText}>
                          Page {idx + 1}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                  <Text style={styles.paginationText}>
                    {previewIndex + 1} / {ocrPages.length}
                  </Text>
                </View>
              )}

              {activeTab === "document" && (
                <View style={styles.textPreviewContainer}>
                  <ScrollView
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={(e) => {
                      const width = Dimensions.get("window").width * 0.8;
                      setPreviewIndex(
                        Math.round(e.nativeEvent.contentOffset.x / width)
                      );
                    }}
                    contentOffset={{
                      x: previewIndex * Dimensions.get("window").width * 0.8,
                      y: 0,
                    }}
                  >
                    {ocrPages.map((page, idx) => (
                      <View key={idx} style={styles.textPreviewPage}>
                        <Text style={styles.detectionText}>
                          {page?.detection?.label ? `Detected: ${page.detection.label} (${Math.round(page.detection.confidence * 100)}%)` : ''}
                        </Text>
                        {/* Make the ScrollView take most of the available height */}
                        <ScrollView
                          style={[styles.textScrollView, { maxHeight: Dimensions.get('window').height * 0.5 }]}
                          nestedScrollEnabled={true}
                          showsVerticalScrollIndicator={true}
                        >
                          <Text style={styles.previewText}>{page.text}</Text>
                        </ScrollView>
                        <Text style={styles.pageIndicatorText}>
                          Page {idx + 1} / {ocrPages.length}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>

                  <View style={styles.textActionsContainer}>
                    <TouchableOpacity
                      style={styles.copyButton}
                      onPress={handleCopyText}
                    >
                      <Text style={styles.copyButtonText}>Copy</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.copyAllButton}
                      onPress={handleCopyAllText}
                    >
                      <Text style={styles.copyButtonText}>Copy All</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
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
      <ModelLoadingOverlay isLoading={isLoadingModel} />
    </View>
  );
}
