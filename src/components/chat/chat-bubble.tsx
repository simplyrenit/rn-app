import { Button, Text } from "@/components/core";
import { Image } from "react-native";
import { View } from "react-native";
import { useGlobalContext } from "@/context/global-context";
import {
  CalendarIcon,
  CurrencyRupeeIcon,
} from "react-native-heroicons/outline";
import { useChat } from "@/backend/chat";

interface ChatBubbleProps {
  message: {
    text?: string | undefined;
    name?: string | undefined;
    item?: {
      name: string;
      image: string;
      price: string;
      duration: number;
      startDate: string;
      endDate: string;
      location: string;
      securityDeposit: string;
      offerStatus?: "accepted" | "rejected" | "pending";
    };
  };
  isSent: boolean;
  type: string;
  id: string;
}

const formatDate = (date: Date | undefined) => {
  if (!date) return "";
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
  };
  return date.toLocaleDateString("en-US", options);
};

export function ChatBubble({ message, isSent, type, id }: ChatBubbleProps) {
  const { theme } = useGlobalContext();
  const isDark = theme === "dark";

  const { offerOperations } = useChat();

  const handleAcceptOffer = async () => {
    await offerOperations(id, "accepted");
  };

  const handleRejectOffer = async () => {
    await offerOperations(id, "rejected");
  };

  return (
    <View
      className={`flex-row ${isSent ? "justify-end" : "justify-start"} ${
        type === "product_post" && "justify-center items-center translate-x-2 "
      } px-4 py-1`}
    >
      {type === "product_post" && message.item && (
        <View className={`w-[100%] p-3 rounded-2xl `}>
          <View
            className={`border p-2 rounded-xl ${
              isDark ? "bg-black border-[#292929]" : "bg-white border-[#e6e6e6]"
            }`}
          >
            <View className={`flex-row items-center px-2 space-x-2 `}>
              <Image
                source={{ uri: message.item.image }}
                className="w-20 h-20 rounded-lg mr-3"
              />
              <View className="space-y-2">
                <Text
                  fontSize="text-sm"
                  fontWeight="font-bold"
                >
                  {message.item.name}
                </Text>
                <Text
                  fontSize="text-sm"
                  fontWeight="font-medium"
                  className="text-gray-500"
                >
                  {message.item.location}
                </Text>
                <View className="flex-row items-center space-x-1 mb-2">
                  <Text
                    fontSize="text-md"
                    fontWeight="font-bold"
                  >
                    ₹{message.item.price}
                  </Text>
                  <Text
                    fontSize="text-sm"
                    className={`${
                      isDark ? "text-[#FFFFFF80]" : "text-[#00000080]"
                    }`}
                  >
                    per day
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      )}

      <View
        className={`${
          type === "product_post" ? "max-w-[100%]" : "max-w-[80%]"
        } p-3 rounded-2xl ${
          type === "text" ? (isSent ? "bg-brand-blue" : "bg-[#e6e6e6]") : ""
        }`}
      >
        {type === "text" && (
          <Text
            fontSize="text-sm"
            fontWeight="font-bold"
            className={`${isSent ? "text-white" : "text-black"}`}
          >
            {message.text}
          </Text>
        )}

        {type === "make_offer" && message.item && (
          <View
            className={`border p-3 rounded-xl ${
              isDark ? "bg-black border-[#292929]" : "bg-white border-[#e6e6e6]"
            }`}
          >
            <View
              className={`border-b ${
                isDark ? "border-[#292929]" : "border-[#e6e6e6]"
              } p-1 rounded-lg `}
            >
              <Text
                fontSize="text-sm"
                fontWeight="font-semibold"
                className="text-[#413C9A] mb-2 uppercase text-left"
              >
                {message.name} MADE AN OFFER!
              </Text>
            </View>

            <View className={`flex-row items-center my-2 px-4 `}>
              <Image
                source={{ uri: message.item.image }}
                className="w-16 h-16 rounded-lg mr-3"
              />
              <View className="space-y-1">
                <Text
                  fontSize="text-sm"
                  fontWeight="font-bold"
                >
                  {message.item.name}
                </Text>
                <Text
                  fontSize="text-sm"
                  fontWeight="font-medium"
                  className={`${
                    isDark ? "text-[#FFFFFFB2]" : "text-[#000000B2]"
                  }`}
                >
                  {message.item.location}
                </Text>
                <View className="flex-row items-center space-x-1 mb-2">
                  <Text
                    fontSize="text-md"
                    fontWeight="font-bold"
                  >
                    ₹{message.item.price}
                  </Text>
                  <Text
                    fontSize="text-sm"
                    className={`${
                      isDark ? "text-[#FFFFFF80]" : "text-[#00000080]"
                    }`}
                  >
                    per day
                  </Text>
                </View>
              </View>
            </View>

            <View
              className={`justify-between items-center mt-1 border-t border-b py-2 ${
                isDark ? "border-[#292929]" : "border-[#e6e6e6]"
              }`}
            >
              <View className="flex-row items-center">
                <CalendarIcon
                  size={24}
                  color={isDark ? "#fff" : "#000"}
                />
                <View className="flex-row items-center space-x-2">
                  <Text
                    fontSize="text-sm"
                    fontWeight="font-normal"
                    className="ml-1"
                  >
                    {message.item.duration} days
                  </Text>
                  <Text
                    fontSize="text-sm"
                    fontWeight="font-normal"
                    className="ml-1"
                  >
                    •
                  </Text>
                  <Text
                    fontSize="text-sm"
                    fontWeight="font-normal"
                    className="ml-1"
                  >
                    {formatDate(new Date(message.item.startDate))} -{" "}
                    {formatDate(new Date(message.item.endDate))}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center my-2">
                <CurrencyRupeeIcon
                  size={24}
                  color={isDark ? "#fff" : "#000"}
                />
                <View className="flex-row items-center space-x-2">
                  <Text
                    fontSize="text-sm"
                    fontWeight="font-normal"
                    className="ml-1"
                  >
                    ₹{message.item.price} p/d
                  </Text>
                  <Text
                    fontSize="text-sm"
                    fontWeight="font-normal"
                    className="ml-1"
                  >
                    •
                  </Text>
                  <Text
                    fontSize="text-sm"
                    fontWeight="font-normal"
                    className="ml-1"
                  >
                    ₹{message.item.securityDeposit} deposit
                  </Text>
                </View>
              </View>
            </View>

            {message.item.offerStatus === "pending" && (
              <View className="flex-row items-center justify-between mt-2 w-full">
                <Button
                  className={`w-[48%] ${
                    isDark
                      ? "bg-[#1A1A1A] border-[#292929]"
                      : "bg-white border-[#e6e6e6]"
                  } border rounded-[12px]`}
                  onPress={handleRejectOffer}
                >
                  <Text
                    fontSize="text-sm"
                    fontWeight="font-bold"
                    className="text-[#E50914]"
                  >
                    Reject
                  </Text>
                </Button>
                <Button
                  className="w-[48%]"
                  onPress={handleAcceptOffer}
                >
                  Accept
                </Button>
              </View>
            )}

            {message.item.offerStatus === "accepted" && (
              <Text
                fontSize="text-sm"
                fontWeight="font-semibold"
                className="text-[#413C9A] mt-2 uppercase text-center"
              >
                YOU ACCEPTED THE OFFER
              </Text>
            )}

            {message.item.offerStatus === "rejected" && (
              <Text
                fontSize="text-sm"
                fontWeight="font-semibold"
                className="text-[#413C9A] mt-2 uppercase text-center"
              >
                YOU REJECTED THE OFFER
              </Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
}
