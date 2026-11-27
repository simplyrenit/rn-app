import { SCREEN_GUTTER } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { useKeyboardInset } from "@/lib/use-keyboard-inset";
import React from "react";
import { StyleProp, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "./button";
import { Text } from "./text";

/** One button in a kit bar or sheet footer. */
export interface BarAction {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
  /** `false` when `onPress` gives its own haptic (Button's tap buzz is on by default). */
  haptic?: boolean;
}

export type BottomBarLayout =
  | "summary-cta"
  | "full-cta"
  | "secondary-primary"
  | "cta-text";

export interface BottomBarProps {
  /** Which kit layout to draw. Default `full-cta`. Ignored when `children` is given. */
  layout?: BottomBarLayout;
  /** The bar's one filled button. */
  primary?: BarAction;
  /**
   * `secondary-primary`: the outline button left of the primary.
   * `cta-text`: the text link under the primary.
   */
  secondary?: BarAction;
  /** `summary-cta`: "₹600" (20 Bold). */
  value?: string;
  /** `summary-cta`: "/day" (14 at 70%). */
  unit?: string;
  /** `summary-cta`: "Deposit ₹2,000" (12 at 60%). Omit to hide the line. */
  subLine?: string;
  /**
   * Legacy passthrough for `booking/parts` `BottomBar`: rendered in the bar's
   * content strip in place of a layout, keeping the hairline and insets.
   */
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

// The kit's content strip (figma/00 2071:14467): 16 above and below, 24 at the
// sides, 12 between side-by-side buttons. CTA+Text (2109:30149) is a column
// with 4 below and 4 between, the link's own 44 making up the rest.
const STRIP_PAD = 16;
const ROW_GAP = 12;
const LINK_PAD = 4;
// The legacy column `booking/parts` drew (space.sm): kept for the passthrough so
// its 23 bars do not reflow.
const LEGACY_GAP = 8;

function PrimaryButton({ action, style }: { action: BarAction; style?: StyleProp<ViewStyle> }) {
  return (
    <Button
      onPress={action.onPress}
      disabled={action.disabled}
      loading={action.loading}
      accessibilityLabel={action.accessibilityLabel}
      haptic={action.haptic}
      style={style}
    >
      {action.label}
    </Button>
  );
}

/**
 * The 2.1 kit's Bottom bar: a hairline, then a 16/24-padded content strip in
 * one of four layouts, then the home-indicator inset.
 *
 * The bottom inset is carried over from `booking/parts`: with the keyboard up
 * (iOS) the bar sits on the keys, so the home-indicator inset is dropped; on
 * Android `useKeyboardInset` is always 0 and adjustResize does the lifting. The
 * kit draws the strip above the home indicator, not in it, so the strip keeps
 * its 16 and the inset is added below (the old bar used max(inset, 16)).
 */
export function BottomBar({
  layout = "full-cta",
  primary,
  secondary,
  value,
  unit,
  subLine,
  children,
  style,
}: BottomBarProps) {
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardInset();
  // CTA+Text with no link is a Full CTA: its 4pt bottom only works with the
  // link's own 44 above it.
  const isLinkLayout = children === undefined && layout === "cta-text" && secondary !== undefined;

  const content = (() => {
    if (children !== undefined) return children;
    switch (layout) {
      case "summary-cta":
        return (
          <>
            <View style={{ gap: 2 }}>
              <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
                <Text fontSize="text-lg" fontWeight="font-bold" lineHeight={28}>
                  {value}
                </Text>
                {unit ? (
                  <Text fontSize="text-sm" lineHeight={20} tone="body">
                    {unit}
                  </Text>
                ) : null}
              </View>
              {subLine ? (
                <Text fontSize="text-xs" lineHeight={16} tone="dim">
                  {subLine}
                </Text>
              ) : null}
            </View>
            {primary ? <PrimaryButton action={primary} style={{ flex: 1 }} /> : null}
          </>
        );
      case "secondary-primary":
        return (
          <>
            {secondary ? (
              <Button
                variant="outline"
                onPress={secondary.onPress}
                disabled={secondary.disabled}
                loading={secondary.loading}
                accessibilityLabel={secondary.accessibilityLabel}
                style={{ flex: 1 }}
              >
                {secondary.label}
              </Button>
            ) : null}
            {primary ? <PrimaryButton action={primary} style={{ flex: 1 }} /> : null}
          </>
        );
      case "cta-text":
        return (
          <>
            {/* Without a link the bar is a row, where only flex fills the width. */}
            {primary ? <PrimaryButton action={primary} style={isLinkLayout ? { alignSelf: "stretch" } : { flex: 1 }} /> : null}
            {secondary ? (
              <Button
                variant="ghost"
                onPress={secondary.onPress}
                disabled={secondary.disabled}
                loading={secondary.loading}
                accessibilityLabel={secondary.accessibilityLabel}
              >
                {secondary.label}
              </Button>
            ) : null}
          </>
        );
      case "full-cta":
      default:
        return primary ? <PrimaryButton action={primary} style={{ flex: 1 }} /> : null;
    }
  })();

  return (
    <View
      style={[
        {
          borderTopWidth: 1,
          borderTopColor: color.line,
          backgroundColor: color.canvas,
          paddingHorizontal: SCREEN_GUTTER,
          paddingTop: STRIP_PAD,
          paddingBottom: (isLinkLayout ? LINK_PAD : STRIP_PAD) + (keyboard ? 0 : insets.bottom),
        },
        children !== undefined
          ? { gap: LEGACY_GAP }
          : isLinkLayout
          ? { alignItems: "center", gap: LINK_PAD }
          : { flexDirection: "row", alignItems: "center", gap: ROW_GAP },
        style,
      ]}
    >
      {content}
    </View>
  );
}
