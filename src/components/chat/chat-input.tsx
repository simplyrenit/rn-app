
import { useChat } from "@/backend/chat";
import AttachmentSheet from "@/components/chat/attachment-sheet";
import { useGlobalContext } from "@/context/global-context";
import { TagIcon } from "react-native-heroicons/outline";
import { GENERATE_SIGNED_URLS } from "@/lib/config";
import axiosInstance from "@/lib/networkUtils";
import axios from "axios";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
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
import { IconButton } from "@/components/core/icon-button";
import { MIN_TOUCH_TARGET, SCREEN_GUTTER, fontFamily, radius, ink, colors } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { commitFeedback } from "@/lib/haptics";
import { toast } from "@/lib/toast";

const StyledInput = styled(TextInput);
const StyledTO = styled(TouchableOpacity);

interface Props {
  onMakeOfferPress: () => void;
  isBlocked: boolean;
  conversationId: string;
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
}: Props) {
  const [message, setMessage] = React.useState("");
  const [inputHeight, setInputHeight] = useState(44);
  const [selectedFile, setSelectedFile] = useState<MediaPreview | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<MediaPreview | null>(null);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { theme, authTokens } = useGlobalContext();
  const isDarkMode = theme === "dark";
  const { color } = useTheme();

  const { sendMessage } = useChat();

  React.useEffect(() => {
    if (!message) {
      setInputHeight(44);
    }
  }, [message]);

  const attachmentSheetRef = useRef<any>(null);

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

  const handleSend = async () => {
    commitFeedback();
    const trimmedMessage = message.trim();

    if (trimmedMessage) {
      try {
        await sendMessage(trimmedMessage, conversationId);
        setMessage("");
      } catch {
        toast.error("Could not send that message. Please try again.");
      }
    }
  };

  const handleMessageChange = (text: string) => setMessage(text);

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
      toast.error("Could not attach that file. Please try again.");
    }
  };

  const handleSelectImagesVideos = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      toast.error("Photo library access is needed to choose an image");
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

      await sendMessage(JSON.stringify(messageContent), conversationId);

      setSelectedMedia(null);
      setSelectedFile(null);
      setIsPreviewVisible(false);
    } catch (error) {
      console.error("Error uploading and sending media:", error);
      toast.error("Couldn’t send that attachment", {
        message: "Check your connection and try again.",
      });
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
      // Symmetric gutters. The field used to sit 18pt from the left while the
      // send button sat 29pt from the right, with 20pt of internal padding on
      // one side of the field and 10pt on the other.
      style={{
        flexDirection: "row",
        alignItems: "flex-end",
        gap: 8,
        paddingHorizontal: SCREEN_GUTTER,
        paddingTop: 8,
        paddingBottom: 8,
        borderTopWidth: 1,
        borderTopColor: color.line,
        backgroundColor: color.surface,
      }}
    >
      {/* Input */}
      <View
        style={{
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          minHeight: MIN_TOUCH_TARGET,
          paddingLeft: 4,
          paddingRight: 4,
          borderRadius: radius.full,
          borderWidth: 1,
          borderColor: color.inputLine,
          backgroundColor: color.canvas,
        }}
      >
        <StyledInput
          placeholder="Message"
          value={message}
          multiline
          placeholderTextColor={color.placeholder}
          accessibilityLabel="Message"
          onChangeText={handleMessageChange}
          style={{
            flex: 1,
            paddingHorizontal: 12,
            textAlignVertical: "center",
            height: inputHeight,
            maxHeight: 100,
            color: color.text,
            fontFamily: fontFamily.regular,
            fontSize: 16,
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
        <IconButton
          size={36}
          disabled={isBlocked}
          onPress={handleOpenAttachmentSheet}
          accessibilityLabel="Attach a photo or file"
        >
          <PaperClipIcon size={20} color={color.textBody} />
        </IconButton>

        <IconButton
          size={36}
          disabled={isBlocked}
          onPress={onMakeOfferPress}
          // The control was an unlabelled percent-in-a-badge glyph that nobody
          // was going to decode. VoiceOver now says what it does.
          accessibilityLabel="Make an offer"
          accessibilityHint="Propose dates and a price for this item"
        >
          <TagIcon size={20} color={color.textBody} />
        </IconButton>
      </View>

      {/* Send. The brand colour finally appears on the app's most-used action;
          it was grey in every state, and the only solid glyph beside two
          outline ones. */}
      <IconButton
        size={MIN_TOUCH_TARGET}
        disabled={isBlocked || !message.trim()}
        onPress={handleSend}
        accessibilityLabel="Send message"
        style={{
          backgroundColor:
            isBlocked || !message.trim() ? color.surfaceRaised : color.brand,
        }}
      >
        <PaperAirplaneIcon
          size={20}
          color={!isBlocked && message.trim() ? "#FFFFFF" : color.textDim}
        />
      </IconButton>

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
              backgroundColor: color.surface,
              borderRadius: radius.card,
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
                borderBottomColor: ink.line(isDarkMode),
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: ink.text(isDarkMode),
                }}
              >
                Preview
              </Text>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close"
                onPress={() => {
                  setIsPreviewVisible(false);
                  setSelectedMedia(null);
                  setSelectedFile(null);
                }}
              >
                <XMarkIcon
                  size={24}
                  color={ink.text(isDarkMode)}
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
                      borderRadius: radius.button,
                      backgroundColor: ink.surfaceRaised(isDarkMode),
                    }}
                    resizeMode="contain"
                  />
                  <Text
                    style={{
                      marginTop: 8,
                      color: ink.body(isDarkMode),
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
                    backgroundColor: ink.surfaceRaised(isDarkMode),
                    borderRadius: radius.button,
                  }}
                >
                  <Text
                    style={{
                      color: ink.text(isDarkMode),
                      fontSize: 16,
                      marginBottom: 4,
                    }}
                  >
                    {selectedFile.name}
                  </Text>
                  <Text
                    style={{
                      color: ink.body(isDarkMode),
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
                borderTopColor: ink.line(isDarkMode),
              }}
            >
              <TouchableOpacity
                onPress={handleSendMedia}
                disabled={isUploading}
                style={{
                  backgroundColor: colors.dark.brand,
                  padding: 12,
                  borderRadius: radius.button,
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center",
                }}
              >
                {isUploading ? (
                  <ActivityIndicator
                    color="#FFFFFF"
                    style={{ marginRight: 8 }}
                  />
                ) : null}
                <Text
                  style={{ color: "#FFFFFF", fontSize: 16, fontFamily: fontFamily.semibold }}
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
