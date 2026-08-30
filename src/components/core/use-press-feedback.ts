import { duration, press } from "@/lib/design-tokens";
import { useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing } from "react-native";

/**
 * Whether the customer has asked iOS to reduce motion.
 *
 * `skeleton.tsx` reads this the same way inline; anything new should use this
 * hook rather than open-coding a third copy of the subscription.
 */
export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (enabled) => setReduceMotion(enabled)
    );
    return () => {
      active = false;
      subscription?.remove?.();
    };
  }, []);

  return reduceMotion;
}

interface Options {
  /** Skip the animation entirely — for a disabled or blocked control. */
  disabled?: boolean;
  /** Override the dip. Leave alone unless the control is unusually large. */
  scale?: number;
}

/**
 * The app's one press treatment.
 *
 * Spread the returned handlers and style onto any `TouchableOpacity`,
 * `Pressable` or `Animated.View` and the control dips on touch-down and
 * settles on release — native-driven, so it survives a busy JS thread, which
 * is exactly when a customer is most likely to tap twice.
 *
 * `TouchableOpacity` runs its own opacity animation on top of this, so pass
 * `activeOpacity={1}` wherever these styles are used; the shared wrappers
 * already do.
 */
export function usePressFeedback({ disabled = false, scale }: Options = {}) {
  const reduceMotion = useReduceMotion();
  const progress = useRef(new Animated.Value(0)).current;

  const run = (toValue: number) => {
    if (disabled) return;
    Animated.timing(progress, {
      toValue,
      duration: duration.fast,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  const pressStyle = useMemo(() => {
    const opacity = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [1, press.opacity],
    });

    // Reduce Motion suppresses the movement, never the acknowledgement: a
    // control that gives no feedback at all reads as broken.
    if (reduceMotion) return { opacity };

    return {
      opacity,
      transform: [
        {
          scale: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [1, scale ?? press.scale],
          }),
        },
      ],
    };
  }, [progress, reduceMotion, scale]);

  return {
    pressStyle,
    onPressIn: () => run(1),
    onPressOut: () => run(0),
  };
}
