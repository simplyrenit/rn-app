import { SCREEN_GUTTER, fontFamily, fontSize as fontSizeScale } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { useState } from "react";
import { TextInput, View } from "react-native";
import { FieldShell, Text } from "../core";

/** One price box (2089:35060): the kit field, 48 high, but 12 in from its edge
 *  and the ₹ 4 from the value, as drawn. Focus is the shared field treatment. */
function PriceBox({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (next: string) => void;
}) {
  const { color } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    // The 12 keeps FieldShell's half-point give-back, so focus does not move the value.
    <FieldShell focused={focused} style={{ flex: 1, gap: 4, paddingHorizontal: focused ? 11.5 : 12 }}>
      <Text fontSize="text-md" tone="dim">
        ₹
      </Text>
      <TextInput
        placeholderTextColor={color.placeholder}
        placeholder={label}
        accessibilityLabel={`${label} price`}
        keyboardType="number-pad"
        // A raw TextInput has no font of its own: it drew the price in the system
        // face beside the app-font ₹, and its size was uncapped.
        maxFontSizeMultiplier={1.4}
        style={{
          flex: 1,
          color: color.text,
          fontFamily: fontFamily.regular,
          fontSize: fontSizeScale.md,
        }}
        value={value}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChangeText={onChangeText}
      />
    </FieldShell>
  );
}

export function PriceFilter({
  minPrice,
  maxPrice,
  onSelect,
}: {
  minPrice: string;
  maxPrice: string;
  onSelect: (min: string, max: string) => void;
  closeSheet: () => void;
  isLoading: boolean;
}) {
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
    <View style={{ flex: 1, paddingVertical: 16, paddingHorizontal: SCREEN_GUTTER, gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <PriceBox label="Min" value={min} onChangeText={handleMinChange} />
        <Text fontSize="text-md" tone="dim">
          –
        </Text>
        <PriceBox label="Max" value={max} onChangeText={handleMaxChange} />
      </View>
      {/* ENG-281: a weekly or monthly listing is filtered by what it works out to a day. */}
      <Text role="fieldHint">Price per day</Text>
    </View>
  );
}
