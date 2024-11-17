import { useChat } from "@/backend/chat";
import { useGlobalContext } from "@/context/global-context";
import { styled } from "nativewind";
import React from "react";
import { TextInput, TouchableOpacity, View } from "react-native";
import {
  CurrencyRupeeIcon,
  PaperClipIcon,
} from "react-native-heroicons/outline";
import { PaperAirplaneIcon } from "react-native-heroicons/solid";

const StyledInput = styled(TextInput);
const StyledTO = styled(TouchableOpacity);

interface Props {
  onMakeOfferPress: () => void;
  isBlocked: boolean;
  conversationId: string;
}

export function ChatInput({
  onMakeOfferPress,
  isBlocked,
  conversationId,
}: Props) {
  const [message, setMessage] = React.useState("");
  const { theme } = useGlobalContext();
  const isDarkMode = theme === "dark";

  const { sendMessage } = useChat();

  const handleSend = () => {
    if (message.trim()) {
      sendMessage(message, conversationId);
      setMessage("");
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
          onChangeText={setMessage}
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
        <TouchableOpacity className="mx-2" disabled={isBlocked}>
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
    </View>
  );
}
