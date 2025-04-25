import { useState, useRef, useCallback } from "react";
import { Alert } from "react-native";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import { Page } from "@/types/document"; // Assuming Page type is needed or adjust import

export function useCamera() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const [facing, setFacing] = useState<CameraType>("back");
  const [isCapturing, setIsCapturing] = useState(false);

  const toggleCameraFacing = useCallback(() => {
    setFacing((current) => (current === "back" ? "front" : "back"));
  }, []);

  const takePicture = useCallback(async (): Promise<Page | null> => {
    if (!cameraRef.current || isCapturing) return null;

    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
        skipProcessing: false, // Keep expo processing for potential optimizations
      });
      const newPage: Page = {
        image_url: (photo as any).uri,
        text: "", // OCR text will be added later
      };
      setIsCapturing(false);
      return newPage;
    } catch (error) {
      console.error("Error taking picture:", error);
      Alert.alert("Error", "Failed to capture image. Please try again.");
      setIsCapturing(false);
      return null;
    }
  }, [isCapturing]);

  return {
    permission,
    requestPermission,
    cameraRef,
    facing,
    isCapturing,
    toggleCameraFacing,
    takePicture,
  };
}
