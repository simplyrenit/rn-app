import { Avatar, Button, Text } from "@/components/core";
import { SCREEN_GUTTER, radius } from "@/lib/design-tokens";
import { formatListTimestamp } from "@/lib/format";
import { useTheme } from "@/lib/theme";
import { useTypedNavigation } from "@/lib/types";
import React, { useState } from "react";
import { Modal, PixelRatio, TouchableOpacity, View } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import {
  DocumentIcon,
  PhotoIcon,
  TagIcon,
  TrashIcon,
} from "react-native-heroicons/outline";

// Measured off the Figma Chat row: 80 tall, the time 17.5 from the top, the unread
// badge a 24pt circle 39 from the top. Both sit at the 24 gutter.
const ROW_HEIGHT = 80;
const TIME_TOP = 17.5;
const BADGE_TOP = 39;
const BADGE_SIZE = 24;
const TIME_CLEARANCE = 56;
const BADGE_CLEARANCE = 32;

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
  // The timestamp and badge are pinned, so the room left for them has to grow
  // with the text size or a larger setting runs the name under them.
  const textScale = Math.min(PixelRatio.getFontScale(), 1.4);

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
      <TrashIcon size={22} color={color.onBrand} />
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

  // `makeOffer` writes this exact string as the conversation's lastMessage —
  // there's no structured offer summary on the conversation itself, so this is
  // the only signal available to flag it in the list without opening the thread.
  const isOffer = lastMessage === "An offer was made!";

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
            // The frame's row: 80 tall, 16 above and below, 8 from the avatar
            // to the text. It draws no rule between rows.
            gap: 8,
            paddingVertical: 16,
            paddingHorizontal: SCREEN_GUTTER,
            minHeight: ROW_HEIGHT,
            backgroundColor: color.canvas,
          }}
        >
          <Avatar uri={profilePic} name={displayName} size={48} />

          <View style={{ flex: 1 }}>
            <Text
              fontSize="text-md"
              // Bold until read. "Has the owner replied?" is the question this
              // list exists to answer, and nothing on the row answered it.
              fontWeight={unread ? "font-bold" : "font-semibold"}
              numberOfLines={1}
              // Clear of the timestamp pinned to the row's top right.
              style={{ paddingRight: TIME_CLEARANCE * textScale }}
            >
              {displayName}
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                // Clear of the unread badge pinned to the row's bottom right.
                paddingRight: unread ? BADGE_CLEARANCE * textScale : 0,
              }}
            >
              {isAttachment ? (
                parsedMessage.type === "image" ? (
                  <PhotoIcon size={14} color={color.textBody} />
                ) : (
                  <DocumentIcon size={14} color={color.textBody} />
                )
              ) : isOffer ? (
                <TagIcon size={14} color={color.textBody} />
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

          {/* Pinned where the frame puts them: the time on the name's line at
              the right edge, the badge below it. Neither takes width from the
              text column. */}
          <Text
            fontSize="text-xs"
            // The frame draws the time in the tertiary tone whether or not the row
            // is unread; the badge carries the unread state.
            tone="dim"
            style={{ position: "absolute", top: TIME_TOP, right: SCREEN_GUTTER }}
          >
            {formatListTimestamp(lastMessageTime)}
          </Text>
          {unread ? (
            <View
              style={{
                position: "absolute",
                top: BADGE_TOP,
                right: SCREEN_GUTTER,
                minWidth: BADGE_SIZE,
                height: BADGE_SIZE,
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
                style={{ color: color.onBrand }}
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </Text>
            </View>
          ) : null}
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
