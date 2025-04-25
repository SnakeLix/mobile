import {
  Document,
  DocumentCreate,
  DocumentUpdate,
  Page,
} from "@/types/document";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import asyncStorage from "@/utils/asyncStorage";
import {
  getDocuments,
  getDocument,
  createDocument,
  updateDocument,
  deleteDocument,
  uploadDocumentImage,
} from "@/service/documentService";
import { UUID } from "crypto";

// Define the structure for processing progress
interface ProcessingProgress {
  processed: number;
  total: number;
}

interface DocumentStore {
  documents: Document[];
  currentDocument: Document | null;
  loading: boolean;
  error: string | null;
  // Add state for background processing
  isProcessing: boolean;
  processingProgress: ProcessingProgress | null;
  isProcessingMinimized: boolean;

  // Document actions
  fetchDocuments: () => Promise<void>;
  fetchDocument: (id: UUID) => Promise<void>; // Corrected return type if needed
  addDocument: (document: DocumentCreate) => Promise<Document>;
  editDocument: (id: UUID, document: DocumentUpdate) => Promise<Document>; // Corrected return type if needed
  removeDocument: (id: UUID) => Promise<void>; // Corrected return type if needed
  uploadImage: (file: File | string) => Promise<string>;
  // Add actions for processing state
  startProcessing: (totalItems: number) => void;
  updateProcessingProgress: (processedItems: number) => void;
  finishProcessing: () => void;
  toggleProcessingMinimized: (minimized?: boolean) => void;

  // State management
  setCurrentDocument: (document: Document | null) => void;
  clearDocuments: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const documentStore = create<DocumentStore>()(
  persist(
    (set, get) => ({
      documents: [],
      currentDocument: null,
      loading: false,
      error: null,
      // Initialize processing state
      isProcessing: false,
      processingProgress: null,
      isProcessingMinimized: false,

      // Document actions
      fetchDocuments: async () => {
        try {
          set({ loading: true, error: null });
          const docs = await getDocuments();
          set({ documents: docs, loading: false });
        } catch (error: any) {
          console.error("Fetch documents error:", error);
          set({
            loading: false,
            error: error.response?.data?.detail || "Failed to fetch documents.",
          });
        }
      },

      fetchDocument: async (id: UUID) => {
        try {
          set({ loading: true, error: null });
          const doc = await getDocument(id);
          set({ currentDocument: doc, loading: false });
          // return doc; // Removed return as Promise<void> is expected by interface (or adjust interface)
        } catch (error: any) {
          console.error("Fetch document error:", error);
          set({
            loading: false,
            error:
              error.response?.data?.detail ||
              "Failed to fetch document details.",
          });
          throw error; // Re-throw might be needed depending on usage
        }
      },

      addDocument: async (document: DocumentCreate) => {
        try {
          set({ loading: true, error: null });
          const newDoc = await createDocument(document);
          set((state) => ({
            documents: [...state.documents, newDoc],
            currentDocument: newDoc,
            loading: false,
          }));
          return newDoc;
        } catch (error: any) {
          console.error("Add document error:", error);
          set({
            loading: false,
            error: error.response?.data?.detail || "Failed to create document.",
          });
          throw error;
        }
      },

      editDocument: async (id: UUID, document: DocumentUpdate) => {
        try {
          set({ loading: true, error: null });
          const updatedDoc = await updateDocument(id, document);
          set((state) => ({
            documents: state.documents.map((doc) =>
              doc.id === id ? updatedDoc : doc
            ),
            currentDocument: updatedDoc,
            loading: false,
          }));
          return updatedDoc; // Return updated doc as per interface
        } catch (error: any) {
          console.error("Edit document error:", error);
          set({
            loading: false,
            error: error.response?.data?.detail || "Failed to update document.",
          });
          throw error;
        }
      },

      removeDocument: async (id: UUID) => {
        try {
          set({ loading: true, error: null });
          await deleteDocument(id);
          set((state) => ({
            documents: state.documents.filter((doc) => doc.id !== id),
            currentDocument:
              state.currentDocument?.id === id ? null : state.currentDocument,
            loading: false,
          }));
          // No return needed for Promise<void>
        } catch (error: any) {
          console.error("Remove document error:", error);
          set({
            loading: false,
            error: error.response?.data?.detail || "Failed to delete document.",
          });
          throw error;
        }
      },

      uploadImage: async (file: File | string) => {
        try {
          set({ loading: true, error: null });
          const imageUrl = await uploadDocumentImage(file);
          set({ loading: false });
          return imageUrl;
        } catch (error: any) {
          console.error("Upload image error:", error);
          set({
            loading: false,
            error: error.response?.data?.detail || "Failed to upload image.",
          });
          throw error;
        }
      },

      // Processing actions
      startProcessing: (totalItems: number) => {
        set({
          isProcessing: true,
          processingProgress: { processed: 0, total: totalItems },
          isProcessingMinimized: false, // Start maximized by default
          error: null,
        });
      },
      updateProcessingProgress: (processedItems: number) => {
        set((state) => ({
          processingProgress: state.processingProgress
            ? { ...state.processingProgress, processed: processedItems }
            : null,
        }));
      },
      finishProcessing: () => {
        set({
          isProcessing: false,
          processingProgress: null,
          isProcessingMinimized: false,
        });
      },
      toggleProcessingMinimized: (minimized?: boolean) => {
        set((state) => ({
          isProcessingMinimized: minimized ?? !state.isProcessingMinimized,
        }));
      },

      // State management
      setCurrentDocument: (document: Document | null) =>
        set({ currentDocument: document }),
      clearDocuments: () => set({ documents: [], currentDocument: null }),
      setLoading: (loading: boolean) => set({ loading }),
      setError: (error: string | null) => set({ error }),
      clearError: () => set({ error: null }),
    }),
    {
      name: "document-storage",
      storage: asyncStorage,
      partialize: (state) => ({
        documents: state.documents,
        // Don't persist processing, loading and error states
      }),
    }
  )
);
