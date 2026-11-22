import React from "react";
import { TouchableOpacity } from "react-native";
import { Text } from "./text";

// STUB (ENG-426 foundation): the public API below is final; Group B replaces the
// body with the kit Chip (figma/00 2073:14388: Default / Selected, 40 high).

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  /** Optional glyph before the label (gap 6). */
  leading?: React.ReactNode;
}

export function Chip({ label, selected = false, onPress, leading }: ChipProps) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{ height: 40, paddingHorizontal: 16, flexDirection: "row", alignItems: "center" }}
    >
      {leading}
      <Text>{label}</Text>
    </TouchableOpacity>
  );
}
