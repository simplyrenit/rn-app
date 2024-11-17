import { useGlobalContext } from "@/context/global-context";
import { useState } from "react";
import { TextInput, View } from "react-native";
import { Button, Text } from "../core";
import { widthPercentageToDP as wp } from "react-native-responsive-screen";

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
    <View className="flex-1">
      <View className="mt-1  flex-1">
        <View className="flex flex-row items-center justify-evenly">
          <View
            className={`flex flex-row items-center border ${
              isDark ? "border-[#292929] bg-[#0F0F0F]" : "border-[#e6e6e6]"
            } w-[140px] h-12 rounded-lg p-1`}
          >
            <Text fontSize="text-base">₹</Text>
            <TextInput
              placeholderTextColor={isDark ? "#ffffffB2" : "#000000B2"}
              placeholder="Min"
              className={`p-2 h-full w-3/4 ${
                isDark ? "text-white" : "text-black"
              }`}
              keyboardType="number-pad"
              style={{ fontSize: wp(4.15) }}
              value={min}
              onChangeText={(text) => handleMinChange(text)}
            />
          </View>
          <Text fontSize="text-base">-</Text>
          <View
            className={`flex flex-row items-center border ${
              isDark ? "border-[#292929] bg-[#0F0F0F]" : "border-[#e6e6e6]"
            } w-[140px] h-12 rounded-lg p-1`}
          >
            <Text fontSize="text-base">₹</Text>
            <TextInput
              placeholderTextColor={isDark ? "#ffffffB2" : "#000000B2"}
              placeholder="Max"
              className={`p-2 h-full w-3/4 ${
                isDark ? "text-white" : "text-black"
              }`}
              keyboardType="number-pad"
              style={{ fontSize: wp(4.15) }}
              value={max}
              onChangeText={(text) => handleMaxChange(text)}
            />
          </View>
        </View>
      </View>
      {(minPrice || maxPrice) && (
        <View className="p-3">
          <Button onPress={closeSheet} className="mt-5">
            {isLoading ? "Loading..." : "Show products"}
          </Button>
        </View>
      )}
    </View>
  );
}
