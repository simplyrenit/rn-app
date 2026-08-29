import { pluralize } from "@/lib/pluralize";
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

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useTypedNavigation } from "@/lib/types";
import { ink, radius } from "@/lib/design-tokens";
import { formatCurrency, formatMessageTime } from "@/lib/format";
import { useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";

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
  /** When the message was sent. Rendered in the bubble's footer. */
  timestamp?: Date | string;
  /**
   * True when another message from the same sender follows within the minute.
   * Tightens the gap so a run reads as one turn rather than as N separate
   * events, which is what made short exchanges fill the whole screen.
   */
  grouped?: boolean;
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

const isHttpUrl = (value?: string) => /^https?:\/\//i.test(value?.trim() || "");

export function ChatBubble({
  message,
  isSent,
  grouped = false,
  type,
  id,
  timestamp,
}: ChatBubbleProps) {
  const { theme, userDetails } = useGlobalContext();
  const isDark = theme === "dark";
  const { color } = useTheme();
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
                  borderRadius: radius.card,
                  backgroundColor: ink.surfaceRaised(isDark),
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                {imageLoading && (
                  <ActivityIndicator
                    size="large"
                    color={ink.text(isDark)}
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
                    borderRadius: radius.card,
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
                    style={{ color: isSent ? "#FFFFFF" : color.text }}
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
                      toast.error("Sharing not available on this device");
                    }
                  } else {
                    // iOS can handle direct file opening
                    const localFileUri = "file://" + fileUri;
                    const supported = await Linking.canOpenURL(localFileUri);
                    if (supported) {
                      await Linking.openURL(localFileUri);
                    } else {
                      toast.error("No app found to open this file type");
                    }
                  }
                } catch (error) {
                  console.error("Error handling file:", error);
                  toast.error("Error opening file");
                }
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: ink.surfaceRaised(isDark),
                  padding: 8,
                  borderRadius: radius.card,
                  width: '100%',
                  flex: 1,
                }}
              >
                <DocumentIcon
                  size={24}
                  color={ink.text(isDark)}
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
        const text = message.text || "";
        const isLinkMessage = isHttpUrl(text);

        if (!isLinkMessage) {
          return (
            <Text
              fontSize="text-md"
              className="px-3 pt-2"
              style={{ color: isSent ? "#FFFFFF" : color.text }}
              selectable
            >
              {text}
            </Text>
          );
        }

        return (
          <Pressable
            onPress={async () => {
              try {
                await Linking.openURL(text.trim());
              } catch {
                toast.error("Unable to open this link");
              }
            }}
          >
            <Text
              fontSize="text-md"
              className="px-3 pt-2"
              style={{
                color: isSent ? "#FFFFFF" : color.brandText,
                textDecorationLine: "underline",
              }}
              selectable
            >
              {text}
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
        } px-gutter`}
      style={{ paddingTop: 1, paddingBottom: grouped ? 1 : 7 }}
    >
      {type === "product_post" && message.item && (
        <Pressable className={`p-3 rounded-group`} style={{ width: Dimensions.get('window').width * 0.8 }}
          onPress={() => {
            if (message.item?.id) {
              router.navigate("ProductDetail", { id: message.item.id });
            }
          }
          }
        >
          <View
            className={`border p-2 rounded-card ${isDark ? "bg-canvas-dark border-line-dark" : "bg-surface-light border-line-light"
              }`}
          >
            <View className={`flex-row items-center px-0 space-x-2 `}>
              <Image
                source={{ uri: message.item.image }}
                className="w-20 h-20 rounded-button mr-3"
              />
              <View className="space-y-2 flex-1">
                <Text
                  fontSize="text-sm"
                  fontWeight="font-bold"
                >
                  {message.item.name}
                </Text>
                <Text tone="body"
                  fontSize="text-sm"
                  fontWeight="font-medium"
                  numberOfLines={1}
                >
                  {message.item.location}
                </Text>
                <View className="flex-row items-center space-x-1 mb-2">
                  <Text
                    fontSize="text-md"
                    fontWeight="font-bold"
                  >
                    {formatCurrency(message.item.price)}
                  </Text>
                  <Text
                    fontSize="text-sm"
                    className={`${isDark ? "text-subtle-dark" : "text-subtle-light"
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
            style={{
              maxWidth: "80%",
              borderRadius: radius.group,
              // An incoming bubble at surfaceRaised measures 1.07:1 against the
              // canvas — no perceptible bubble at all, just floating text. It
              // now sits on `surface` with an input-line edge, which is the
              // 3:1 that WCAG 1.4.11 asks of a meaningful boundary.
              backgroundColor: isSent ? color.brand : color.surface,
              borderWidth: isSent ? 0 : 1,
              borderColor: isSent ? "transparent" : color.inputLine,
              paddingBottom: 6,
            }}
          >
            {renderMessageContent()}
            {timestamp ? (
              // Inline and trailing, not stacked on its own line. Stacked, the
              // timestamp set the bubble's minimum width and doubled its
              // height: a two-character message produced a 77pt bubble, and
              // seven short messages filled 62% of the viewport.
              <Text
                fontSize="text-xs"
                style={{
                  // Was white at 75% on the brand fill — 3.27:1, under the
                  // 4.5:1 a 12pt regular string needs. Solid white is 5.01:1,
                  // the value the design system already records for this pair.
                  color: isSent ? "#FFFFFF" : color.textDim,
                  textAlign: "right",
                  paddingHorizontal: 12,
                  marginTop: -2,
                }}
              >
                {formatMessageTime(timestamp)}
              </Text>
            ) : null}
          </View>
        )
      }

      {
        type === "make_offer" && message.item && (
          <View
            className={`border p-3 rounded-card ${isDark ? "bg-canvas-dark border-line-dark" : "bg-surface-light border-line-light"
              }`}
            style={{ width: Dimensions.get('window').width * 0.8 }}
          >
            <View
              className={`flex-1 w-full border-b ${isDark ? "border-line-dark" : "border-line-light"
                } p-1 rounded-button `}
            >
              {/* All-caps at body size is shouting, and an exclamation mark on
                  a money event reads as unserious. Apple reserves all-caps for
                  11–13pt eyebrows; this is one, so it keeps the letterspacing
                  and drops to the caption step. */}
              <Text
                fontSize="text-xs"
                fontWeight="font-semibold"
                tone="dim"
                className="mb-2 text-left"
                style={{ letterSpacing: 0.6 }}
              >
                {message?.name !== userDetails?.name
                  ? "OFFER RECEIVED"
                  : "OFFER SENT"}
              </Text>
            </View>

            <View className={`flex-row items-center my-2 px-gutter w-full `}>
              <Image
                source={{ uri: message.item.image }}
                className="w-16 h-16 rounded-button mr-3"
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
                  className={`${isDark ? "text-muted-dark" : "text-muted-light"
                    }`}
                >
                  {message.item.location}
                </Text>
                <View className="flex-row items-center space-x-1 mb-2">
                  <Text
                    fontSize="text-md"
                    fontWeight="font-bold"
                  >
                    {formatCurrency(message.item.price)}
                  </Text>
                  <Text
                    fontSize="text-sm"
                    className={`${isDark ? "text-subtle-dark" : "text-subtle-light"
                      }`}
                  >
                    per day
                  </Text>
                </View>
              </View>
            </View>

            <View
              className={`justify-between items-center mt-1 border-t  ${isDark ? "border-line-dark" : "border-line-light"
                } ${message.name === userDetails?.name ||
                  message?.item?.offerStatus !== "pending"
                  ? "border-b py-2"
                  : "py-0.5"
                }`}
            >
              <View className="flex-row items-center">
                <CalendarIcon
                  size={18}
                  color={ink.body(isDark)}
                />
                <View className="flex-row items-center space-x-2">
                  <Text
                    fontSize="text-sm"
                    fontWeight="font-normal"
                    className="ml-1"
                  >
                    {pluralize(Number(message.item.duration), "day")}
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

              {/* One money format. This row rendered "₹ 100 p/d" beside a card
                  header reading "₹100 per day" — different spacing, different
                  abbreviation, eighty points apart — and neither was grouped,
                  so a deposit printed as ₹55445. formatCurrency does the
                  symbol and the Indian digit grouping; the glyph in front of
                  the number was doing it a second time. */}
              <View className="flex-row items-center my-2">
                <MaterialIcons
                  name="event-available"
                  size={18}
                  color={ink.body(isDark)}
                />
                <View className="flex-row items-center space-x-2">
                  <Text fontSize="text-sm" className="ml-1">
                    {formatCurrency(message.item.price)} per day
                  </Text>
                  <Text fontSize="text-sm" tone="dim" className="ml-1">
                    •
                  </Text>
                  <Text fontSize="text-sm" className="ml-1">
                    {formatCurrency(message.item.securityDeposit)} deposit
                  </Text>
                </View>
              </View>
            </View>

            {message.item.offerStatus === "pending" ?
              message?.name !== userDetails?.name ? (
                <View className="flex-row items-center justify-between mt-2 w-full">
                  <Button
                    className={`w-[48%] ${isDark
                      ? "bg-surface-dark border-line-dark"
                      : "bg-surface-light border-line-light"
                      } border rounded-card`}
                    onPress={handleRejectOffer}
                  >
                    <Text
                      fontSize="text-sm"
                      fontWeight="font-bold"
                      
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

                <Text fontSize="text-sm" tone="body">Waiting for a reply</Text></View> : null}

            {/* One status language. Accepted used to be brand purple and
                rejected semantic red, so the brand doubled as a success colour
                on one card while a real semantic token was used on the next.
                The design system ships success/danger for exactly this. */}
            {message.item.offerStatus === "accepted" && (
              <Text
                fontSize="text-sm"
                fontWeight="font-semibold"
                tone="success"
                className="mt-2 text-center p-2"
              >
                {message?.name !== userDetails?.name
                  ? "You accepted this offer"
                  : "Your offer was accepted"}
              </Text>
            )}

            {message.item.offerStatus === "rejected" && (
              <Text
                fontSize="text-sm"
                fontWeight="font-semibold"
                tone="danger"
                className="mt-2 text-center p-2"
              >
                {message?.name !== userDetails?.name
                  ? "You declined this offer"
                  : "Your offer was declined"}
              </Text>
            )}
          </View>
        )
      }
      {
        !!fullImage && <Modal visible={!!fullImage} transparent={true} onRequestClose={() => setFullImage(null)}>
          <View style={{ position: 'relative', height: Dimensions.get('window').height, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.8)' }}>

            <Pressable
              style={{ position: "absolute", top: 60, right: 16, zIndex: 1 }}
              onPress={() => setFullImage(null)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Close image"
            >
              <MaterialIcons name="close" size={24} color="white" />
            </Pressable>
            <View style={{ position: 'relative', height: '100%', width: '100%', backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' }}>

              <Image source={{ uri: fullImage }}
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: radius.card,
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
