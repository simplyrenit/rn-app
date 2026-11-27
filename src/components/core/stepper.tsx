import { MIN_TOUCH_TARGET, radius } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import React from "react";
import { TouchableOpacity } from "react-native";

/** Round minus/plus of a plan's minimum rental in 2.1 (2083:14692): 32 disc, brand-tint stroke, 44 touch target. */
const COMPACT = 32;

/** A round minus or plus button for a small count: the quick block's "How many", a plan's minimum rental. */
export function Stepper({
  label,
  onPress,
  disabled,
  compact,
  children,
}: {
  label: string;
  onPress: () => void;
  disabled: boolean;
  /** The 2.1 32pt disc (2083:14692). The 44pt touch target is kept with hitSlop. */
  compact?: boolean;
  children: React.ReactNode;
}) {
  const { color } = useTheme();
  const size = compact ? COMPACT : MIN_TOUCH_TARGET + 6;
  const slop = compact ? (MIN_TOUCH_TARGET - COMPACT) / 2 : 0;
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      activeOpacity={0.7}
      onPress={onPress}
      hitSlop={slop ? { top: slop, bottom: slop, left: slop, right: slop } : undefined}
      style={{
        width: size,
        height: size,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: compact ? color.brandPanelLine : color.inputLine,
        backgroundColor: compact ? color.surface : undefined,
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {children}
    </TouchableOpacity>
  );
}
