import { useChat } from "@/backend/chat";
import AttachmentSheet from "@/components/chat/attachment-sheet";
import { useGlobalContext } from "@/context/global-context";
import { PercentageIcon } from "@/icons/percent-outline";
import { GENERATE_SIGNED_URLS } from "@/lib/config";
import axiosInstance from "@/lib/networkUtils";
import { useSocket } from "@/services/socket";
import axios from "axios";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { debounce } from "lodash";
import { styled } from "nativewind";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  PaperClipIcon,
  XMarkIcon
} from "react-native-heroicons/outline";
import { PaperAirplaneIcon, } from "react-native-heroicons/solid";

const StyledInput = styled(TextInput);
const StyledTO = styled(TouchableOpacity);

interface Props {
  onMakeOfferPress: () => void;
  isBlocked: boolean;
  conversationId: string;
  participantDetails: {
    userId: string;
  };
}

interface PresignedResponse {
  presigned_urls: string[];
}

interface MediaPreview {
  uri: string;
  name: string;
  type: string;
  size?: number;
}

export function ChatInput({
  onMakeOfferPress,
  isBlocked,
  conversationId,
  participantDetails,
}: Props) {
  const [message, setMessage] = React.useState("");
  const [inputHeight, setInputHeight] = useState(44);
  const [selectedFile, setSelectedFile] = useState<MediaPreview | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<MediaPreview | null>(null);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { theme, userDetails, authTokens } = useGlobalContext();
  const isDarkMode = theme === "dark";
  const { access_token } = authTokens || {};

  const { sendMessage } = useChat();
  const { sendMessage: socketSendMessage, emitTyping } = useSocket();

  // Create a debounced version of emitTyping
  const debouncedEmitTyping = useRef(
    debounce((isTyping: boolean) => {
      emitTyping(conversationId, isTyping);
    }, 300)
  ).current;

  React.useEffect(() => {
    if (!message) {
      setInputHeight(44);
    }
  }, [message]);

  const attachmentSheetRef = useRef(null);

  const uploadToS3 = async (
    presignedUrl: string,
    fileUri: string
  ): Promise<void> => {
    if (!authTokens) return;
    return new Promise(async (resolve, reject) => {
      try {
        const response = await fetch(fileUri);
        const blob = await response.blob();

        const xhr = new XMLHttpRequest();
        xhr.open("PUT", presignedUrl, true);

        // Set content type based on file type
        xhr.setRequestHeader("Content-Type", blob.type);

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100;
          }
        };

        xhr.onload = () => {
          if (xhr.status === 200) {
            resolve();
          } else {
            const errorText = xhr.responseText;
            console.error("Upload failed with status:", xhr.status);
            console.error("Error response:", errorText);
            reject(new Error(`Upload failed: ${xhr.status} ${errorText}`));
          }
        };

        xhr.onerror = () => {
          const errorText = xhr.responseText;
          console.error("Network error during upload");
          console.error("Error details:", errorText);
          reject(new Error("Network error during upload"));
        };

        xhr.send(blob);
      } catch (error) {
        console.error("Upload error:", error);
        reject(error);
      }
    });
  };

  const getPresignedURLs = async (
    files: { filename: string; type: string }[]
  ) => {
    if (!authTokens) return [];
    try {
      const response = await axiosInstance.post<PresignedResponse>(
        GENERATE_SIGNED_URLS,
        {
          filenames: files.map((f) => f.filename),
          file_types: files.map((f) => f.type),
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      return response.data.presigned_urls;
    } catch (error) {
      console.error("Error getting presigned URLs:", error);
      throw error;
    }
  };

  const handleSend = () => {
    const trimmedMessage = message.trim();

    if (trimmedMessage) {
      // Send message through socket
      socketSendMessage(
        trimmedMessage,
        participantDetails.userId,
        userDetails?.username!
      );

      // Also send through Firebase for persistence
      sendMessage(trimmedMessage, conversationId);

      setMessage("");
      debouncedEmitTyping(false);
    }
  };

  const handleMessageChange = (text: string) => {
    setMessage(text);
    debouncedEmitTyping(text.length > 0);
  };

  const handleOpenAttachmentSheet = () => {
    if (attachmentSheetRef.current) {
      attachmentSheetRef.current.present();
    }
  };

  const handleSelectDocuments = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({});
      if (result.assets?.[0]) {
        const file = result.assets[0];
        setSelectedFile({
          uri: file.uri,
          name: file.name.toLowerCase(),
          type: file.mimeType || "application/octet-stream",
          size: file.size,
        });
        setIsPreviewVisible(true);
      }
      attachmentSheetRef.current?.close();
    } catch (error) {
      console.error("Error picking document:", error);
      // Optionally show an error message to the user
      alert("Failed to select document. Please try again.");
    }
  };

  const handleSelectImagesVideos = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      alert("Sorry, we need media library permissions to make this work!");
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: false,
      quality: 1,
      allowsMultipleSelection: false,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const filename = asset.uri.split("/").pop()?.toLowerCase() || "image.jpg";
      setSelectedMedia({
        uri: asset.uri,
        name: filename,
        type: asset.type === "video" ? "video/mp4" : "image/jpeg",
        size: asset.fileSize,
      });
      setIsPreviewVisible(true);
    }
    attachmentSheetRef.current?.close();
  };

  const handleSendMedia = async () => {
    try {
      setIsUploading(true);
      const mediaToUpload = selectedMedia || selectedFile;

      if (!mediaToUpload) return;

      // Get pre-signed URL with explicit image/jpeg type for images
      const presignedUrls = await getPresignedURLs([
        {
          filename: mediaToUpload.name
            .split("/")
            .pop()!
            .replace(/^file:\/\//, "")
            .toLowerCase(),
          type: selectedMedia ? "image/jpeg" : mediaToUpload.type,
        },
      ]);


      // Upload to S3
      await uploadToS3(presignedUrls[0], mediaToUpload.uri);

      // Remove query parameters from S3 URL
      const s3Url = presignedUrls[0].split("?")[0];

      // Create message content with metadata
      const messageContent = {
        type: selectedMedia ? "image" : "file",
        url: s3Url,
        filename: mediaToUpload.name,
        content_type: selectedMedia ? "image/jpeg" : mediaToUpload.type,
      };

      // Send message
      socketSendMessage(
        JSON.stringify(messageContent),
        participantDetails.userId,
        userDetails?.username!,
        {
          data: s3Url,
          filename: mediaToUpload.name,
          content_type: selectedMedia ? "image/jpeg" : mediaToUpload.type,
        }
      );

      // Also send through Firebase for persistence
      sendMessage(JSON.stringify(messageContent), conversationId);

      setSelectedMedia(null);
      setSelectedFile(null);
      setIsPreviewVisible(false);
    } catch (error) {
      console.error("Error uploading and sending media:", error);
      alert("Failed to send media. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  return (
    <View
      className={`flex-row items-center px-4 py-2 ${isDarkMode ? "bg-black" : "bg-white"
        } justify-evenly`}
    >
      {/* Input */}
      <View
        className={`border p-1 ${isDarkMode
          ? "bg-[#0F0F0F] border-[#292929]"
          : "bg-white border-[#e6e6e6]"
          } flex flex-row items-center flex-1 rounded-full`}
        style={{ minHeight: 44 }}
      >
        <StyledInput
          className={`flex-1 ${isDarkMode ? "bg-[#0F0F0F] text-white " : "bg-white text-black "
            } rounded-full px-4`}
          placeholder="Type something..."
          value={message}
          multiline
          placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
          onChangeText={handleMessageChange}
          style={{
            textAlignVertical: "center",
            height: inputHeight,
            maxHeight: 100,
          }}
          editable={!isBlocked}
          onContentSizeChange={(event) => {
            const { height } = event.nativeEvent.contentSize;
            setInputHeight((currentHeight) => {
              const nextHeight = Math.min(Math.max(44, height), 100);
              return currentHeight === nextHeight ? currentHeight : nextHeight;
            });
          }}
        />
        <TouchableOpacity
          className="mx-2"
          disabled={isBlocked}
          onPress={handleOpenAttachmentSheet}
        >
          <PaperClipIcon
            size={20}
            color={isDarkMode ? "#FFFFFF80" : "#00000080"}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onMakeOfferPress}
          className="mx-2"
          disabled={isBlocked}
        >
          <PercentageIcon size={20} color={isDarkMode ? "#FFFFFF80" : "#00000080"}
          />
        </TouchableOpacity>
      </View>

      {/* Send */}
      <View className="">
        <StyledTO
          className={`ml-2 p-3 ${isBlocked || !message.trim() ? "bg-transparent" : "bg-[#635BE8]"
            } rounded-full`}
          disabled={isBlocked || !message.trim()}
          onPress={handleSend}
        >
          <PaperAirplaneIcon
            size={22}
            color={
              !isBlocked && message.trim()
                ? "white"
                : isDarkMode
                  ? "#FFFFFF80"
                  : "#00000080"
            }
          />
        </StyledTO>
      </View>

      <AttachmentSheet
        bottomSheetModalRef={attachmentSheetRef}
        isDarkMode={isDarkMode}
        onClose={() => attachmentSheetRef.current?.close()}
        onSelectDocuments={handleSelectDocuments}
        onSelectImagesVideos={handleSelectImagesVideos}
      />

      {/* Preview Modal */}
      <Modal
        visible={isPreviewVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setIsPreviewVisible(false);
          setSelectedMedia(null);
          setSelectedFile(null);
        }}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
          }}
        >
          <View
            style={{
              width: "90%",
              backgroundColor: isDarkMode ? "#1F1F1F" : "#fff",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: isDarkMode ? "#333" : "#e5e5e5",
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: isDarkMode ? "#fff" : "#000",
                }}
              >
                Preview
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setIsPreviewVisible(false);
                  setSelectedMedia(null);
                  setSelectedFile(null);
                }}
              >
                <XMarkIcon
                  size={24}
                  color={isDarkMode ? "#fff" : "#000"}
                />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <View style={{ padding: 16 }}>
              {selectedMedia ? (
                <View>
                  <Image
                    source={{ uri: selectedMedia.uri }}
                    style={{
                      width: "100%",
                      height: 300,
                      borderRadius: 8,
                      backgroundColor: isDarkMode ? "#333" : "#f5f5f5",
                    }}
                    resizeMode="contain"
                  />
                  <Text
                    style={{
                      marginTop: 8,
                      color: isDarkMode ? "#999" : "#666",
                      fontSize: 14,
                    }}
                  >
                    {selectedMedia.name} • {formatFileSize(selectedMedia.size)}
                  </Text>
                </View>
              ) : selectedFile ? (
                <View
                  style={{
                    padding: 16,
                    backgroundColor: isDarkMode ? "#333" : "#f5f5f5",
                    borderRadius: 8,
                  }}
                >
                  <Text
                    style={{
                      color: isDarkMode ? "#fff" : "#000",
                      fontSize: 16,
                      marginBottom: 4,
                    }}
                  >
                    {selectedFile.name}
                  </Text>
                  <Text
                    style={{
                      color: isDarkMode ? "#999" : "#666",
                      fontSize: 14,
                    }}
                  >
                    {formatFileSize(selectedFile.size)}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Footer */}
            <View
              style={{
                padding: 16,
                borderTopWidth: 1,
                borderTopColor: isDarkMode ? "#333" : "#e5e5e5",
              }}
            >
              <TouchableOpacity
                onPress={handleSendMedia}
                disabled={isUploading}
                style={{
                  backgroundColor: "#635BE8",
                  padding: 12,
                  borderRadius: 8,
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center",
                }}
              >
                {isUploading ? (
                  <ActivityIndicator
                    color="#fff"
                    style={{ marginRight: 8 }}
                  />
                ) : null}
                <Text
                  style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}
                >
                  {isUploading ? "Sending..." : "Send"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
