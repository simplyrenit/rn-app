import { useChat } from "@/backend/chat";
import { useGlobalContext } from "@/context/global-context";
import { styled } from "nativewind";
import React, { useRef, useState } from "react";
import {
  Modal,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  Text,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import {
  CurrencyRupeeIcon,
  PaperClipIcon,
} from "react-native-heroicons/outline";
import { PaperAirplaneIcon } from "react-native-heroicons/solid";
import AttachmentSheet from "@/components/chat/attachment-sheet";
import { useSocket } from "@/services/socket";
import { debounce } from "lodash";

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

export function ChatInput({
  onMakeOfferPress,
  isBlocked,
  conversationId,
  participantDetails,
}: Props) {
  const [message, setMessage] = React.useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const { theme, userDetails } = useGlobalContext();
  const isDarkMode = theme === "dark";

  const { sendMessage } = useChat();
  const { sendMessage: socketSendMessage, emitTyping } = useSocket();

  // Create a debounced version of emitTyping
  const debouncedEmitTyping = useRef(
    debounce((isTyping: boolean) => {
      emitTyping(conversationId, isTyping);
    }, 300)
  ).current;

  const attachmentSheetRef = useRef(null);

  const handleSend = () => {
    if (message.trim()) {
      // Send message through socket
      socketSendMessage(
        message.trim(),
        participantDetails.userId,
        userDetails?.username!
      );

      // Also send through Firebase for persistence
      sendMessage(message, conversationId);

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
    const result = await DocumentPicker.getDocumentAsync({});
    console.log(result, "result");
    if (result.assets.length > 0) {
      const fileUri = result.assets[0].uri;
      const response = await fetch(fileUri);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result;
        console.log(base64data, "base64data");
        setSelectedFile(base64data);
        setIsPreviewVisible(true);
      };
      reader.readAsDataURL(blob);
    }
    attachmentSheetRef.current?.close();
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

    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result;
        setSelectedMedia(base64data);
        setIsPreviewVisible(true);
      };
      reader.readAsDataURL(blob);
    }
    attachmentSheetRef.current?.close();
  };

  const handleSendMedia = () => {
    if (selectedMedia) {
      // Send media through socket
      socketSendMessage(
        "Sent an image",
        participantDetails.userId,
        userDetails?.username!,
        {
          data: selectedMedia,
          filename: "image.jpg", // You might want to get the actual filename
          content_type: "image/jpeg",
        }
      );

      // Also send through Firebase for persistence
      sendMessage(selectedMedia, conversationId);
      setSelectedMedia(null);
      setIsPreviewVisible(false);
    }
    if (selectedFile) {
      // Send file through socket
      socketSendMessage(
        "Sent a file",
        participantDetails.userId,
        userDetails?.username!,
        {
          data: selectedFile,
          filename: "document.pdf", // You might want to get the actual filename
          content_type: "application/pdf",
        }
      );

      // Also send through Firebase for persistence
      sendMessage(selectedFile, conversationId);
      setSelectedFile(null);
      setIsPreviewVisible(false);
    }
  };

  return (
    <View
      className={`flex-row items-center px-4 py-2 ${
        isDarkMode ? "bg-black" : "bg-white"
      } justify-evenly`}
    >
      {/* Input */}
      <View
        className={`border p-1 ${
          isDarkMode
            ? "bg-[#0F0F0F] border-[#292929]"
            : "bg-white border-[#e6e6e6]"
        } flex flex-row items-center flex-1 rounded-full`}
        style={{ minHeight: 44 }}
      >
        <StyledInput
          className={`flex-1 ${
            isDarkMode ? "bg-[#0F0F0F] text-white " : "bg-white text-black "
          } rounded-full px-4`}
          placeholder="Type something..."
          value={message}
          multiline
          placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
          onChangeText={handleMessageChange}
          style={{
            textAlignVertical: "center",
            minHeight: 44,
            maxHeight: 100,
          }}
          editable={!isBlocked}
          onContentSizeChange={(event) => {
            const { height } = event.nativeEvent.contentSize;
            event.target.setNativeProps({
              height: Math.min(Math.max(40, height), 50),
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
          <CurrencyRupeeIcon
            size={20}
            color={isDarkMode ? "#FFFFFF80" : "#00000080"}
          />
        </TouchableOpacity>
      </View>

      {/* Send */}
      <View className="">
        <StyledTO
          className={`ml-2 p-3 ${
            isBlocked || !message.trim() ? "bg-transparent" : "bg-[#635BE8]"
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
        onRequestClose={() => setIsPreviewVisible(false)}
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
              width: "80%",
              backgroundColor: isDarkMode ? "#333" : "#fff",
              padding: 20,
              borderRadius: 10,
              alignItems: "center",
            }}
          >
            {selectedMedia ? (
              <Image
                source={{ uri: selectedMedia }}
                style={{ width: 200, height: 200, marginBottom: 20 }}
              />
            ) : (
              <Text
                style={{
                  fontSize: 18,
                  color: isDarkMode ? "#fff" : "#000",
                  marginBottom: 20,
                }}
              >
                Document Selected
              </Text>
            )}
            <TouchableOpacity
              onPress={handleSendMedia}
              style={{
                backgroundColor: "#635BE8",
                padding: 10,
                borderRadius: 5,
              }}
            >
              <Text style={{ color: "#fff" }}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
