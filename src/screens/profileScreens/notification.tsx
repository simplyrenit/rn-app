import React from "react";
import moment from "moment";
import { useNotifications } from "@/backend/useNotification";
import { Text } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { useGlobalContext } from "@/context/global-context";
import { useTypedNavigation } from "@/lib/types";
import { Image } from "expo-image";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { ArrowLeftIcon } from "react-native-heroicons/outline";
import { widthPercentageToDP as wp } from "react-native-responsive-screen";
import { useEffect } from "react";
import { ink } from "@/lib/design-tokens";
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

      if (fetchedNotifications.length > 0) {
        await markAllAsRead(fetchedNotifications);
      }
    };

    void bootstrapNotifications();
  }, [getNotifications, markAllAsRead]);

  return (
    <NonScrollableContainer>
      <View
        className={`flex-row items-center justify-between px-gutter border-b-[1px] ${
          isDarkMode ? "border-line-dark" : "border-line-light"
        }`}
        style={{ paddingVertical: wp("5%") }}
      >
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" className="w-[10%]" onPress={() => router.goBack()}>
          <ArrowLeftIcon size={24} color={ink.text(isDarkMode)} />
        </TouchableOpacity>
        <View className="items-center justify-center w-[80%]">
          <Text fontSize="text-xl" fontWeight="font-bold">
            Notifications
          </Text>
        </View>
        <View className="w-[10%]"></View>
      </View>

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
          <View key={notification.id} className="p-4 flex-row space-x-2">
            <View>
              <Avatar
                uri={notification.user.image}
                name={notification.user.first_name}
                size={48}
              />
            </View>
            <View className="w-[80%]">
              <View className="flex-row flex-wrap space-x-1">
                <Text
                  fontSize="text-sm"
                  className={`${
                    isDarkMode ? "text-muted-dark" : "text-muted-light"
                  }`}
                >
                  <Text fontSize="text-md" fontWeight="font-bold">
                    {notification.user.first_name}{" "}
                  </Text>
                  {notification.message}
                </Text>
              </View>
              <Text
                className={`mt-1 ${
                  isDarkMode ? "text-subtle-dark" : "text-subtle-light"
                }`}
              >
                {moment(notification.created_at).fromNow()}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </NonScrollableContainer>
  );
};

export default NotificationScreen;
