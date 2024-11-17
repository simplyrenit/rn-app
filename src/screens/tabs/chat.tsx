import { useChat } from "@/backend/chat";
import { ChatCard } from "@/components/chat/chat-card";
import { StaticContainer, Text } from "@/components/core";
import ProfilePreAuth from "@/components/profile/pre-auth/profile-pre-auth";
import { useGlobalContext } from "@/context/global-context";
import { Conversation } from "@/lib/types";
import { useFocusEffect } from "@react-navigation/native";
import { styled } from "nativewind";
import React from "react";
import { FlatList, StyleSheet, TextInput, View } from "react-native";
import { MagnifyingGlassIcon } from "react-native-heroicons/outline";

const StyledInput = styled(TextInput);

export default function Chat() {
  const [searchTerm, setSearchTerm] = React.useState("");
  const { theme, authTokens, isAuthenticated, userDetails } =
    useGlobalContext();
  const [conversations, setConversations] = React.useState<Conversation[]>([]);

  const isDark = theme === "dark";

  const { subscribeToChats, deleteChat } = useChat();

  useFocusEffect(
    React.useCallback(() => {
      if (authTokens && isAuthenticated) {
        const unsubscribe = subscribeToChats(
          userDetails?.username!,
          (chats: Conversation[]) => {
            setConversations(chats);
          }
        );
        return unsubscribe;
      }
    }, [userDetails?.username, authTokens, isAuthenticated])
  );

  const getChatPartnerName = (conversation: Conversation) => {
    const chatPartner = conversation.initialParticipants.find(
      (participant) => participant.userId !== userDetails?.username
    );
    return chatPartner ? chatPartner.username : "Unknown";
  };

  const filteredConversations = conversations
    .map((conversation) => ({
      ...conversation,
      name: getChatPartnerName(conversation),
    }))
    .filter((conversation) =>
      conversation.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort(
      (a, b) =>
        new Date(b.lastMessageTime || 0).getTime() -
        new Date(a.lastMessageTime || 0).getTime()
    );

  if (!authTokens || !isAuthenticated) {
    return (
      <StaticContainer width={100}>
        <View className="mt-4 w-full flex-1">
          <Text
            fontSize="text-2xl"
            fontWeight="font-bold"
            className="mb-4 px-4"
          >
            Chat
          </Text>
          <ProfilePreAuth isDarkMode={isDark} />
        </View>
      </StaticContainer>
    );
  }

  return (
    <StaticContainer width={100}>
      <View className="px-4 pb-4 mt-4 w-full">
        <Text fontSize="text-2xl" fontWeight="font-bold">
          Chat
        </Text>

        <View
          style={styles.Shadow}
          className={`border mt-6 mb-4 flex flex-row items-center h-12 rounded-xl p-2 ${
            isDark
              ? "bg-[#0F0F0F] border-[#292929]"
              : "bg-white border-[#E6E6E6]"
          }`}
        >
          <MagnifyingGlassIcon color="gray" size={24} />
          <StyledInput
            className={`ml-2 w-4/5 h-12 text-black ${
              isDark ? "text-white" : "text-black"
            }`}
            placeholder="Search chat"
            placeholderTextColor={isDark ? "#ffffff80" : "#00000080"}
            autoCapitalize={"none"}
            autoCorrect={false}
            onChangeText={setSearchTerm}
            style={{ fontSize: 16 }}
          />
        </View>

        {filteredConversations.length > 0 ? (
          <FlatList
            data={filteredConversations}
            keyExtractor={(item) => item.id!}
            renderItem={({ item }) => {
              return (
                <ChatCard
                  isRead={
                    item.readStatus.filter(
                      (item) => item.userId === userDetails?.username
                    )[0].isRead || false
                  }
                  id={item.id!}
                  name={item.name}
                  lastMessage={item.lastMessage || ""}
                  unreadCount={
                    item.readCount.filter(
                      (item) => item.userId === userDetails?.username
                    )[0].count || 0
                  }
                  lastMessageTime={item.lastMessageTime || ""}
                  profilePic={
                    item.initialParticipants.find(
                      (p) => p.userId !== userDetails?.username
                    )?.profilePicture || ""
                  }
                  onDeleteChat={(id) => {
                    deleteChat(id);
                  }}
                />
              );
            }}
            showsVerticalScrollIndicator={false}
            style={{ height: "80%" }}
          />
        ) : (
          <View className="items-center justify-center">
            <Text>No messages found</Text>
          </View>
        )}
      </View>
    </StaticContainer>
  );
}

const styles = StyleSheet.create({
  Shadow: {
    shadowColor: "#808080",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
