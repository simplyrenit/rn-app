import { useGlobalContext } from "@/context/global-context";
import { CustomerRatingIcon, NearestIcon } from "@/icons/filters";
import { TouchableOpacity, View } from "react-native";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  SparklesIcon,
} from "react-native-heroicons/outline";
import { Button, Text } from "../core";

const options = [
  { icon: SparklesIcon, option: "What's new", value: "new" },
  { icon: ArrowDownIcon, option: "Price - High to Low", value: "high-to-low" },
  { icon: ArrowUpIcon, option: "Price - Low to High", value: "low-to-high" },
  { icon: NearestIcon, option: "Nearest", value: "nearest" },
  { icon: CustomerRatingIcon, option: "Customer Rating", value: "top-rated" },
];

interface Props {
  selectedFilter: string | null;
  onSelect: (option: string) => void;
  closeSheet: () => void;
  isLoading: boolean;
  hasLocation: boolean;
}

export function SortFilter({
  selectedFilter,
  onSelect,
  closeSheet,
  isLoading,
  hasLocation,
}: Props) {
  const { theme } = useGlobalContext();

  const isDark = theme === "dark";

  return (
    <View className="flex-1">
      <View className="flex-1">
        {options
          .filter((item) => hasLocation || item.value !== "nearest")
          .map((item, index) => (
            <TouchableOpacity
              key={index}
              className={`p-3 ${index === 0 ? 'pt-0' : ''}`}
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
          <Button onPress={closeSheet}>
            {isLoading ? "Loading..." : "Show products"}
          </Button>
        </View>
      )}
    </View>
  );
}
