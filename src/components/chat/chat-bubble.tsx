import { Button, Text } from "@/components/core";
import {
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  Modal,
  Dimensions,
} from "react-native";
import { View } from "react-native";
import { useGlobalContext } from "@/context/global-context";
import {
  CalendarIcon,
  CurrencyRupeeIcon,
  DocumentIcon,
} from "react-native-heroicons/outline";
import { useChat } from "@/backend/chat";
import { useState } from "react";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import Toast from "react-native-toast-message";
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useTypedNavigation } from "@/lib/types";

interface ChatBubbleProps {
  message: {
    text?: string | undefined;
    name?: string | undefined;
    item?: {
      id: string;
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

interface MessageContent {
  type: "image" | "file";
  url: string;
  filename: string;
  content_type: string;
}

export function ChatBubble({ message, isSent, type, id }: ChatBubbleProps) {
  const { theme, userDetails } = useGlobalContext();
  const isDark = theme === "dark";
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [fullImage, setFullImage] = useState<string | null>(null)
  const router = useTypedNavigation();

  const { offerOperations } = useChat();

  const handleAcceptOffer = async () => {
    await offerOperations(id, "accepted");
  };

  const handleRejectOffer = async () => {
    await offerOperations(id, "rejected");
  };


  const renderMessageContent = () => {
    if (type === "text") {
      try {
        // Try to parse the message as JSON (for attachments)
        const messageContent: MessageContent = JSON.parse(message.text || "");

        if (messageContent.type === "image") {
          return (
            <Pressable
              style={{ position: "relative" }}
              className="p-1"
              onPress={() => setFullImage(messageContent.url)}
            >
              <View
                style={{
                  width: 200,
                  height: 200,
                  borderRadius: 12,
                  backgroundColor: isDark ? "#333" : "#f5f5f5",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                {imageLoading && (
                  <ActivityIndicator
                    size="large"
                    color={isDark ? "#fff" : "#000"}
                    style={{
                      position: "absolute",
                      zIndex: 1,
                    }}
                  />
                )}
                <Image
                  source={{ uri: messageContent.url }}
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: 12,
                  }}
                  resizeMode="cover"
                  onLoadStart={() => setImageLoading(true)}
                  onLoadEnd={() => setImageLoading(false)}
                  onError={(e) => {
                    setImageError(true);
                    setImageLoading(false);
                  }}
                />
                {imageError && (
                  <Text
                    fontSize="text-sm"
                    className={`${isSent ? "text-white" : "text-black"}`}
                  >
                    Failed to load image
                  </Text>
                )}
              </View>
            </Pressable>
          );
        } else if (messageContent.type === "file") {
          return (
            <TouchableOpacity
              className="p-1 w-full"
              onPress={async () => {
                try {
                  const fileUri =
                    FileSystem.documentDirectory + messageContent.filename;
                  const fileInfo = await FileSystem.getInfoAsync(fileUri);

                  if (!fileInfo.exists) {
                    // Download if file doesn't exist
                    await FileSystem.downloadAsync(messageContent.url, fileUri);
                  }

                  // Use sharing on Android, direct opening on iOS
                  if (Platform.OS === "android") {
                    const canShare = await Sharing.isAvailableAsync();
                    if (canShare) {
                      await Sharing.shareAsync(fileUri);
                    } else {
                      Toast.show({
                        type: "error",
                        text1: "Sharing not available on this device",
                        position: "bottom",
                      });
                    }
                  } else {
                    // iOS can handle direct file opening
                    const localFileUri = "file://" + fileUri;
                    const supported = await Linking.canOpenURL(localFileUri);
                    if (supported) {
                      await Linking.openURL(localFileUri);
                    } else {
                      Toast.show({
                        type: "error",
                        text1: "No app found to open this file type",
                        position: "bottom",
                      });
                    }
                  }
                } catch (error) {
                  console.error("Error handling file:", error);
                  Toast.show({
                    type: "error",
                    text1: "Error opening file",
                    position: "bottom",
                  });
                }
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: isDark ? "#333" : "#f5f5f5",
                  padding: 8,
                  borderRadius: 12,
                  width: '100%',
                  flex: 1,
                }}
              >
                <DocumentIcon
                  size={24}
                  color={isDark ? "#fff" : "#000"}
                />
                <View className="w-[85%]">

                  <Text
                    fontSize="text-sm"
                    fontWeight="font-medium"
                    className={`ml-2 w-full ${isDark ? "text-white" : "text-black"} `}
                  >
                    {messageContent.filename}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }
      } catch {
        // If parsing fails, it's a regular text message
        return (
          <Pressable onPress={() => {
            try {
              if (message.text) {

                Linking.openURL(message.text)
              }
            } catch (e) {

            }
          }}>
            <Text
              fontSize="text-sm"
              fontWeight="font-bold"
              className={`${isSent ? "text-white" : "text-black"} p-3`}
              style={{
                textDecorationLine: message.text?.startsWith('https://') ? 'underline' : undefined
              }}
              selectable
            >
              {message.text}
            </Text>
          </Pressable>
        );
      }
    }

    // Handle other message types (product_post, make_offer)
    return null;
  };

  return (
    <View
      className={`flex-row ${isSent ? "justify-end" : "justify-start"} ${type === "product_post" &&
        `${isSent ? "translate-x-2" : "-translate-x-3"}`
        } px-4 py-1`}
    >
      {type === "product_post" && message.item && (
        <Pressable className={`p-3 rounded-2xl`} style={{ width: Dimensions.get('window').width * 0.8 }}
          onPress={() => {
            router.navigate("ProductDetail", { id: message.item?.id })
          }
          }
        >
          <View
            className={`border p-2 rounded-xl ${isDark ? "bg-black border-[#292929]" : "bg-white border-[#e6e6e6]"
              }`}
          >
            <View className={`flex-row items-center px-0 space-x-2 `}>
              <Image
                source={{ uri: message.item.image }}
                className="w-20 h-20 rounded-lg mr-3"
              />
              <View className="space-y-2 flex-1">
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
                  numberOfLines={1}
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
                    className={`${isDark ? "text-[#FFFFFF80]" : "text-[#00000080]"
                      }`}
                  >
                    per day
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </Pressable>
      )
      }

      {
        type === "text" && (
          <View
            className={`max-w-[80%] rounded-2xl ${isSent ? "bg-brand-blue" : "bg-[#e6e6e6]"
              }`}
          >
            {renderMessageContent()}
          </View>
        )
      }

      {
        type === "make_offer" && message.item && (
          <View
            className={`border p-3 rounded-xl ${isDark ? "bg-black border-[#292929]" : "bg-white border-[#e6e6e6]"
              }`}
            style={{ width: Dimensions.get('window').width * 0.8 }}
          >
            <View
              className={`flex-1 w-full border-b ${isDark ? "border-[#292929]" : "border-[#e6e6e6]"
                } p-1 rounded-lg `}
            >
              <Text
                fontSize="text-sm"
                fontWeight="font-semibold"
                className="mb-2 uppercase text-left"
              >
                {message?.name !== userDetails?.name
                  ? "YOU RECEIVED AN OFFER!"
                  : `YOU MADE AN OFFER!`}
              </Text>
            </View>

            <View className={`flex-row items-center my-2 px-4 w-full `}>
              <Image
                source={{ uri: message.item.image }}
                className="w-16 h-16 rounded-lg mr-3"
              />
              <View className="space-y-1 flex-1">
                <Text
                  fontSize="text-sm"
                  fontWeight="font-bold"
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {message.item.name}
                </Text>
                <Text
                  numberOfLines={1}
                  fontSize="text-sm"
                  fontWeight="font-medium"
                  className={`${isDark ? "text-[#FFFFFFB2]" : "text-[#000000B2]"
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
                    className={`${isDark ? "text-[#FFFFFF80]" : "text-[#00000080]"
                      }`}
                  >
                    per day
                  </Text>
                </View>
              </View>
            </View>

            <View
              className={`justify-between items-center mt-1 border-t  ${isDark ? "border-[#292929]" : "border-[#e6e6e6]"
                } ${message.name === userDetails?.name ||
                  message?.item?.offerStatus !== "pending"
                  ? "border-b py-2"
                  : "py-0.5"
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
                <MaterialIcons
                  name="currency-rupee"
                  size={20}
                  color={isDark ? "#fff" : "#000"}
                />
                <View className="flex-row items-center space-x-2">
                  <Text
                    fontSize="text-sm"
                    fontWeight="font-normal"
                    className="ml-1"
                  >
                    {message.item.price} p/d
                  </Text>
                  <Text
                    fontSize="text-sm"
                    fontWeight="font-normal"
                    className="ml-1"
                  >
                    •
                  </Text>
                  <MaterialIcons
                    name="currency-rupee"
                    size={20}
                    color={isDark ? "#fff" : "#000"}
                  />
                  <Text
                    fontSize="text-sm"
                    fontWeight="font-normal"
                    className="ml-1"
                  >
                    {message.item.securityDeposit} deposit
                  </Text>
                </View>
              </View>
            </View>

            {message.item.offerStatus === "pending" ?
              message?.name !== userDetails?.name ? (
                <View className="flex-row items-center justify-between mt-2 w-full">
                  <Button
                    className={`w-[48%] ${isDark
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
              ) : <View style={{ padding: 8, alignItems: 'center' }}>

                <Text>ACTION PENDING</Text></View> : null}

            {message.item.offerStatus === "accepted" && (
              <Text
                fontSize="text-sm"
                fontWeight="font-semibold"
                className="text-[#413c9a] mt-2 uppercase text-center p-2"
              >
                {message?.name !== userDetails?.name
                  ? "YOU ACCEPTED THE OFFER"
                  : `YOUR OFFER WAS ACCEPTED`}
              </Text>
            )}

            {message.item.offerStatus === "rejected" && (
              <Text
                fontSize="text-sm"
                fontWeight="font-semibold"
                className="text-[#E50914] mt-2 uppercase text-center p-2"
              >
                {message?.name !== userDetails?.name
                  ? "YOU REJECTED THE OFFER"
                  : `YOUR OFFER WAS REJECTED`}
              </Text>
            )}
          </View>
        )
      }
      {
        !!fullImage && <Modal visible={!!fullImage} transparent={true} onRequestClose={() => setFullImage(null)}>
          <View style={{ position: 'relative', height: Dimensions.get('window').height, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.8)' }}>

            <Pressable style={{ position: "absolute", top: 10, right: 10, zIndex: 1 }} onPress={() => setFullImage(null)}>
              <MaterialIcons name="close" size={24} color="white" />
            </Pressable>
            <View style={{ position: 'relative', height: '100%', width: '100%', backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' }}>

              <Image source={{ uri: fullImage }}
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: 12,
                }}
                resizeMode="contain"
              />
            </View>
          </View>
        </Modal>
      }
    </View >
  );
}
