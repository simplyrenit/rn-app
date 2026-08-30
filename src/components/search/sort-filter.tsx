import { NearestIcon } from "@/icons/filters";
import { MIN_TOUCH_TARGET } from "@/lib/design-tokens";
import { selectionFeedback } from "@/lib/haptics";
import { useTheme } from "@/lib/theme";
import { TouchableOpacity, View } from "react-native";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ClockIcon,
  StarIcon,
} from "react-native-heroicons/outline";
import { CheckIcon } from "react-native-heroicons/solid";
import { Text } from "../core";

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

/**
 * Sort order.
 *
 * The active option was marked with a hairline outline check in the brand
 * colour, which at 20pt on the far edge of the sheet read as nothing at all —
 * so there was no way to tell which of these four the results were sorted by.
 * The treatment here is the one the Appearance sheet already uses: a solid
 * check, `brandText`, and a `radio` role so VoiceOver says "selected".
 */
export function SortFilter({
  selectedFilter,
  onSelect,
  hasLocation,
}: Props) {
  const { color } = useTheme();
  const visible = options.filter(
    (item) => hasLocation || item.value !== "nearest"
  );

  return (
    <View className="flex-1">
      {visible.map((item, index) => {
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
              borderBottomWidth: index === visible.length - 1 ? 0 : 1,
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
