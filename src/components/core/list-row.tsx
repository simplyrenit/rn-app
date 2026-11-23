import { SCREEN_GUTTER, density } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import React from "react";
import { TouchableOpacity, View } from "react-native";
import { ChevronRightIcon } from "react-native-heroicons/mini";
import type { NumberProp, SvgProps } from "react-native-svg";
import { Text } from "./text";

// The kit List row (figma/00 2073:14364): Single 56 / Two-line 72, padding 0 24,
// gap 16 between icon, text, value and chevron.

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

/** The kit's two-line row height; the single row is `density.row` (56). */
const TWO_LINE_HEIGHT = 72;
const ICON_SIZE = 24;
/** The kit's outline weight; heroicons default to 1.5 only on `outline`. */
const ICON_STROKE = 1.5;
const CHEVRON_SIZE = 20;

/**
 * One tappable line of a settings-style list.
 *
 * `minHeight` with no vertical padding: at text scale 1.0 that is exactly the
 * kit's 56/72, and at an accessibility size the row grows instead of clipping.
 */
export function ListRow({
  label,
  subLabel,
  value,
  leadingIcon: Icon,
  chevron = true,
  tone = "default",
  onPress,
  accessibilityLabel,
}: ListRowProps) {
  const { color } = useTheme();
  const ink = tone === "danger" ? color.dangerStrong : color.text;

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      activeOpacity={0.6}
      disabled={!onPress}
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
        minHeight: subLabel ? TWO_LINE_HEIGHT : density.row,
        paddingHorizontal: SCREEN_GUTTER,
        // No fill of its own. The kit paints surface/default (#FFFFFF), which is
        // the light canvas; in dark the canvas is #000 and `surface` #0F0F0F,
        // so a painted row would draw grey bands across a black screen or sheet.
      }}
    >
      {Icon ? <Icon size={ICON_SIZE} color={ink} strokeWidth={ICON_STROKE} /> : null}
      <View style={{ flex: 1, gap: 2 }}>
        <Text fontSize="text-md" fontWeight="font-medium" numberOfLines={1} style={{ color: ink }}>
          {label}
        </Text>
        {subLabel ? (
          <Text fontSize="text-sm" tone="dim" numberOfLines={1}>
            {subLabel}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text fontSize="text-sm" tone="dim">
          {value}
        </Text>
      ) : null}
      {/* The kit's chevron is a filled glyph, so the mini set, not outline. */}
      {chevron ? <ChevronRightIcon size={CHEVRON_SIZE} color={color.textDim} /> : null}
    </TouchableOpacity>
  );
}
