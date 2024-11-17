import { View } from "react-native";
import React from "react";
import { Text } from "../core";
import { PostProductPageIndicator } from "./page-indicator";

interface Props {
  percentage: number;
  heading: string;
}

export function PostProductHeader({ percentage, heading }: Props) {
  return (
    <View className="h-24 items-center justify-center">
      <Text fontSize="text-lg" fontWeight="font-bold">
        {heading}
      </Text>

      <View className="mt-4">
        <PostProductPageIndicator percentage={percentage} />
      </View>
    </View>
  );
}
