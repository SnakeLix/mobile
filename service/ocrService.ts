import axios from "@/api/axiosInstance";

export interface OCRResult {
  final_text: string;
  boxes: Array<{
    box: number[][];
    label: string;
  }>;
}

export const ocrFromFile = async (file: File): Promise<OCRResult> => {
  const formData = new FormData();
  formData.append("file", file);
  console.log("FormData:", formData.get("file"));
  console.log("File name:", file.name);
  const response = await axios.post("/ocr/file", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const ocrFromUrl = async (url: string): Promise<OCRResult> => {
  console.log("URL:", url);
  const response = await axios.post("/ocr/url", { url });
  return response.data;
};

export const ocrFromBase64 = async (
  base64Image: string,
  filename: string = "image.jpg",
  mimeType: string = "image/jpeg"
): Promise<OCRResult> => {
  try {
    console.log(`Sending base64 image for OCR, length: ${base64Image.length}`);

    // Check if the base64 string already has a data URI prefix
    const base64WithPrefix = base64Image.startsWith("data:")
      ? base64Image
      : `data:${mimeType};base64,${base64Image}`;

    // Add timeout and size limits to prevent hanging
    const response = await axios.post(
      "/ocr/base64",
      {
        base64_image: base64WithPrefix,
      },
      {
        timeout: 30000, // 30 second timeout
        maxContentLength: 20 * 1024 * 1024, // 20MB max size
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    console.log("OCR base64 response status:", response.status);
    return response.data;
  } catch (error: any) {
    // More detailed error logging
    console.error("OCR base64 error:", JSON.stringify(error, null, 2));
    throw error;
  }
};
