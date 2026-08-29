import { Avatar, Button, Text } from "@/components/core";
import { MIN_TOUCH_TARGET, SCREEN_GUTTER, radius } from "@/lib/design-tokens";
import { formatListTimestamp } from "@/lib/format";
import { useTheme } from "@/lib/theme";
import { useTypedNavigation } from "@/lib/types";
import React, { useState } from "react";
import { Modal, TouchableOpacity, View } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import {
  DocumentIcon,
  PhotoIcon,
  TrashIcon,
} from "react-native-heroicons/outline";

interface Props {
  id: string;
  name: string;
  lastMessage: string;
  isRead: boolean;
  unreadCount: number;
  lastMessageTime: string;
  profilePic: string;
  onDeleteChat: (id: string) => void;
}

export function ChatCard({
  id,
  name,
  lastMessage,
  unreadCount,
  isRead,
  lastMessageTime,
  profilePic,
  onDeleteChat,
}: Props) {
  const [modalVisible, setModalVisible] = useState(false);
  const router = useTypedNavigation();
  const { color } = useTheme();

  const unread = !isRead && unreadCount > 0;
  // A conversation with no name used to collapse to its grey preview line with
  // no bold title above it, so the row simply lost its first line. "Renit
  // member" read as a placeholder leaking into the product; this says what is
  // actually true.
  const displayName = name?.trim() || "Unnamed contact";

  const renderRightActions = () => (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Delete conversation with ${displayName}`}
      style={{
        backgroundColor: color.danger,
        justifyContent: "center",
        alignItems: "center",
        width: 88,
        borderRadius: radius.card,
        marginLeft: 12,
      }}
      onPress={() => setModalVisible(true)}
    >
      <TrashIcon size={22} color="#FFFFFF" />
    </TouchableOpacity>
  );

  let parsedMessage: any;
  try {
    parsedMessage = JSON.parse(lastMessage);
  } catch {
    parsedMessage = lastMessage;
  }

  const isAttachment =
    typeof parsedMessage === "object" &&
    (parsedMessage?.type === "image" || parsedMessage?.type === "file");

  const preview = () => {
    if (!isAttachment) return lastMessage;
    return parsedMessage.type === "image" ? "Photo" : "File";
  };

  return (
    <>
      <Swipeable renderRightActions={renderRightActions}>
        <TouchableOpacity
          onPress={() => router.navigate("ChatDetails", { id })}
          accessibilityRole="button"
          accessibilityLabel={
            unread
              ? `${displayName}, ${unreadCount} unread. ${preview()}`
              : `${displayName}. ${preview()}`
          }
          activeOpacity={0.7}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingVertical: 12,
            paddingHorizontal: SCREEN_GUTTER,
            minHeight: 72,
            backgroundColor: color.canvas,
          }}
        >
          <Avatar uri={profilePic} name={displayName} size={48} />

          <View style={{ flex: 1, gap: 2 }}>
            <Text
              fontSize="text-md"
              // Bold until read. "Has the owner replied?" is the question this
              // list exists to answer, and nothing on the row answered it.
              fontWeight={unread ? "font-bold" : "font-semibold"}
              numberOfLines={1}
            >
              {displayName}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              {isAttachment ? (
                parsedMessage.type === "image" ? (
                  <PhotoIcon size={14} color={color.textBody} />
                ) : (
                  <DocumentIcon size={14} color={color.textBody} />
                )
              ) : null}
              <Text
                fontSize="text-sm"
                tone={unread ? "hi" : "body"}
                numberOfLines={1}
                style={{ flex: 1 }}
              >
                {preview()}
              </Text>
            </View>
          </View>

          {/* Aligned to the name's baseline. Centring it between the two lines
              made it line up with neither. */}
          <View
            style={{
              alignItems: "flex-end",
              alignSelf: "flex-start",
              gap: 6,
              minWidth: 56,
              paddingTop: 2,
            }}
          >
            {/* Was the full 8/14/2026 12:54 AM on every row — verbose, US-ordered
                and ~280px of row width. iOS convention is relative and smart. */}
            <Text fontSize="text-xs" tone={unread ? "brand" : "dim"}>
              {formatListTimestamp(lastMessageTime)}
            </Text>
            {unread ? (
              <View
                style={{
                  minWidth: 20,
                  height: 20,
                  paddingHorizontal: 6,
                  borderRadius: radius.full,
                  backgroundColor: color.brand,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  fontSize="text-xs"
                  fontWeight="font-bold"
                  style={{ color: "#FFFFFF" }}
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Text>
              </View>
            ) : null}
          </View>
        </TouchableOpacity>
      </Swipeable>

      <Modal
        transparent
        visible={modalVisible}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: SCREEN_GUTTER,
            backgroundColor: color.scrim,
          }}
        >
          <View
            style={{
              width: "100%",
              maxWidth: 340,
              padding: 22,
              gap: 8,
              borderRadius: radius.group,
              backgroundColor: color.surface,
              borderWidth: 1,
              borderColor: color.line,
            }}
          >
            <Text fontSize="text-lg" fontWeight="font-bold">
              Delete this conversation?
            </Text>
            <Text fontSize="text-md" tone="body">
              It will be removed from your list. The other person keeps their copy.
            </Text>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              <View style={{ flex: 1 }}>
                <Button variant="outline" onPress={() => setModalVisible(false)}>
                  Cancel
                </Button>
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  variant="warning"
                  onPress={() => {
                    onDeleteChat(id);
                    setModalVisible(false);
                  }}
                >
                  Delete
                </Button>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
