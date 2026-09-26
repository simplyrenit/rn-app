import { useReduceMotion } from "@/components/core";
import { duration, radius } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import React, { useEffect, useRef } from "react";
import { StyleProp, View, ViewStyle } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

/** §8.7: found chips and the success mark spring in with this. */
export const FLOW_SPRING = { damping: 14, stiffness: 180 } as const;

/**
 * Entering/layout animations for list rows. Under Reduce Motion the row only
 * fades, for 150 ms, and nothing slides or springs (§8.7).
 */
export function useRowMotion(index: number) {
  const reduceMotion = useReduceMotion();
  return reduceMotion
    ? { entering: FadeIn.duration(duration.fast), layout: undefined }
    : {
        entering: FadeInDown.delay(index * 60),
        layout: LinearTransition.springify(),
      };
}

/**
 * Pulses a brand border once on mount — 1 → 0.4 → 1 over 600 ms — to point the
 * owner at the two checks Review needs from them. Reduce Motion skips it: it is
 * decoration, and the "Check 1 / Check 2" labels carry the meaning.
 */
export function PulseOnce({
  children,
  style,
  borderRadius = radius.button,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
}) {
  const { color } = useTheme();
  const reduceMotion = useReduceMotion();
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    opacity.value = withSequence(
      withTiming(1, { duration: 1 }),
      withTiming(0.4, { duration: 300, easing: Easing.inOut(Easing.quad) }),
      withTiming(1, { duration: 300, easing: Easing.inOut(Easing.quad) }),
      withTiming(0, { duration: duration.base })
    );
  }, [reduceMotion, opacity]);

  const ring = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View style={style}>
      {children}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            top: -4,
            left: -4,
            right: -4,
            bottom: -4,
            borderRadius: borderRadius + 4,
            borderWidth: 2,
            borderColor: color.brand,
          },
          ring,
        ]}
      />
    </View>
  );
}

/**
 * Fades an AI-filled value in place, 0.4 → 1 over 240 ms, whenever the model
 * writes a new one — never when the owner types. The wrapper always occupies
 * its space, so an arriving value cannot shift the form (§8.4).
 */
export function AiValueFade({
  value,
  active,
  children,
}: {
  value: unknown;
  /** True when the current value came from the model. */
  active: boolean;
  children: React.ReactNode;
}) {
  const reduceMotion = useReduceMotion();
  const opacity = useSharedValue(1);
  const key = JSON.stringify(value ?? null);
  const last = useRef(key);

  useEffect(() => {
    if (key === last.current) return;
    last.current = key;
    if (!active) return;
    opacity.value = 0.4;
    opacity.value = withTiming(1, { duration: reduceMotion ? duration.fast : 240 });
  }, [key, active, reduceMotion, opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

/** Press feedback for Reanimated-driven tappables: scale 0.97 on a spring. */
export function usePressScale() {
  const reduceMotion = useReduceMotion();
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return {
    style,
    onPressIn: () => {
      if (!reduceMotion) scale.value = withSpring(0.97, FLOW_SPRING);
    },
    onPressOut: () => {
      scale.value = withSpring(1, FLOW_SPRING);
    },
  };
}
