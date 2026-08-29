import { MIN_TOUCH_TARGET, radius } from "@/lib/design-tokens";
import { tapFeedback } from "@/lib/haptics";
import { useTheme } from "@/lib/theme";
import React from "react";
import {
  GestureResponderEvent,
  StyleProp,
  TouchableOpacity,
  ViewStyle,
} from "react-native";

interface Props {
  children: React.ReactNode;
  onPress?: (event: GestureResponderEvent) => void;
  /** Required. An icon with no label announces nothing to VoiceOver. */
  accessibilityLabel: string;
  accessibilityHint?: string;
  /** Visual size of the touchable's own box; the hit area is always ≥44pt. */
  size?: number;
  /**
   * Draws a translucent chip behind the glyph. Use whenever the control floats
   * over photography, where the icon's own colour is at the mercy of the image.
   */
  scrim?: boolean;
  disabled?: boolean;
  haptic?: boolean;
  style?: StyleProp<ViewStyle>;
  hitSlopExtra?: number;
}

/**
 * Every icon-only control in the app. It guarantees the two things such controls
 * kept missing individually: an accessibility label, and a hit area that meets
 * Apple's 44×44pt minimum even when the glyph inside it is 20pt.
 */
export function IconButton({
  children,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  size = MIN_TOUCH_TARGET,
  scrim = false,
  disabled = false,
  haptic = true,
  style,
  hitSlopExtra = 0,
}: Props) {
  const { isDark } = useTheme();
  const shortfall = Math.max(0, (MIN_TOUCH_TARGET - size) / 2) + hitSlopExtra;

  const handlePress = (event: GestureResponderEvent) => {
    if (disabled) return;
    if (haptic) tapFeedback();
    onPress?.(event);
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      hitSlop={{
        top: shortfall,
        bottom: shortfall,
        left: shortfall,
        right: shortfall,
      }}
      activeOpacity={0.7}
      style={[
        {
          width: size,
          height: size,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: radius.full,
          opacity: disabled ? 0.4 : 1,
        },
        scrim
          ? {
              // Light enough to read as a control chip rather than a grey disc,
              // dark enough that a white glyph survives a white product photo.
              backgroundColor: "rgba(22,21,26,0.32)",
              borderWidth: 0.5,
              borderColor: "rgba(255,255,255,0.35)",
            }
          : null,
        style,
      ]}
    >
      {children}
    </TouchableOpacity>
  );
}
