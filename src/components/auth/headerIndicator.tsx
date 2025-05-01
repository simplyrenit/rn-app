import { useGlobalContext } from "@/context/global-context";
import { useNavigation } from "@react-navigation/native";
import React from "react";
import { TouchableOpacity, View } from "react-native";
import { ArrowLeftIcon } from "react-native-heroicons/outline";
import { widthPercentageToDP as wp } from "react-native-responsive-screen";
import { PageIndicator } from "../core/page-indicator";

interface Props {
  percentage: number;
}

export function HeaderIndicator({ percentage }: Props) {
  const { theme } = useGlobalContext();
  const isDarkMode = theme === "dark";

  const router = useNavigation();

  return (
    <View className="flex flex-row items-center py-4">
      <TouchableOpacity onPress={() => router.goBack()} className="w-[10%]">
        <ArrowLeftIcon size={wp("7.5%")} color={isDarkMode ? "#FFF" : "#000"} />
      </TouchableOpacity>
      <View className="w-[80%]">
        <PageIndicator percentage={percentage} />
      </View>
    </View>
  );
}
