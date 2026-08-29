import { useGlobalContext } from "@/context/global-context";
import { useState } from "react";
import { TextInput, View } from "react-native";
import { Button, Text } from "../core";
import { widthPercentageToDP as wp } from "react-native-responsive-screen";
import { CurrencyRupeeIcon } from "react-native-heroicons/outline";
import { ink, colors, fontSize as fontSizeScale } from "@/lib/design-tokens";

export function PriceFilter({
  minPrice,
  maxPrice,
  onSelect,
  closeSheet,
  isLoading,
}: {
  minPrice: string;
  maxPrice: string;
  onSelect: (min: string, max: string) => void;
  closeSheet: () => void;
  isLoading: boolean;
}) {
  const { theme } = useGlobalContext();
  const isDark = theme === "dark";

  const [min, setMin] = useState(minPrice || "");
  const [max, setMax] = useState(maxPrice || "");

  const handleMinChange = (value: string) => {
    setMin(value);
    onSelect(value, max);
  };

  const handleMaxChange = (value: string) => {
    setMax(value);
    onSelect(min, value);
  };

  return (
    <View className="flex-1 mt-2">
      <View className="flex-1 px-gutter">
        <View className="flex flex-row items-center justify-between">
          <View
            className={`flex flex-row items-center border ${isDark ? "border-input-line-dark bg-surface-dark" : "border-input-line-light"
              } w-[150px] h-11 rounded-input px-2`}
          >
            <Text fontSize="text-md" tone="body">₹</Text>
            <TextInput
              placeholderTextColor={ink.placeholder(isDark)}
              placeholder="Min"
              className={`px-1 flex-1 ${isDark ? "text-white" : "text-black"
                }`}
              keyboardType="number-pad"
              style={{ fontSize: fontSizeScale.base }}
              value={min}
              onChangeText={(text) => handleMinChange(text)}
            />
          </View>
          <Text fontSize="text-base">-</Text>
          <View
            className={`flex flex-row items-center border ${isDark ? "border-input-line-dark bg-surface-dark" : "border-input-line-light"
              } w-[150px] h-11 rounded-input px-2`}
          >
            <Text fontSize="text-md" tone="body">₹</Text>
            <TextInput
              placeholderTextColor={ink.placeholder(isDark)}
              placeholder="Max"
              className={`px-1 flex-1 ${isDark ? "text-white" : "text-black"
                }`}
              keyboardType="number-pad"
              style={{ fontSize: fontSizeScale.base }}
              value={max}
              onChangeText={(text) => handleMaxChange(text)}
            />
          </View>
        </View>
      </View>
    </View>
  );
}
