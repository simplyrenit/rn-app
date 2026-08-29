import { radius } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, DimensionValue, Easing } from "react-native";

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: object;
  className?: string;
}

/**
 * A loading placeholder that actually animates.
 *
 * The previous implementation interpolated `backgroundColor` with
 * `useNativeDriver: true`. The native driver does not support colour, so the
 * shimmer never ran and every loading state in the app was a static grey block.
 * Opacity is native-driver-safe, so this pulses for real — and stands still for
 * anyone who has asked iOS to reduce motion.
 */
const Skeleton: React.FC<SkeletonProps> = ({
  width = 100,
  height = 100,
  borderRadius = radius.card,
  style = {},
  className = "",
}) => {
  const { color } = useTheme();
  const pulse = useRef(new Animated.Value(0)).current;
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

  useEffect(() => {
    if (reduceMotion) {
      pulse.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, reduceMotion]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={className}
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: color.skeleton,
        },
        reduceMotion
          ? null
          : {
              opacity: pulse.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 0.45],
              }),
            },
        style,
      ]}
    />
  );
};

export default Skeleton;
