import { useGlobalContext } from "@/context/global-context";
import { useNavigation } from "@react-navigation/native";
import React from "react";
import { TouchableOpacity, View } from "react-native";
import { ArrowLeftIcon } from "react-native-heroicons/outline";
import { widthPercentageToDP as wp } from "react-native-responsive-screen";
import { PageIndicator } from "../core/page-indicator";
import { ink } from "@/lib/design-tokens";

interface Props {
  percentage: number;
}

export function HeaderIndicator({ percentage }: Props) {
  const { theme } = useGlobalContext();
  const isDarkMode = theme === "dark";

  const router = useNavigation();

  return (
    <View className="flex flex-row items-center py-4">
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.goBack()} className="w-[10%]">
        <ArrowLeftIcon size={24} color={ink.text(isDarkMode)} />
      </TouchableOpacity>
      <View className="w-[80%]">
        <PageIndicator percentage={percentage} />
      </View>
    </View>
  );
}
