import { useChat } from "@/backend/chat";
import { ChatCard } from "@/components/chat/chat-card";
import { StaticContainer, Text } from "@/components/core";
import ProfilePreAuth from "@/components/profile/pre-auth/profile-pre-auth";
import { useGlobalContext } from "@/context/global-context";
import { Conversation } from "@/lib/types";
import { useFocusEffect } from "@react-navigation/native";
import { styled } from "nativewind";
import React from "react";
import { FlatList, View } from "react-native";
import { TextInput } from "react-native-gesture-handler";
import { MagnifyingGlassIcon } from "react-native-heroicons/outline";
import { StyleSheet } from "react-native";

const StyledInput = styled(TextInput);

export default function Chat() {
  const { theme, authTokens, isAuthenticated, userDetails } =
    useGlobalContext();
  const [conversations, setConversations] = React.useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const isDark = theme === "dark";
  const { subscribeToChats, deleteChat } = useChat();

  // Add a ref to track mounted state
  const isMounted = React.useRef(true);

  React.useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      let isSubscribed = true;
      let unsubscribe: (() => void) | undefined;

      console.log("[Chat] Starting subscription setup");

      if (authTokens && isAuthenticated) {
        console.log("[Chat] Initiating subscription");
        unsubscribe = subscribeToChats(
          userDetails?.username!,
          (chats: Conversation[]) => {
            if (!isSubscribed) return;
            console.log("[Chat] Received update:", chats.length, "chats");
            setConversations(chats);
            setIsLoading(false);
          }
        );
      }

      return () => {
        console.log("[Chat] Effect cleanup");
        isSubscribed = false;
        if (unsubscribe) {
          unsubscribe();
        }
      };
    }, [authTokens, isAuthenticated, userDetails?.username])
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
        <Text
          fontSize="text-2xl"
          fontWeight="font-bold"
        >
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
          <MagnifyingGlassIcon
            color="gray"
            size={24}
          />
          <StyledInput
            className={`ml-2 w-4/5 text-black ${
              isDark ? "text-white" : "text-black"
            }`}
            placeholder="Search chat"
            placeholderTextColor={isDark ? "#ffffff80" : "#00000080"}
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={() => {}}
            style={{ fontSize: 16 }}
          />
        </View>

        {isLoading ? (
          <View className="items-center justify-center flex-1">
            <Text>Loading chats...</Text>
          </View>
        ) : (
          <FlatList
            data={conversations}
            renderItem={({ item }) => (
              <ChatCard
                isRead={
                  item.readStatus.find(
                    (status) => status.userId === userDetails?.username
                  )?.isRead || false
                }
                id={item.id}
                name={
                  item.initialParticipants.find(
                    (p) => p.userId !== userDetails?.username
                  )?.username || "Unknown"
                }
                lastMessage={item.lastMessage || ""}
                unreadCount={
                  item.readCount.find(
                    (count) => count.userId === userDetails?.username
                  )?.count || 0
                }
                lastMessageTime={item.lastMessageTime || ""}
                profilePic={
                  item.initialParticipants.find(
                    (p) => p.userId !== userDetails?.username
                  )?.profilePicture || ""
                }
                onDeleteChat={deleteChat}
              />
            )}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            style={{ height: "80%" }}
          />
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
