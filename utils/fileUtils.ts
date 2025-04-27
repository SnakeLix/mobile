/**
 * Utility functions for file operations in the mobile app
 */
import * as FileSystem from "expo-file-system";

/**
 * Converts an image URI to a FormData object for API uploads
 * @param imageUri - The local URI of the image
 * @param fieldName - The form field name to use (default: 'file')
 * @param fileName - Optional custom filename (if not provided, extracted from URI)
 * @returns FormData object ready for API upload
 */
export const imageUriToFormData = (
  imageUri: string,
  fieldName: string = "file",
  fileName?: string
): FormData => {
  const fileNameFromUri = imageUri.split("/").pop();
  const finalFileName =
    fileName || fileNameFromUri || `image_${Date.now()}.jpg`;

  const match = /\.(\w+)$/.exec(finalFileName);
  const fileType = match ? `image/${match[1]}` : "image/jpeg";

  const formData = new FormData();

  formData.append(fieldName, {
    uri: imageUri,
    name: finalFileName,
    type: fileType,
  } as any);

  return formData;
};

/**
 * Converts an image URI to a File object for browser-like APIs
 * @param uri - The local URI of the image
 * @param filename - The filename to use
 * @returns Promise resolving to a File object
 */
export const uriToFile = async (
  uri: string,
  filename: string
): Promise<File> => {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const match = /\.(\w+)$/.exec(filename);
    const fileType = match ? `image/${match[1].toLowerCase()}` : "image/jpeg";

    const blob = await fetch(`data:${fileType};base64,${base64}`).then((res) =>
      res.blob()
    );

    return new File([blob], filename, { type: fileType });
  } catch (error) {
    console.error("Error converting URI to File:", error);
    throw error;
  }
};

/**
 * Gets MIME type from a file name
 * @param fileName - The name of the file
 * @returns The MIME type string
 */
export const getMimeType = (fileName: string): string => {
  const ext = fileName.split(".").pop()?.toLowerCase();

  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "gif":
      return "image/gif";
    case "pdf":
      return "application/pdf";
    case "doc":
      return "application/msword";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    default:
      return "application/octet-stream";
  }
};

/**
 * Reads a local image file as a binary buffer (Uint8Array) for native processing
 * @param uri - The local URI of the image
 * @returns Promise resolving to a Uint8Array containing binary image data
 */
export const readImageAsBuffer = async (uri: string): Promise<Uint8Array> => {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const binary = atob(base64);
    const buffer = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      buffer[i] = binary.charCodeAt(i);
    }

    return buffer;
  } catch (error) {
    console.error("Error reading image as buffer:", error);
    throw error;
  }
};
