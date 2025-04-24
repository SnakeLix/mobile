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

interface DocumentStore {
  documents: Document[];
  currentDocument: Document | null;
  loading: boolean;
  error: string | null;

  // Document actions
  fetchDocuments: () => Promise<void>;
  fetchDocument: (id: UUID) => Promise<void>;
  addDocument: (document: DocumentCreate) => Promise<Document>;
  editDocument: (id: UUID, document: DocumentUpdate) => Promise<Document>;
  removeDocument: (id: UUID) => Promise<void>;
  uploadImage: (file: File) => Promise<string>;

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
          return doc;
        } catch (error: any) {
          console.error("Fetch document error:", error);
          set({
            loading: false,
            error:
              error.response?.data?.detail ||
              "Failed to fetch document details.",
          });
          throw error;
        }
      },

      addDocument: async (document: DocumentCreate) => {
        try {
          set({ loading: true, error: null });
          const newDoc = await createDocument(document);

          // Update the documents list with the new document
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

          // Update the documents list and current document
          set((state) => ({
            documents: state.documents.map((doc) =>
              doc.id === id ? updatedDoc : doc
            ),
            currentDocument: updatedDoc,
            loading: false,
          }));

          return updatedDoc;
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

          // Remove document from list
          set((state) => ({
            documents: state.documents.filter((doc) => doc.id !== id),
            currentDocument:
              state.currentDocument?.id === id ? null : state.currentDocument,
            loading: false,
          }));
        } catch (error: any) {
          console.error("Remove document error:", error);
          set({
            loading: false,
            error: error.response?.data?.detail || "Failed to delete document.",
          });
          throw error;
        }
      },

      uploadImage: async (file: File) => {
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

      // State management
      setCurrentDocument: (document) => set({ currentDocument: document }),
      clearDocuments: () => set({ documents: [], currentDocument: null }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),
    }),
    {
      name: "document-storage",
      storage: asyncStorage,
      partialize: (state) => ({
        documents: state.documents,
        // Don't persist loading and error states
      }),
    }
  )
);
