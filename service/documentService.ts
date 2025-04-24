// src/api/documentService.ts
import axios from "@/api/axiosInstance";
import {
  Document,
  DocumentCreate,
  DocumentUpdate,
  Page,
} from "@/types/document";
import { UUID } from "crypto";

/**
 * Fetch all documents for the current user
 */
export const getDocuments = async (
  skip = 0,
  limit = 100
): Promise<Document[]> => {
  try {
    const response = await axios.get(`/documents?skip=${skip}&limit=${limit}`);
    return response.data;
  } catch (error) {
    console.error("Get documents error:", error);
    throw error;
  }
};

/**
 * Create a new document
 */
export const createDocument = async (
  document: DocumentCreate
): Promise<Document> => {
  try {
    const response = await axios.post("/documents", document);
    return response.data;
  } catch (error) {
    console.error("Create document error:", error);
    throw error;
  }
};

/**
 * Get a specific document by ID
 */
export const getDocument = async (documentId: UUID): Promise<Document> => {
  try {
    const response = await axios.get(`/documents/${documentId}`);
    return response.data;
  } catch (error) {
    console.error("Get document error:", error);
    throw error;
  }
};

/**
 * Update an existing document
 */
export const updateDocument = async (
  documentId: UUID,
  document: DocumentUpdate
): Promise<Document> => {
  try {
    const response = await axios.put(`/documents/${documentId}`, document);
    return response.data;
  } catch (error) {
    console.error("Update document error:", error);
    throw error;
  }
};

/**
 * Delete a document
 */
export const deleteDocument = async (documentId: UUID): Promise<Document> => {
  try {
    const response = await axios.delete(`/documents/${documentId}`);
    return response.data;
  } catch (error) {
    console.error("Delete document error:", error);
    throw error;
  }
};

/**
 * Upload a document image and get the image URL
 * Accepts either a File object or an image URI string
 */
export const uploadDocumentImage = async (
  image: File | string
): Promise<string> => {
  try {
    let formData = new FormData();
    
    if (typeof image === 'string') {
      // If image is a URI string, convert it to FormData using our utility
      const { imageUriToFormData } = require('@/utils/fileUtils');
      formData = imageUriToFormData(image);
    } else {
      // If image is already a File object, create FormData manually
      formData.append('file', image);
    }

    const response = await axios.post("/upload-image", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data.image_url;
  } catch (error) {
    console.error("Upload image error:", error);
    throw error;
  }
};
