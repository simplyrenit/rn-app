import { fontSize as fontSizeScale } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { useState } from "react";
import { TextInput, View } from "react-native";
import { FieldShell, Text } from "../core";

/** One price box. Focus is the shared field treatment — a border colour change
 *  and nothing else — so these match every other input in the app. */
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
    <FieldShell focused={focused} style={{ flex: 1, gap: 4 }}>
      <Text fontSize="text-md" tone="body">
        ₹
      </Text>
      <TextInput
        placeholderTextColor={color.placeholder}
        placeholder={label}
        accessibilityLabel={`${label} price`}
        keyboardType="number-pad"
        style={{
          flex: 1,
          color: color.text,
          fontSize: fontSizeScale.base,
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
    <View className="flex-1 mt-2">
      <View className="px-gutter flex flex-row items-center" style={{ gap: 10 }}>
        <PriceBox label="Min" value={min} onChangeText={handleMinChange} />
        <Text fontSize="text-base" tone="body">
          –
        </Text>
        <PriceBox label="Max" value={max} onChangeText={handleMaxChange} />
      </View>
    </View>
  );
}
