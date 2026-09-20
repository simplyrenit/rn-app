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
  ArrowLeftIcon,
  EllipsisHorizontalCircleIcon,
  ExclamationTriangleIcon,
  ShoppingBagIcon,
  UserCircleIcon,
} from "react-native-heroicons/outline";
import { CrossFade, IconButton, Skeleton, Text } from "../core";
import { MIN_TOUCH_TARGET, colors, ink, radius } from "@/lib/design-tokens";

/** Round participant photo. The frame draws 32, not the 40 this row had. */
const AVATAR = 32;

/**
 * Horizontal inset of the thread's chrome. Narrower than `SCREEN_GUTTER`, which
 * the message list keeps: the Figma thread pulls the back arrow and the overflow
 * control to 16 so the 44pt targets sit closer to the screen edges.
 */
const HEADER_INSET = 16;

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
  const { isDark, color, shadow } = useTheme();

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
      // 8 + a 44pt back target + 8 = the frame's 60pt row, on a 16 inset with a
      // hairline under it. It used to sit on the 24 gutter with a `border-b`.
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: HEADER_INSET,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: color.line,
      }}
      onLayout={handleLayout}
    >
      <View className="flex-row items-center relative" style={{ flex: 1 }}>
        {/* Not `BackButton`: the thread's arrow is drawn in the secondary tone,
            and the shared control has no tone prop (and lives in core/, which
            this area does not edit). Everything else it guarantees — the 44pt
            box, the label, the press treatment — comes from `IconButton`. */}
        <IconButton
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
          accessibilityHint="Returns to the previous screen"
        >
          <ArrowLeftIcon size={24} color={color.textHi} />
        </IconButton>

        <Pressable
          style={{ flexDirection: "row", flex: 1 }}
          className="items-center"
          disabled={loading}
          onPress={() => navigation.navigate("UserDetail", { id })}
        >
          <CrossFade
            loading={loading}
            // Bounded, so a long display name truncates at the overflow control
            // instead of running under it.
            style={{ flex: 1 }}
            placeholder={
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Skeleton
                  width={AVATAR}
                  height={AVATAR}
                  borderRadius={AVATAR / 2}
                />
                <Skeleton
                  width={120}
                  height={14}
                  borderRadius={4}
                  style={{ marginLeft: 8 }}
                />
              </View>
            }
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
            >
              {profilePic ? (
                <Image
                  source={{ uri: profilePic }}
                  style={{
                    width: AVATAR,
                    height: AVATAR,
                    borderRadius: AVATAR / 2,
                  }}
                  resizeMode="cover"
                />
              ) : (
                <UserCircleIcon size={AVATAR} color={colors.dark.brand} />
              )}
              <Text
                fontSize="text-sm"
                fontWeight="font-bold"
                style={{ marginLeft: 8, flexShrink: 1 }}
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
        {/* The frame draws this menu as a popover over the live thread, with no
            dimming. The Pressable stays full-screen so a tap outside still
            dismisses it. */}
        <Pressable className="flex-1" onPress={() => setMenuVisible(false)}>
          <View
            style={[
              styles.modalContent,
              shadow,
              {
                top: modalPosition.top + MENU_TOP_GAP,
                right: MENU_RIGHT_INSET,
                borderRadius: radius.card,
              },
            ]}
            className={`border ${isDark
              ? "bg-surface-dark border-line-dark"
              : "bg-surface-light border-line-light"
              } p-2`}
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

// Measured off the Figma menu: it hangs from the header's hairline, 18 below the
// overflow control's box, and stops 21 from the screen's right edge.
const MENU_TOP_GAP = 18;
const MENU_RIGHT_INSET = 21;

const styles = StyleSheet.create({
  modalContent: {
    position: "absolute",
    width: 196,
  },
});
