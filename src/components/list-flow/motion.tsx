import { useReduceMotion } from "@/components/core";
import { duration, radius } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import React, { useEffect, useRef } from "react";
import { StyleProp, View, ViewStyle } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  LinearTransition,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

/**
 * The flow's one spring. §8.7 first specified damping 14 / stiffness 180 — a
 * damping ratio of about 0.52, which overshoots and wobbles visibly on chips,
 * the success mark and the progress bar. At about 0.85 it arrives just as fast
 * and settles without bouncing.
 */
export const FLOW_SPRING = { damping: 26, stiffness: 240, mass: 1 } as const;

/**
 * Decelerate: fast start, long soft landing (the Material "emphasized
 * decelerate" curve). Everything that enters or moves in the flow uses it, so
 * motion reads as one system rather than a mix of presets.
 */
export const EASE_OUT = Easing.bezierFn(0.2, 0, 0, 1);
/** For things that leave: short, and accelerating away. */
export const EASE_IN = Easing.bezierFn(0.3, 0, 1, 1);

export const MOTION = {
  enter: 300,
  exit: 160,
  move: 300,
} as const;

/**
 * Reflow of siblings when something is added, removed or reordered. A timed
 * curve rather than `springify()`, whose defaults are Reanimated's bounciest.
 */
export const SMOOTH_LAYOUT = LinearTransition.duration(MOTION.move).easing(EASE_OUT);

/** Enter: fade up a short way. 8 pt reads as "arrived", 25 (the preset) as "fell in". */
export function enterUp(delay = 0) {
  return FadeInDown.duration(MOTION.enter)
    .easing(EASE_OUT)
    .delay(delay)
    .withInitialValues({ opacity: 0, transform: [{ translateY: 8 }] });
}

export const exitFade = FadeOut.duration(MOTION.exit).easing(EASE_IN);

/**
 * Enter/exit/layout for anything that appears inside a screen. Under Reduce
 * Motion it only fades, for 150 ms, and nothing slides or reflows (§8.7).
 */
export function useAppear(delay = 0) {
  const reduceMotion = useReduceMotion();
  return reduceMotion
    ? { entering: FadeIn.duration(duration.fast), exiting: FadeOut.duration(duration.fast), layout: undefined }
    : { entering: enterUp(delay), exiting: exitFade, layout: SMOOTH_LAYOUT };
}

/** List rows: the same, staggered 40 ms per row. */
export function useRowMotion(index: number) {
  return useAppear(index * 40);
}

/**
 * Pulses a brand ring once on mount to point the owner at the two checks
 * Review needs from them: in, dip, back, out, on one easing. Reduce Motion
 * skips it: it is decoration, and the "Check 1 / Check 2" labels carry the
 * meaning.
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
  const reduceMotion = useReduceMotion();
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    // Waits for the screen's push to finish, then fades in rather than
    // switching on in a single frame, as the first version did.
    opacity.value = withDelay(
      350,
      withSequence(
        withTiming(1, { duration: 240, easing: EASE_OUT }),
        withTiming(0.35, { duration: 420, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 420, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 600, easing: EASE_OUT })
      )
    );
  }, [reduceMotion, opacity]);

  return (
    <View style={style}>
      {children}
      <Ring opacity={opacity} borderRadius={borderRadius} />
    </View>
  );
}

function Ring({
  opacity,
  borderRadius,
}: {
  opacity: SharedValue<number>;
  borderRadius: number;
}) {
  const { color } = useTheme();
  const ring = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
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
  );
}

/**
 * Marks an AI-filled value as it lands: a soft brand highlight washes over the
 * field and clears — never when the owner types.
 *
 * The first version dipped the content itself to 40 % opacity. That dip is
 * applied from an effect, a frame after the new text has already painted, so
 * every arriving value flickered: full, dim, then fading back. The wash is a
 * separate translucent layer; starting a frame late is invisible, the text
 * never blinks, and the field keeps its space — an arriving value cannot shift
 * the form (§8.4).
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
  const { color } = useTheme();
  const reduceMotion = useReduceMotion();
  const opacity = useSharedValue(0);
  const key = JSON.stringify(value ?? null);
  const last = useRef(key);

  useEffect(() => {
    if (key === last.current) return;
    last.current = key;
    if (!active || reduceMotion) return;
    opacity.value = withSequence(
      withTiming(1, { duration: 200, easing: EASE_OUT }),
      withTiming(0, { duration: 1100, easing: Easing.inOut(Easing.sin) })
    );
  }, [key, active, reduceMotion, opacity]);

  const wash = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <View>
      {children}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            top: -4,
            left: -8,
            right: -8,
            bottom: -4,
            borderRadius: radius.input + 4,
            backgroundColor: color.brandWash,
          },
          wash,
        ]}
      />
    </View>
  );
}

/** Press feedback for Reanimated-driven tappables: scale 0.97 on the flow spring. */
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
