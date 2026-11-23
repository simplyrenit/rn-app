import { SCREEN_GUTTER } from "@/lib/design-tokens";
import { selectionFeedback } from "@/lib/haptics";
import { useTheme } from "@/lib/theme";
import { TouchableOpacity, View } from "react-native";
import { CheckIcon } from "react-native-heroicons/outline";
import { Text } from "../core";

// Labels only: the 2.1 frames drop the lightbulb icons (REVIEW b1-01).
const options = [
  { option: "Fair", value: "fair" },
  { option: "Good", value: "good" },
  { option: "Excellent", value: "excellent" },
];

interface Props {
  selectedFilter: string | null;
  onSelect: (option: string) => void;
  closeSheet: () => void;
  isLoading: boolean;
}

/** 2089:35291: 48pt rows with no rules between them; the chosen one is a brand
 *  SemiBold label and a 20 check, as on Sort. */
export function ConditionFilter({ selectedFilter, onSelect }: Props) {
  const { color } = useTheme();

  return (
    <View style={{ flex: 1, paddingTop: 8, paddingBottom: 16, paddingHorizontal: SCREEN_GUTTER }}>
      {options.map((item) => {
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
              minHeight: 48,
            }}
            onPress={() => {
              selectionFeedback();
              onSelect(item.value);
            }}
          >
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
