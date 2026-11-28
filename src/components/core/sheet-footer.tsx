import { SCREEN_GUTTER } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import React from "react";
import { TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BarAction } from "./bottom-bar";
import { Button } from "./button";
import { Text } from "./text";

export interface SheetFooterProps {
  /** The sheet's one filled button, 52 full width. */
  primary: BarAction;
  /** Optional text link below the primary: "Cancel", "Reset". */
  secondary?: BarAction;
  /**
   * `danger`: the primary is the kit's Destructive button (red label on a neutral box) and the link is 70% black, as
   * 2094:24597 draws "Cancel the whole booking" over "Keep it". Default: the purple Primary and purple link.
   */
  tone?: "default" | "danger";
}

// The link hugs its 20pt line in the kit; the slop takes it to the 44pt floor
// without moving the footer's layout.
const LINK_SLOP = 12;

/**
 * The 2.1 kit's Sheet footer (figma/00 2071:14481): a hairline, then a column
 * padded 16/24 with the 52 Primary full width and, 8 below it, an optional
 * text link, then the home-indicator inset.
 *
 * The link is plain SemiBold 14/20 text, not the library Text button (Bold,
 * 44 tall), because that is how the kit draws this one.
 */
export function SheetFooter({ primary, secondary, tone = "default" }: SheetFooterProps) {
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        borderTopWidth: 1,
        borderTopColor: color.line,
        backgroundColor: color.surface,
        paddingHorizontal: SCREEN_GUTTER,
        paddingTop: 16,
        paddingBottom: 16 + insets.bottom,
        alignItems: "center",
        gap: 8,
      }}
    >
      <Button
        variant={tone === "danger" ? "warning" : "primary"}
        onPress={primary.onPress}
        disabled={primary.disabled}
        loading={primary.loading}
        accessibilityLabel={primary.accessibilityLabel}
        style={{ alignSelf: "stretch" }}
      >
        {primary.label}
      </Button>
      {secondary ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={secondary.accessibilityLabel ?? secondary.label}
          accessibilityState={{ disabled: Boolean(secondary.disabled || secondary.loading) }}
          disabled={secondary.disabled || secondary.loading}
          onPress={secondary.onPress}
          hitSlop={LINK_SLOP}
        >
          <Text
            fontSize="text-sm"
            fontWeight="font-semibold"
            lineHeight={20}
            style={{ color: secondary.disabled ? color.textDim : tone === "danger" ? color.textBody : color.brandText }}
          >
            {secondary.label}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
