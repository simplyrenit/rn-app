import { useTypedNavigation } from "@/lib/types";
import { useTheme } from "@/lib/theme";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  LayoutChangeEvent,
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import {
  EllipsisHorizontalCircleIcon,
  ExclamationTriangleIcon,
  ShoppingBagIcon,
  UserCircleIcon,
} from "react-native-heroicons/outline";
import { BackButton, CrossFade, Skeleton, Text } from "../core";
import { MIN_TOUCH_TARGET, colors, ink } from "@/lib/design-tokens";

interface ChatHeaderProps {
  name: string;
  profilePic: string;
  onReportPress: () => void;
  isBlocked: boolean;
  id: string;
  /**
   * True until the participant's name and photo resolve. The anonymous glyph
   * used to render with no name for a beat and nothing covered it; this swaps
   * in a skeleton for that gap instead.
   */
  loading?: boolean;
  /**
   * Opens the listing this conversation is about. A marketplace thread's
   * overflow menu held exactly one item — "Block & Report" — which is a button
   * wearing a menu's clothes, and it was missing the thing people actually
   * come to the menu for.
   */
  onViewListing?: () => void;
}

export function ChatHeader({
  name,
  profilePic,
  id,
  onReportPress,
  onViewListing,
  isBlocked,
  loading = false,
}: ChatHeaderProps) {
  const navigation = useTypedNavigation();
  const [menuVisible, setMenuVisible] = useState(false);
  const { isDark, shadow } = useTheme();

  const [modalPosition, setModalPosition] = useState({ top: 0, right: 0 });
  const ellipsisRef = useRef<TouchableOpacity>(null);

  const updateModalPosition = () => {
    ellipsisRef.current?.measure((fx, fy, width, height, px, py) => {
      setModalPosition({
        top: py + height,
        right: Dimensions.get("window").width - (px + width),
      });
    });
  };

  useEffect(() => {
    if (menuVisible) {
      updateModalPosition();
    }
  }, [menuVisible]);

  const handleLayout = (event: LayoutChangeEvent) => {
    if (menuVisible) {
      updateModalPosition();
    }
  };

  return (
    <View
      className={`flex-row items-center justify-between px-gutter py-2 border-b ${isDark ? "border-line-dark" : "border-line-light"
        }`}
      onLayout={handleLayout}
    >
      <View className="flex-row items-center relative" style={{ flex: 1 }}>
        <BackButton
          // goBack() pops this screen. navigate("Chat") only focuses the Chat
          // tab, which still had this detail screen on top of its stack, so the
          // back arrow fired and nothing appeared to happen. The fallback
          // covers arriving here directly from a push notification, where
          // there is nothing to pop.
          onPress={() =>
            navigation.canGoBack()
              ? navigation.goBack()
              : navigation.navigate("Chat")
          }
          accessibilityLabel="Back to chats"
        />

        <Pressable
          style={{ flexDirection: "row", flex: 1 }}
          className="items-center"
          disabled={loading}
          onPress={() => navigation.navigate("UserDetail", { id })}
        >
          <CrossFade
            loading={loading}
            placeholder={
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Skeleton width={40} height={40} borderRadius={20} />
                <Skeleton
                  width={120}
                  height={16}
                  borderRadius={4}
                  style={{ marginLeft: 12 }}
                />
              </View>
            }
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {profilePic ? (
                <Image
                  source={{ uri: profilePic }}
                  className="h-10 w-10 rounded-full"
                  resizeMode="cover"
                />
              ) : (
                <UserCircleIcon size={40} color={colors.dark.brand} />
              )}
              <Text
                fontSize="text-base"
                fontWeight="font-bold"
                className="ml-3"
                numberOfLines={1}
              >
                {name}
              </Text>
            </View>
          </CrossFade>
        </Pressable>
      </View>

      <TouchableOpacity
        ref={ellipsisRef}
        disabled={isBlocked}
        onPress={() => setMenuVisible(true)}
        accessibilityRole="button"
        accessibilityLabel="Conversation options"
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <EllipsisHorizontalCircleIcon
          size={24}
          color={ink.text(isDark)}
        />
      </TouchableOpacity>

      <Modal
        transparent={true}
        animationType="fade"
        visible={menuVisible}
        onRequestClose={() => setMenuVisible(false)}
      >
        {/* A scrim, so the menu reads as modal and the dismissal target is
            visible rather than being invisible dead space. */}
        <Pressable
          className="flex-1"
          style={{ backgroundColor: ink.scrim(isDark) }}
          onPress={() => setMenuVisible(false)}
        >
          <View
            style={[
              styles.modalContent,
              shadow,
              { top: modalPosition.top, right: modalPosition.right },
            ]}
            className={`border ${isDark
              ? "bg-surface-dark border-line-dark"
              : "bg-surface-light border-line-light"
              } rounded-button p-2`}
          >
            {onViewListing ? (
              <>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="View listing"
                  onPress={() => {
                    setMenuVisible(false);
                    onViewListing();
                  }}
                  className="px-gutter py-2 items-center flex-row"
                  style={{ minHeight: MIN_TOUCH_TARGET }}
                >
                  <ShoppingBagIcon color={ink.body(isDark)} size={20} />
                  <Text fontSize="text-md" className="ml-3">
                    View listing
                  </Text>
                </TouchableOpacity>

                <View
                  style={{
                    height: StyleSheet.hairlineWidth,
                    backgroundColor: ink.line(isDark),
                    marginVertical: 2,
                  }}
                />
              </>
            ) : null}

            {/* Blocking and reporting are separate decisions with separate
                consequences, and neither was confirmed — one tap did both. */}
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Block and report this person"
              onPress={() => {
                setMenuVisible(false);
                Alert.alert(
                  "Block and report?",
                  "They will not be able to message you, and we will review the conversation.",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Block and report",
                      style: "destructive",
                      onPress: onReportPress,
                    },
                  ]
                );
              }}
              className="px-gutter py-2 items-center flex-row"
              style={{ minHeight: MIN_TOUCH_TARGET }}
            >
              <ExclamationTriangleIcon color={ink.danger(isDark)} size={20} />
              <Text tone="danger" fontSize="text-md" className="ml-3">
                Block &amp; report
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  modalContent: {
    position: "absolute",
    width: "auto",
  },
});
