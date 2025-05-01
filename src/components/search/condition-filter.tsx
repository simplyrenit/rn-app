import { useGlobalContext } from "@/context/global-context";
import {
  BadCondition,
  ExcellentCondition,
  GoodCondition,
} from "@/icons/conditions";
import { TouchableOpacity, View } from "react-native";
import { Button, Text } from "../core";
import { CheckIcon } from "react-native-heroicons/outline";

const options = [
  { icon: BadCondition, option: "Fair", value: "fair" },
  { icon: GoodCondition, option: "Good", value: "good" },
  { icon: ExcellentCondition, option: "Excellent", value: "excellent" },
];

interface Props {
  selectedFilter: string | null;
  onSelect: (option: string) => void;
  closeSheet: () => void;
  isLoading: boolean;
}

export function ConditionFilter({
  selectedFilter,
  onSelect,
  closeSheet,
  isLoading,
}: Props) {
  const { theme } = useGlobalContext();
  const isDark = theme === "dark";

  return (
    <View className="flex-1">
      <View className="mt-0 flex-1">
        {options.map((item, index) => (
          <TouchableOpacity
            key={index}
            className={`p-3 ${index === 0 ? "pt-0" : ""}`}
            onPress={() => onSelect(item.value)}
          >
            <View className="flex flex-row items-center justify-between">
              <View className="flex flex-row items-center">
                <item.icon color={isDark ? "white" : "black"} size={20} />
                <Text fontSize="text-base" className="ml-3">
                  {item.option}
                </Text>
              </View>
              {selectedFilter === item.value && (
                <CheckIcon size={20} color="#635be8" />
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>
      {selectedFilter && (
        <View className="p-3">
          <Button onPress={closeSheet} className="mt-5">
            {isLoading ? "Loading..." : "Show products"}
          </Button>
        </View>
      )}
    </View>
  );
}
