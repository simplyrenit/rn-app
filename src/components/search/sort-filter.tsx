import { useGlobalContext } from "@/context/global-context";
import { NearestIcon } from "@/icons/filters";
import { TouchableOpacity, View } from "react-native";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  ClockIcon,
  StarIcon,
} from "react-native-heroicons/outline";
import { Button, Text } from "../core";
import { ink, colors } from "@/lib/design-tokens";

// A star means rating; two silhouettes did not, and they were the same glyph
// the profile uses for "Who we are". A clock means recency; sparkles did not.
const options = [
  { icon: ClockIcon, option: "Newest first", value: "new" },
  { icon: ArrowDownIcon, option: "Price: high to low", value: "high-to-low" },
  { icon: ArrowUpIcon, option: "Price: low to high", value: "low-to-high" },
  { icon: NearestIcon, option: "Nearest first", value: "nearest" },
  { icon: StarIcon, option: "Highest rated", value: "top-rated" },
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
                  <item.icon color={ink.text(isDark)} size={20} />
                  <Text fontSize="text-base" className="ml-3">
                    {item.option}
                  </Text>
                </View>
                {selectedFilter === item.value && (
                  <CheckIcon size={20} color={colors.dark.brand} />
                )}
              </View>
            </TouchableOpacity>
          ))}
      </View>
    </View>
  );
}
