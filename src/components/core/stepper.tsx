import { MIN_TOUCH_TARGET, radius } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import React from "react";
import { TouchableOpacity } from "react-native";

/** A round minus or plus button for a small count: the quick block's "How many", a plan's minimum rental. */
export function Stepper({
  label,
  onPress,
  disabled,
  children,
}: {
  label: string;
  onPress: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  const { color } = useTheme();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      activeOpacity={0.7}
      onPress={onPress}
      style={{
        width: MIN_TOUCH_TARGET + 6,
        height: MIN_TOUCH_TARGET + 6,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: color.inputLine,
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {children}
    </TouchableOpacity>
  );
}
