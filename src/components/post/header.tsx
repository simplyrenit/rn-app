import { TouchableOpacity, View } from "react-native";
import React from "react";
import { Text } from "../core";
import { PostProductPageIndicator } from "./page-indicator";
import { useTypedNavigation } from "@/lib/types";
import { ArrowLeftIcon } from "react-native-heroicons/outline";
import { useGlobalContext } from "@/context/global-context";

interface Props {
  percentage: number;
  heading: string;
  showBackArrow?: boolean;
}

export function PostProductHeader({ percentage, heading, showBackArrow = false }: Props) {
  const navigation = useTypedNavigation();
  const { theme } = useGlobalContext();
  const isDark = theme === "dark";
  return (
    <View style={{ flexDirection: 'row', position: 'relative' }}>
      {showBackArrow ? <TouchableOpacity
        style={{ position: 'absolute', top: 0, bottom: 0, left: 16, size: 18}}
        onPress={() => navigation.goBack()}
        className="flex-row items-center"
      >
        <ArrowLeftIcon
          size={24}
          color={isDark ? "white" : "black"}
        />
      </TouchableOpacity> : null}
      <View className="h-24 items-center justify-center flex-1">
        <Text fontSize="text-lg" fontWeight="font-bold">
          {heading}
        </Text>
        <View className="mt-4">
          <PostProductPageIndicator percentage={percentage} />
        </View>
      </View>
    </View>
  );
}
