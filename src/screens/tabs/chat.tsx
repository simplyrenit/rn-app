import { useChat } from "@/backend/chat";
import { ChatCard } from "@/components/chat/chat-card";
import { EmptyState, StaticContainer, Text } from "@/components/core";
import Skeleton from "@/components/core/skeleton";
import ProfilePreAuth from "@/components/profile/pre-auth/profile-pre-auth";
import { useGlobalContext } from "@/context/global-context";
import { MIN_TOUCH_TARGET, SCREEN_GUTTER, radius } from "@/lib/design-tokens";
import { fontFamily } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { Conversation, useTypedNavigation } from "@/lib/types";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";
import React from "react";
import { FlatList, TextInput, View } from "react-native";
import {
  ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon,
} from "react-native-heroicons/outline";

export default function Chat() {
  const tabBarHeight = useBottomTabBarHeight();
  const { authTokens, isAuthenticated, userDetails } = useGlobalContext();
  const [conversations, setConversations] = React.useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [query, setQuery] = React.useState("");
  const { color, isDark, shadow } = useTheme();
  const navigation = useTypedNavigation();

  const { subscribeToChats, deleteChat } = useChat();

  useFocusEffect(
    React.useCallback(() => {
      let isSubscribed = true;
      let unsubscribe: (() => void) | undefined;

      if (authTokens && isAuthenticated) {
        unsubscribe = subscribeToChats((chats: Conversation[]) => {
          if (!isSubscribed) return;
          setConversations(chats);
          setIsLoading(false);
        });
      }

      return () => {
        isSubscribed = false;
        if (unsubscribe) {
          unsubscribe();
        }
      };
    }, [authTokens, isAuthenticated, userDetails?.firebase_uid])
  );

  const heading = (
    <Text accessibilityRole="header" fontSize="text-2xl" fontWeight="font-bold">
      Chat
    </Text>
  );

  if (!authTokens || !isAuthenticated) {
    return (
      <StaticContainer width={100}>
        <View style={{ flex: 1, marginTop: 16 }}>
          <View style={{ paddingHorizontal: SCREEN_GUTTER, marginBottom: 16 }}>
            {heading}
          </View>
          <ProfilePreAuth isDarkMode={isDark} />
        </View>
      </StaticContainer>
    );
  }

  const nameOf = (conversation: Conversation) =>
    conversation.initialParticipants.find(
      (participant) => participant.userId !== userDetails?.username
    )?.username ?? "";

  const filtered = query.trim()
    ? conversations.filter((conversation) =>
        `${nameOf(conversation)} ${conversation.lastMessage ?? ""}`
          .toLowerCase()
          .includes(query.trim().toLowerCase())
      )
    : conversations;

  return (
    <StaticContainer width={100}>
      <View style={{ flex: 1, marginTop: 16 }}>
        <View style={{ paddingHorizontal: SCREEN_GUTTER, gap: 16 }}>
          {heading}

          <View
            style={[
              {
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                height: MIN_TOUCH_TARGET,
                paddingHorizontal: 12,
                borderRadius: radius.input,
                borderWidth: 1,
                borderColor: color.inputLine,
                backgroundColor: color.surface,
              },
              shadow,
            ]}
          >
            <MagnifyingGlassIcon size={18} color={color.textBody} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search conversations"
              placeholderTextColor={color.placeholder}
              accessibilityLabel="Search conversations"
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
              // The field used to set fontSize but never fontFamily, so it
              // rendered in system SF Pro while the rest of the app did not.
              style={{
                flex: 1,
                fontSize: 16,
                fontFamily: fontFamily.regular,
                color: color.text,
              }}
            />
          </View>
        </View>

        {isLoading ? (
          <FlatList
            data={Array.from({ length: 6 })}
            keyExtractor={(_, index) => `skeleton-${index}`}
            contentContainerStyle={{ paddingTop: 16 }}
            renderItem={() => (
              <View
                style={{
                  flexDirection: "row",
                  gap: 12,
                  paddingVertical: 12,
                  paddingHorizontal: SCREEN_GUTTER,
                }}
              >
                <Skeleton height={48} width={48} borderRadius={radius.full} />
                <View style={{ flex: 1, gap: 8, justifyContent: "center" }}>
                  <Skeleton width="60%" height={14} borderRadius={4} />
                  <Skeleton width="85%" height={12} borderRadius={4} />
                </View>
              </View>
            )}
          />
        ) : (
          <FlatList
            data={filtered}
            // Measured tab bar height, so the last conversation is not hidden
            // behind the bar. Differs between iOS and Android.
            contentContainerStyle={{
              paddingTop: 8,
              paddingBottom: tabBarHeight,
              flexGrow: filtered.length ? 0 : 1,
              justifyContent: filtered.length ? "flex-start" : "center",
            }}
            ItemSeparatorComponent={() => (
              // Inset separators between rows, iOS convention. Six-item lists
              // used to read as floating text.
              <View
                style={{
                  height: 1,
                  marginLeft: SCREEN_GUTTER + 60,
                  backgroundColor: color.line,
                }}
              />
            )}
            ListEmptyComponent={
              query.trim() ? (
                <EmptyState
                  title="No conversations match that"
                  body="Try a different name or word from a message."
                />
              ) : (
                <EmptyState
                  icon={
                    <ChatBubbleLeftRightIcon size={26} color={color.brandText} />
                  }
                  title="No conversations yet"
                  body="Message an owner from any listing and the conversation will appear here."
                  actionLabel="Browse listings"
                  onAction={() => navigation.navigate("MainTabs")}
                />
              )
            }
            renderItem={({ item }) =>
              item.id ? (
                <ChatCard
                  isRead={
                    item.readStatus.find(
                      (status) => status.userId === userDetails?.username
                    )?.isRead || false
                  }
                  id={item.id}
                  name={nameOf(item)}
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
              ) : null
            }
            keyExtractor={(item, index) => item.id ?? `conversation-${index}`}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </StaticContainer>
  );
}
