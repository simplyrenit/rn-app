import {
  BadCondition,
  ExcellentCondition,
  GoodCondition,
} from "@/icons/conditions";
import { MIN_TOUCH_TARGET } from "@/lib/design-tokens";
import { selectionFeedback } from "@/lib/haptics";
import { useTheme } from "@/lib/theme";
import { TouchableOpacity, View } from "react-native";
import { CheckIcon } from "react-native-heroicons/solid";
import { Text } from "../core";

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

/** Same selected-row treatment as Sort and the Appearance sheet — one pattern
 *  for "this is the one that is on", not three. */
export function ConditionFilter({ selectedFilter, onSelect }: Props) {
  const { color } = useTheme();

  return (
    <View className="flex-1">
      {options.map((item, index) => {
        const selected = selectedFilter === item.value;
        return (
          <TouchableOpacity
            key={item.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={item.option}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              minHeight: MIN_TOUCH_TARGET + 8,
              borderBottomWidth: index === options.length - 1 ? 0 : 1,
              borderBottomColor: color.line,
            }}
            onPress={() => {
              selectionFeedback();
              onSelect(item.value);
            }}
          >
            <View className="flex flex-row items-center">
              <item.icon
                color={selected ? color.brandText : color.text}
                size={20}
              />
              <Text
                fontSize="text-md"
                fontWeight={selected ? "font-semibold" : "font-normal"}
                className="ml-3"
              >
                {item.option}
              </Text>
            </View>
            {selected && <CheckIcon size={20} color={color.brandText} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
