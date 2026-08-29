import { useGlobalContext } from "@/context/global-context";
import { useTypedNavigation } from "@/lib/types";
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
import { Text } from "../core";
import { MIN_TOUCH_TARGET, colors, ink } from "@/lib/design-tokens";

interface ChatHeaderProps {
  name: string;
  profilePic: string;
  onReportPress: () => void;
  isBlocked: boolean;
  id: string;
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
}: ChatHeaderProps) {
  const navigation = useTypedNavigation();
  const [menuVisible, setMenuVisible] = useState(false);
  const { theme } = useGlobalContext();
  const isDark = theme === "dark";

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
      <View className="flex-row items-center relative">
        <TouchableOpacity
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
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Back to chats"
          className="flex-row items-center mr-3"
        >
          <ArrowLeftIcon
            size={24}
            color={ink.text(isDark)}
          />
        </TouchableOpacity>

        <Pressable style={{ flexDirection: 'row' }} className="items-center" onPress={() => navigation.navigate("UserDetail", { id })}
        >

          {profilePic ? (
            <Image
              source={{ uri: profilePic }}
              className="h-10 w-10 rounded-full ml-2"
              resizeMode="cover"
            />
          ) : (
            <UserCircleIcon
              size={40}
              color={colors.dark.brand}
              style={{ marginLeft: 8 }}
            />
          )}
          <Text
            fontSize="text-base"
            fontWeight="font-bold"
            className="ml-3"
          >
            {name}
          </Text>
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
              styles.shadow,
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
  shadow: {
    shadowColor: ink.line(false),
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalContent: {
    position: "absolute",
    width: "auto",
  },
});
