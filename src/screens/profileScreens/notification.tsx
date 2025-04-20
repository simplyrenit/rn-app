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

interface NotificationProps {}

const NotificationScreen: React.FC<NotificationProps> = () => {
  const { theme } = useGlobalContext();

  const isDarkMode = theme === "dark";
  const router = useTypedNavigation();

  const { notifications, getNotifications, markAllAsRead } = useNotifications();

  useEffect(() => {
    getNotifications();
    markAllAsRead();
  }, []);

  return (
    <NonScrollableContainer>
      <View
        className={`flex-row items-center justify-between px-5 border-b-[1px] ${
          isDarkMode ? "border-[#292929]" : "border-[#e6e6e6]"
        }`}
        style={{ paddingVertical: wp("5%") }}
      >
        <TouchableOpacity className="w-[10%]" onPress={() => router.goBack()}>
          <ArrowLeftIcon size={18} color={isDarkMode ? "#FFF" : "#000"} />
        </TouchableOpacity>
        <View className="items-center justify-center w-[80%]">
          <Text fontSize="text-xl" fontWeight="font-bold">
            Notifications
          </Text>
        </View>
        <View className="w-[10%]"></View>
      </View>

      <ScrollView>
        {notifications.map((notification) => (
          <View key={notification.id} className="p-4 flex-row gap-2">
            <View>
              <Image
                source={{ uri: notification.user.image }}
                className="rounded-full"
                contentFit="cover"
                style={{ height: wp("15%"), width: wp("15%") }}
              />
            </View>
            <View className="w-[80%]">
              <View className="flex-row flex-wrap gap-1">
                <Text
                  fontSize="text-sm"
                  className={`${
                    isDarkMode ? "text-[#FFFFFFB2]" : "text-[#000000B2]"
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
                  isDarkMode ? "text-[#FFFFFF80]" : "text-[#00000080]"
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
