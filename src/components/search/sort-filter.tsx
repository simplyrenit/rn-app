import { MIN_TOUCH_TARGET, SCREEN_GUTTER } from "@/lib/design-tokens";
import { selectionFeedback } from "@/lib/haptics";
import { useTheme } from "@/lib/theme";
import { TouchableOpacity, View } from "react-native";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  ClockIcon,
  MapPinIcon,
  StarIcon,
} from "react-native-heroicons/outline";
import { Text } from "../core";

// A star means rating; two silhouettes did not, and they were the same glyph
// the profile uses for "Who we are". A clock means recency; sparkles did not.
const options = [
  { icon: ClockIcon, option: "Newest first", value: "new" },
  { icon: ArrowDownIcon, option: "Price: high to low", value: "high-to-low" },
  { icon: ArrowUpIcon, option: "Price: low to high", value: "low-to-high" },
  { icon: MapPinIcon, option: "Nearest first", value: "nearest" },
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
 * Sort order (2089:34809): 44pt rows, a 20 icon 12 from a 16/24 label, no
 * rules between them. The chosen row is brand throughout, icon, SemiBold label
 * and a 20 check, with a `radio` role so VoiceOver says "selected".
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
    <View style={{ flex: 1, paddingTop: 8, paddingBottom: 16, paddingHorizontal: SCREEN_GUTTER }}>
      {visible.map((item) => {
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
              gap: 12,
              minHeight: MIN_TOUCH_TARGET,
            }}
            onPress={() => {
              selectionFeedback();
              onSelect(item.value);
            }}
          >
            <item.icon color={selected ? color.brandText : color.text} size={20} strokeWidth={1.5} />
            <Text
              fontSize="text-md"
              fontWeight={selected ? "font-semibold" : "font-normal"}
              style={{ flex: 1, color: selected ? color.brandText : color.text }}
            >
              {item.option}
            </Text>
            {selected && <CheckIcon size={20} strokeWidth={1.5} color={color.brandText} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
