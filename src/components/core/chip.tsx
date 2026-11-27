import { density, radius } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import React from "react";
import {
  AccessibilityRole,
  AccessibilityState,
  Insets,
  LayoutChangeEvent,
  TouchableOpacity,
} from "react-native";
import { Text } from "./text";

// The kit Chip (figma/00 2073:14388): Default / Selected, 40 high, r12.

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  /** Optional glyph before the label (gap 6). */
  leading?: React.ReactNode;
  // Optional passthroughs (ENG-427), no visual change: the results rail measures
  // its chips to scroll the chosen one into view, and the rail's radios and the
  // spec checkboxes say `checked` rather than `selected`.
  onLayout?: (event: LayoutChangeEvent) => void;
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  /** Replaces the default `{ selected }`. */
  accessibilityState?: AccessibilityState;
  /** The chip is 40 high; callers pass 2 top and bottom for the 44pt target. */
  hitSlop?: Insets;
}

export function Chip({
  label,
  selected = false,
  onPress,
  leading,
  onLayout,
  accessibilityRole = "button",
  accessibilityLabel,
  accessibilityHint,
  accessibilityState,
  hitSlop,
}: ChipProps) {
  const { color } = useTheme();
  return (
    <TouchableOpacity
      onLayout={onLayout}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={accessibilityState ?? { selected }}
      hitSlop={hitSlop}
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
