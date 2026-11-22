import React from "react";
import { TouchableOpacity, View } from "react-native";
import type { NumberProp, SvgProps } from "react-native-svg";
import { Text } from "./text";

// STUB (ENG-426 foundation): the public API below is final; Group B replaces the
// body with the kit List row (figma/00 2073:14364: Single 56 / Two-line 72).

/** A heroicons component, as the outline set exports them; ListRow sizes and colours it. */
export type ListRowIcon = React.ComponentType<SvgProps & { size?: NumberProp }>;

export interface ListRowProps {
  /** 16 Medium. */
  label: string;
  /** Second line, 14 at 60%. Makes the row the 72 two-line size. */
  subLabel?: string;
  /** Trailing value before the chevron, 14 at 60%. */
  value?: string;
  /** 24pt leading glyph. */
  leadingIcon?: ListRowIcon;
  /** Trailing chevron at 60%. Default true. */
  chevron?: boolean;
  /** `danger` recolours the label (and icon) to dangerStrong, as Logout. Default `default`. */
  tone?: "default" | "danger";
  onPress?: () => void;
  /** Defaults to `label`. */
  accessibilityLabel?: string;
}

export function ListRow({ label, subLabel, value, onPress, accessibilityLabel }: ListRowProps) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      disabled={!onPress}
      onPress={onPress}
      style={{ minHeight: 56, paddingHorizontal: 24, justifyContent: "center" }}
    >
      <View>
        <Text>{label}</Text>
        {subLabel ? <Text>{subLabel}</Text> : null}
      </View>
      {value ? <Text>{value}</Text> : null}
    </TouchableOpacity>
  );
}
