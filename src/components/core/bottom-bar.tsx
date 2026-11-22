import React from "react";
import { StyleProp, View, ViewStyle } from "react-native";
import { Button } from "./button";
import { Text } from "./text";

// STUB (ENG-426 foundation): the public API below is final; Group A replaces the
// body with the kit Bottom bar (figma/00 2071:14467, incl. CTA+Text 2109:30149).

/** One button in a kit bar or sheet footer. */
export interface BarAction {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
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

export function BottomBar({ primary, value, unit, subLine, children, style }: BottomBarProps) {
  return (
    <View style={[{ padding: 16 }, style]}>
      {children ?? (
        <>
          {value ? (
            <Text>
              {value}
              {unit}
              {subLine}
            </Text>
          ) : null}
          {primary ? (
            <Button
              onPress={primary.onPress}
              disabled={primary.disabled}
              loading={primary.loading}
              accessibilityLabel={primary.accessibilityLabel}
            >
              {primary.label}
            </Button>
          ) : null}
        </>
      )}
    </View>
  );
}
