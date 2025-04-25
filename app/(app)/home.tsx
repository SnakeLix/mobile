import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  Image,
  Modal,
  ScrollView,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { documentStore } from "@/store/documentStore";
import { Document } from "@/types/document";
import * as Clipboard from "expo-clipboard";

export default function HomeScreen() {
  const router = useRouter();
  const { documents, loading, error, fetchDocuments, removeDocument } =
    documentStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(
    null
  );
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"images" | "document">("images");
  const [imageIndex, setImageIndex] = useState(0);
  const [textIndex, setTextIndex] = useState(0);

  useEffect(() => {
    // Refresh documents data when screen is focused
    fetchDocuments();
  }, []);

  const handleDocumentPress = (document: Document) => {
    documentStore.setState({ currentDocument: document });
    setSelectedDocument(document);
    setShowModal(true);
    setActiveTab("images");
    setImageIndex(0);
    setTextIndex(0);
  };

  const handleDeleteDocument = (document: Document) => {
    Alert.alert(
      "Delete Document",
      `Are you sure you want to delete "${
        document.title || "Untitled document"
      }"?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            removeDocument(document.id)
              .then(() => {
                Alert.alert("Success", "Document deleted successfully.");
              })
              .catch((error) => {
                Alert.alert("Error", "Failed to delete document.");
              });
          },
        },
      ]
    );
  };

  // Filter documents based on search query
  const filteredDocuments = documents.filter(
    (doc) =>
      doc.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      !searchQuery
  );

  const renderDocumentItem = ({ item }: { item: Document }) => {
    // Get first page image if available, otherwise use placeholder
    const thumbnailImage =
      item.data.pages.length > 0
        ? { uri: item.data.pages[0].image_url }
        : require("@/assets/images/icon.png");

    return (
      <TouchableOpacity
        style={styles.documentItem}
        onPress={() => handleDocumentPress(item)}
      >
        <View style={styles.thumbnailContainer}>
          <Image source={thumbnailImage} style={styles.thumbnail} />
        </View>
        <View style={styles.documentInfo}>
          <Text style={styles.documentTitle} numberOfLines={1}>
            {item.title || "Untitled Document"}
          </Text>
          <Text style={styles.documentDate}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
          <Text style={styles.documentPages}>
            {item.data.pages.length}{" "}
            {item.data.pages.length === 1 ? "page" : "pages"}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteDocument(item)}
        >
          <Ionicons name="trash-outline" size={20} color="#e74c3c" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const EmptyListComponent = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="document-text-outline" size={60} color="#ccc" />
      <Text style={styles.emptyText}>No documents found</Text>
      <Text style={styles.emptySubText}>
        {searchQuery
          ? "Try a different search term"
          : "Tap the scan button to create your first document"}
      </Text>
    </View>
  );

  // Copy all text from all pages
  const handleCopyAllText = () => {
    if (!selectedDocument) return;
    const allText = selectedDocument.data.pages
      .map((p, i) => `Page ${i + 1}:\n${p.text}`)
      .join("\n\n");
    Clipboard.setStringAsync(allText);
  };
  // Copy text from current page
  const handleCopyText = () => {
    if (!selectedDocument) return;
    const page = selectedDocument.data.pages[textIndex];
    if (page) Clipboard.setStringAsync(page.text);
  };

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={20}
          color="#666"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search documents..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Loading Indicator */}
      {loading && documents.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10ac84" />
          <Text style={styles.loadingText}>Loading documents...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={50} color="#e74c3c" />
          <Text style={styles.errorText}>Failed to load documents</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchDocuments()}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredDocuments}
          renderItem={renderDocumentItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshing={loading}
          onRefresh={fetchDocuments}
          ListEmptyComponent={EmptyListComponent}
        />
      )}

      {/* Spacer to prevent content from being hidden under nav */}
      <View style={{ height: 70 }} />

      <Modal
        visible={showModal}
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
        transparent={false}
      >
        <View style={{ flex: 1, backgroundColor: "#fff" }}>
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: 16,
              borderBottomWidth: 1,
              borderColor: "#eee",
              justifyContent: "space-between",
            }}
          >
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Ionicons name="arrow-back" size={28} color="#10ac84" />
            </TouchableOpacity>
            <Text style={{ fontWeight: "bold", fontSize: 18, color: "#222" }}>
              {selectedDocument?.title || "Document"}
            </Text>
            <View style={{ width: 28 }} />
          </View>
          {/* Tabs */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              marginTop: 10,
              marginBottom: 10,
            }}
          >
            <TouchableOpacity
              style={{
                paddingVertical: 8,
                paddingHorizontal: 24,
                borderBottomWidth: activeTab === "images" ? 2 : 0,
                borderColor: "#10ac84",
                marginRight: 20,
              }}
              onPress={() => setActiveTab("images")}
            >
              <Text
                style={{
                  color: activeTab === "images" ? "#10ac84" : "#666",
                  fontWeight: "bold",
                }}
              >
                Images
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                paddingVertical: 8,
                paddingHorizontal: 24,
                borderBottomWidth: activeTab === "document" ? 2 : 0,
                borderColor: "#10ac84",
              }}
              onPress={() => setActiveTab("document")}
            >
              <Text
                style={{
                  color: activeTab === "document" ? "#10ac84" : "#666",
                  fontWeight: "bold",
                }}
              >
                Document
              </Text>
            </TouchableOpacity>
          </View>
          {/* Tab Content */}
          {activeTab === "images" && selectedDocument && (
            <View
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                  const width = Dimensions.get("window").width;
                  setImageIndex(
                    Math.round(e.nativeEvent.contentOffset.x / width)
                  );
                }}
                contentOffset={{
                  x: imageIndex * Dimensions.get("window").width,
                  y: 0,
                }}
                style={{ flexGrow: 0 }}
              >
                {selectedDocument.data.pages.map((page, idx) => (
                  <View
                    key={idx}
                    style={{
                      width: Dimensions.get("window").width,
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 20,
                    }}
                  >
                    <Image
                      source={{ uri: page.image_url }}
                      style={{
                        width: 300,
                        height: 400,
                        borderRadius: 10,
                        backgroundColor: "#eee",
                      }}
                      resizeMode="contain"
                    />
                    <Text
                      style={{
                        marginTop: 10,
                        color: "#333",
                        fontWeight: "500",
                      }}
                    >
                      Page {idx + 1}
                    </Text>
                  </View>
                ))}
              </ScrollView>
              {/* Page indicator */}
              <Text style={{ marginTop: 10, color: "#666" }}>
                {imageIndex + 1} / {selectedDocument.data.pages.length}
              </Text>
            </View>
          )}
          {activeTab === "document" && selectedDocument && (
            <View
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                  const width = Dimensions.get("window").width;
                  setTextIndex(
                    Math.round(e.nativeEvent.contentOffset.x / width)
                  );
                }}
                contentOffset={{
                  x: textIndex * Dimensions.get("window").width,
                  y: 0,
                }}
                style={{ flexGrow: 0 }}
              >
                {selectedDocument.data.pages.map((page, idx) => (
                  <View
                    key={idx}
                    style={{
                      width: Dimensions.get("window").width,
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 20,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        color: "#222",
                        marginBottom: 20,
                        textAlign: "left",
                      }}
                    >
                      {page.text}
                    </Text>
                    <View style={{ flexDirection: "row", gap: 10 }}>
                      <TouchableOpacity
                        style={{
                          backgroundColor: "#10ac84",
                          paddingVertical: 10,
                          paddingHorizontal: 18,
                          borderRadius: 6,
                          marginRight: 10,
                        }}
                        onPress={handleCopyText}
                      >
                        <Text style={{ color: "#fff", fontWeight: "bold" }}>
                          Copy
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{
                          backgroundColor: "#222f3e",
                          paddingVertical: 10,
                          paddingHorizontal: 18,
                          borderRadius: 6,
                        }}
                        onPress={handleCopyAllText}
                      >
                        <Text style={{ color: "#fff", fontWeight: "bold" }}>
                          Copy All
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={{ marginTop: 10, color: "#666" }}>
                      Page {idx + 1} / {selectedDocument.data.pages.length}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    borderRadius: 10,
    marginHorizontal: 16,
    marginVertical: 10,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: "#eee",
    height: 50,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: "#333",
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
  },
  documentItem: {
    flexDirection: "row",
    backgroundColor: "#f8f9fa",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#eee",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  thumbnailContainer: {
    width: 70,
    height: 70,
    borderRadius: 5,
    overflow: "hidden",
    backgroundColor: "#e5e5e5",
    justifyContent: "center",
    alignItems: "center",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  documentInfo: {
    flex: 1,
    marginLeft: 15,
    justifyContent: "center",
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  documentDate: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  documentPages: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  deleteButton: {
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: "#e74c3c",
    textAlign: "center",
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: "#10ac84",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyText: {
    marginTop: 15,
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  emptySubText: {
    marginTop: 8,
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    paddingHorizontal: 30,
  },
});
