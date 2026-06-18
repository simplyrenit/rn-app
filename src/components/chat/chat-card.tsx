import React, { useState } from "react";
import { TouchableOpacity, View, Image, Modal, Platform } from "react-native";
import { Text } from "@/components/core";
import { styled } from "nativewind";
import { Swipeable } from "react-native-gesture-handler";
import { useTypedNavigation } from "@/lib/types";
import { useGlobalContext } from "@/context/global-context";
import {
  DocumentIcon,
  TrashIcon,
  PhotoIcon,
  UserCircleIcon,
} from "react-native-heroicons/outline";

interface Props {
  id: string;
  name: string;
  lastMessage: string;
  isRead: boolean;
  unreadCount: number;
  lastMessageTime: string;
  profilePic: string;
  onDeleteChat: (id: string) => void;
}

const StyledView = styled(View);

export function ChatCard({
  id,
  name,
  lastMessage,
  unreadCount,
  isRead,
  lastMessageTime,
  profilePic,
  onDeleteChat,
}: Props) {
  const [modalVisible, setModalVisible] = useState(false);
  const router = useTypedNavigation();
  const { theme } = useGlobalContext();
  const isDark = theme === "dark";

  const onPress = () => {
    router.navigate("ChatDetails", { id });
  };

  const renderRightActions = () => (
    <TouchableOpacity
      className="bg-red-500 justify-center items-center w-24 rounded-lg ml-4"
      onPress={() => setModalVisible(true)}
    >
      <TrashIcon
        size={24}
        color={"white"}
      />
    </TouchableOpacity>
  );

  const handleDelete = () => {
    onDeleteChat(id);
    setModalVisible(false);
  };

  let parsedMessage;
  try {
    parsedMessage = JSON.parse(lastMessage);
  } catch (e) {
    parsedMessage = lastMessage;
  }

  return (
    <>
      <Swipeable renderRightActions={renderRightActions}>
        <TouchableOpacity
          onPress={onPress}
          className={`flex-row items-center justify-between py-3 ${
            isDark ? "bg-black" : "bg-white"
          } rounded-lg`}
        >
          {profilePic ? (
            <Image
              source={{ uri: profilePic }}
              className="h-12 w-12 rounded-full"
              resizeMode="cover"
            />
          ) : (
            <UserCircleIcon
              size={48}
              color={"#635BE8"}
            />
          )}

          <StyledView className="flex-1 ml-3">
            <Text
              fontSize="text-base"
              fontWeight="font-bold"
            >
              {name}
            </Text>
            {typeof parsedMessage === "object" &&
            parsedMessage.type === "image" ? (
              <View className="flex-row items-center mt-1">
                <PhotoIcon
                  size={16}
                  color={isDark ? "#ffffff80" : "#00000080"}
                />
                <Text
                  fontSize="text-sm"
                  className={`ml-1 ${
                    isDark ? "text-[#ffffff80]" : "text-[#00000080]"
                  }`}
                  numberOfLines={1}
                >
                  Image
                </Text>
              </View>
            ) : typeof parsedMessage === "object" &&
              parsedMessage.type === "file" ? (
              <View className="flex-row items-center mt-1">
                <DocumentIcon
                  size={16}
                  color={isDark ? "#ffffff80" : "#00000080"}
                />
                <Text
                  fontSize="text-sm"
                  className={`ml-1 ${
                    isDark ? "text-[#ffffff80]" : "text-[#00000080]"
                  }`}
                  numberOfLines={1}
                >
                  File
                </Text>
              </View>
            ) : (
              <Text
                fontSize="text-sm"
                className={`mt-1 ${
                  isDark ? "text-[#ffffff80]" : "text-[#00000080]"
                }`}
                numberOfLines={1}
              >
                {lastMessage}
              </Text>
            )}
          </StyledView>

          <StyledView className="items-end mr-2">
            <Text
              fontSize="text-xs"
              className="text-gray-400"
            >
              {(() => {
                const messageDate = new Date(lastMessageTime);
                const now = new Date();
                const diffInHours =
                  (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);

                if (diffInHours > 24) {
                  return `${messageDate.toLocaleDateString()} ${messageDate.toLocaleTimeString(
                    [],
                    { hour: "2-digit", minute: "2-digit" }
                  )}`;
                } else {
                  return messageDate.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                }
              })()}
            </Text>
            {!isRead && unreadCount > 0 ? (
              <View className="bg-[#635BE8] rounded-full h-6 w-6 flex items-center justify-center mt-1">
                <Text
                  fontSize="text-sm"
                  fontWeight="font-bold"
                  className="text-white"
                >
                  {unreadCount}
                </Text>
              </View>
            ) : null}
          </StyledView>
        </TouchableOpacity>
      </Swipeable>

      <Modal
        transparent={true}
        visible={modalVisible}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/70 bg-opacity-50">
          <View className="bg-white rounded-lg p-6 w-4/5 items-center">
            <Text
              fontSize="text-xl"
              fontWeight="font-bold"
              className="mb-4 text-black"
            >
              Delete Chat?
            </Text>
            <Text
              fontSize="text-sm"
              className="text-gray-500 text-center mb-6"
            >
              Are you sure you want to delete this chat?
            </Text>
            <View className="flex-row w-full justify-between">
              <TouchableOpacity
                className="bg-gray-200 py-2 px-4 rounded-lg flex-1 mr-2 items-center"
                onPress={() => setModalVisible(false)}
              >
                <Text
                  fontSize="text-base"
                  className="text-black"
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="bg-red-500 py-2 px-4 rounded-lg flex-1 ml-2 items-center"
                onPress={handleDelete}
              >
                <Text
                  fontSize="text-base"
                  fontWeight="font-bold"
                  className="text-white"
                >
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
