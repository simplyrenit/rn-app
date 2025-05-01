import { useGlobalContext } from "@/context/global-context";
import { useTypedNavigation } from "@/lib/types";
import React, { useEffect, useRef, useState } from "react";
import {
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
} from "react-native-heroicons/outline";
import { Text } from "../core";

interface ChatHeaderProps {
  name: string;
  profilePic: string;
  onReportPress: () => void;
  isBlocked: boolean;
  id: string;
}

export function ChatHeader({
  name,
  profilePic,
  id,
  onReportPress,
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
      className={`flex-row items-center justify-between px-4 py-2 border-b ${isDark ? "border-[#292929]" : "border-[#e6e6e6]"
        }`}
      onLayout={handleLayout}
    >
      <View className="flex-row items-center relative">
        <TouchableOpacity
          onPress={() => navigation.navigate("Chat")}
          className="flex-row items-center mr-3"
        >
          <ArrowLeftIcon
            size={24}
            color={isDark ? "white" : "black"}
          />
        </TouchableOpacity>

        <Pressable style={{ flexDirection: 'row' }} className="items-center" onPress={() => navigation.navigate("UserDetail", { id })}
        >

          <Image
            source={{ uri: profilePic }}
            className="h-10 w-10 rounded-full ml-2"
            resizeMode="cover"
          />
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
      >
        <EllipsisHorizontalCircleIcon
          size={24}
          color={isDark ? "white" : "black"}
        />
      </TouchableOpacity>

      <Modal
        transparent={true}
        animationType="fade"
        visible={menuVisible}
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable
          className="flex-1"
          onPress={() => setMenuVisible(false)}
        >
          <View
            style={[
              styles.modalContent,
              styles.shadow,
              { top: modalPosition.top, right: modalPosition.right },
            ]}
            className={`border ${isDark
              ? "bg-[#0F0F0F] border-[#292929]"
              : "bg-white border-[#e6e6e6]"
              } rounded-lg p-2`}
          >
            <TouchableOpacity
              onPress={() => {
                setMenuVisible(false);
                onReportPress();
              }}
              className="px-4 py-2 items-center flex-row"
            >
              <ExclamationTriangleIcon
                color="#ef4444"
                size={24}
              />
              <Text
                fontWeight="font-bold"
                className="text-red-500 ml-2 -translate-y-0.5"
              >
                Block & Report
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
    shadowColor: "#808080",
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
