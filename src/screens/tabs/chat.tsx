import { useChat } from "@/backend/chat";
import { ChatCard } from "@/components/chat/chat-card";
import { StaticContainer, Text } from "@/components/core";
import ProfilePreAuth from "@/components/profile/pre-auth/profile-pre-auth";
import { useGlobalContext } from "@/context/global-context";
import { Conversation } from "@/lib/types";
import { useFocusEffect } from "@react-navigation/native";
import { styled } from "nativewind";
import React from "react";
import { Dimensions, FlatList, View } from "react-native";
import { TextInput } from "react-native-gesture-handler";
import { MagnifyingGlassIcon } from "react-native-heroicons/outline";
import { StyleSheet } from "react-native";
import { firestore, app } from "@/lib/config";
import Skeleton from "@/components/core/skeleton";

const StyledInput = styled(TextInput);

export default function Chat() {
  const { theme, authTokens, isAuthenticated, userDetails } =
    useGlobalContext();
  const [conversations, setConversations] = React.useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [firebaseInitialized, setFirebaseInitialized] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  const isDark = theme === "dark";
  const { subscribeToChats, deleteChat } = useChat();

  // Add a ref to track mounted state
  const isMounted = React.useRef(true);

  React.useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  React.useEffect(() => {
    if (firestore) {
      setFirebaseInitialized(true);
    }
  }, [firestore]);

  useFocusEffect(
    React.useCallback(() => {
      let isSubscribed = true;
      let unsubscribe: (() => void) | undefined;

      if (!firebaseInitialized) {
        return;
      }
      if (authTokens && isAuthenticated) {
        unsubscribe = subscribeToChats(
          userDetails?.username!,
          (chats: Conversation[]) => {
            if (!isSubscribed) return;
            setConversations(chats);
            setIsLoading(false);
          }
        );
      }

      return () => {
        isSubscribed = false;
        if (unsubscribe) {
          unsubscribe();
        }
      };
    }, [
      authTokens,
      isAuthenticated,
      userDetails?.username,
      firebaseInitialized,
    ])
  );

  const filteredConversations = conversations.filter((item) => {
    const name = item.initialParticipants.find(
      (p) => p.userId !== userDetails?.username
    )?.username || "";
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

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

        {isLoading ? <View className="p-4 gap-4">
          <Skeleton height={16} width={16} />
          <Skeleton height={16} width={'80%'} />
        </View> : <View
          style={styles.Shadow}
          className={`border mt-6 mb-4 flex flex-row items-center h-12 rounded-xl p-2 ${isDark
            ? "bg-[#0F0F0F] border-[#292929]"
            : "bg-white border-[#E6E6E6]"
            }`}
        >
          <View className="w-[10%] h-full items-center justify-center">
          <MagnifyingGlassIcon
            color="gray"
            size={24}
          />
          </View>
          <StyledInput
            className={`ml-2 w-4/5 text-black ${isDark ? "text-white" : "text-black"
              }`}
            placeholder="Search chat"
            placeholderTextColor={isDark ? "#ffffff80" : "#00000080"}
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={(text) => setSearchQuery(text)}
            style={{ fontSize: 16 }}
          />
        </View>}

        {isLoading ? (
          <FlatList

            data={Array.from({ length: 5 })}
            renderItem={({ item, index }) => (<View className="gap-2 p-3" style={{ flexDirection: 'row' }}>
              <Skeleton height={50} width={50} borderRadius={50} />
              <View
                className="flex-1 gap-2"
              >
                <Skeleton width={'90%'} height={14} />
                <Skeleton width={'80%'} height={12} />
                <Skeleton width={'60%'} height={10} />
              </View>
            </View>)}
          />
        ) : (
          <FlatList
            data={filteredConversations}
            ListEmptyComponent={() => <View style={{ padding: 32, height: Dimensions.get('window').height * 0.6, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: 'rgba(165, 165, 165, 0.7)', fontSize: 18, fontWeight: '600' }}>
                No Chats
              </Text>
            </View>
            }
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
