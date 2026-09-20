import React from "react";
import moment from "moment";
import { useNotifications } from "@/backend/useNotification";
import { SubpageHeader, Text } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { useGlobalContext } from "@/context/global-context";
import { useTypedNavigation } from "@/lib/types";
import { ScrollView, View } from "react-native";
import { useEffect } from "react";
import { ink, radius, SCREEN_GUTTER } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { RefreshControl } from "react-native";
import { Avatar, EmptyState } from "@/components/core";
import { BellIcon } from "react-native-heroicons/outline";
import { colors } from "@/lib/design-tokens";

interface NotificationProps {}

const NotificationScreen: React.FC<NotificationProps> = () => {
  const { theme } = useGlobalContext();

  const isDarkMode = theme === "dark";
  const router = useTypedNavigation();

  const { notifications, getNotifications, markAllAsRead } = useNotifications();
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const { color } = useTheme();
  // Which ones were unread when the screen opened: opening marks them all read,
  // and the frame's brand dot is for exactly those.
  const [unreadOnOpen, setUnreadOnOpen] = React.useState<Set<string>>(new Set());

  const handleRefresh = React.useCallback(async () => {
    setIsRefreshing(true);
    try {
      await getNotifications();
    } finally {
      setIsRefreshing(false);
    }
  }, [getNotifications]);

  useEffect(() => {
    const bootstrapNotifications = async () => {
      const fetchedNotifications = await getNotifications();
      setUnreadOnOpen(
        new Set(
          fetchedNotifications
            .filter((notification) => !notification.is_read)
            .map((notification) => notification.id)
        )
      );

      if (fetchedNotifications.length > 0) {
        await markAllAsRead(fetchedNotifications);
      }
    };

    void bootstrapNotifications();
  }, [getNotifications, markAllAsRead]);

  return (
    <NonScrollableContainer>
      <SubpageHeader title="Notifications" />
      {/* The frame closes the header with a hairline. */}
      <View style={{ height: 1, backgroundColor: color.line }} />

      <ScrollView
        contentContainerStyle={
          notifications.length === 0 ? { flexGrow: 1, justifyContent: "center" } : undefined
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={ink.body(isDarkMode)}
            colors={[colors.dark.brand]}
          />
        }
      >
        {notifications.length === 0 ? (
          <EmptyState
            icon={<BellIcon size={26} color={ink.brandText(isDarkMode)} />}
            title="Nothing new"
            body="Replies, offers and booking updates will appear here."
          />
        ) : null}
        {notifications.map((notification) => (
          // The frame's row: 16 above and below on the 24 gutter, the 48pt
          // avatar 8 from the text, no rule between rows.
          <View
            key={notification.id}
            style={{
              flexDirection: "row",
              gap: 8,
              paddingVertical: 16,
              paddingHorizontal: SCREEN_GUTTER,
            }}
          >
            <Avatar
              uri={notification.user.image}
              name={notification.user.first_name}
              size={48}
            />
            <View style={{ flex: 1 }}>
              <Text numberOfLines={2}>
                <Text fontSize="text-md" fontWeight="font-bold">
                  {notification.user.first_name}{" "}
                </Text>
                <Text fontSize="text-sm" tone="body">
                  {notification.message}
                </Text>
              </Text>
              <Text fontSize="text-xs" tone="dim">
                {moment(notification.created_at).fromNow()}
              </Text>
            </View>
            {unreadOnOpen.has(notification.id) ? (
              <View
                accessibilityLabel="Unread"
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: radius.full,
                  backgroundColor: color.brand,
                  alignSelf: "center",
                }}
              />
            ) : null}
          </View>
        ))}
      </ScrollView>
    </NonScrollableContainer>
  );
};

export default NotificationScreen;
