import { density, radius } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import React from "react";
import { TouchableOpacity } from "react-native";
import { Text } from "./text";

// The kit Chip (figma/00 2073:14388): Default / Selected, 40 high, r12.

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  /** Optional glyph before the label (gap 6). */
  leading?: React.ReactNode;
}

export function Chip({ label, selected = false, onPress, leading }: ChipProps) {
  const { color } = useTheme();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ selected }}
      activeOpacity={0.6}
      disabled={!onPress}
      onPress={onPress}
      style={{
        minHeight: density.chip,
        // The kit counts its 1pt inside stroke into the layout, so the label
        // sits at 17: RN's border plus 16 of padding is the same box.
        paddingHorizontal: 16,
        gap: 6,
        flexDirection: "row",
        alignItems: "center",
        borderRadius: radius.button,
        borderWidth: 1,
        borderColor: selected ? color.brand : color.line,
        backgroundColor: selected ? color.brandPanel : color.surface,
      }}
    >
      {leading}
      <Text
        fontSize="text-sm"
        fontWeight={selected ? "font-semibold" : "font-medium"}
        style={selected ? { color: color.brandText } : undefined}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
