import { BackButton, Text, useReduceMotion } from "@/components/core";
import { PinnedHeader } from "@/components/core/pinned-header";
import { MIN_TOUCH_TARGET, duration, radius } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { EASE_OUT } from "./motion";

/** §8.1: Add photos, Reading, Review, Preview. */
export const FLOW_STEPS = 4;
const SEGMENT_WIDTH = 40;
const SEGMENT_HEIGHT = 4;
const SEGMENT_GAP = 4;
const EDGE_INSET = 16;

function fillFor(index: number, step: number) {
  return index + 1 < step ? 1 : index + 1 === step ? 0.5 : 0;
}

function Segment({ fill, from }: { fill: number; from: number }) {
  const { color } = useTheme();
  const reduceMotion = useReduceMotion();
  // Every screen draws its own header, so a segment that started at `fill`
  // made the bar jump between steps as the new screen slid in. It starts where
  // the previous step left it and fills once the push has mostly landed.
  const progress = useSharedValue(reduceMotion ? fill : from);

  useEffect(() => {
    progress.value = reduceMotion
      ? withTiming(fill, { duration: duration.fast })
      : withDelay(180, withTiming(fill, { duration: 520, easing: EASE_OUT }));
  }, [fill, reduceMotion, progress]);

  // A full-width fill slid in with a transform, not an animated width: width
  // re-runs layout every frame, a translate stays on the UI thread.
  const fillStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: (Math.max(0, Math.min(1, progress.value)) - 1) * SEGMENT_WIDTH },
    ],
  }));

  return (
    <View
      style={{
        width: SEGMENT_WIDTH,
        height: SEGMENT_HEIGHT,
        borderRadius: radius.full,
        overflow: "hidden",
        backgroundColor: color.line,
      }}
    >
      <Animated.View style={[{ width: "100%", height: "100%", backgroundColor: color.brand }, fillStyle]} />
    </View>
  );
}

interface Props {
  /** 1-based step on screen. The current step draws half full: in progress. */
  step: number;
  title?: string;
  onBack?: () => void;
  showBack?: boolean;
}

/**
 * The listing flow's header: back, a centred title and four progress segments.
 * Built on the same `PinnedHeader` as the rest of the app, solid so it reads as
 * part of the page on the true-black canvas.
 */
export function FlowHeader({ step, title = "List an item", onBack, showBack = true }: Props) {
  return (
    <PinnedHeader gutter={false} separator={false} material="solid" style={{ paddingBottom: 12 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          minHeight: MIN_TOUCH_TARGET,
          paddingHorizontal: EDGE_INSET,
        }}
      >
        <View style={{ width: MIN_TOUCH_TARGET, alignItems: "center" }}>
          {showBack ? <BackButton onPress={onBack} /> : null}
        </View>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text accessibilityRole="header" fontSize="text-base" fontWeight="font-bold" numberOfLines={1}>
            {title}
          </Text>
        </View>
        <View style={{ width: MIN_TOUCH_TARGET }} />
      </View>

      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: FLOW_STEPS, now: step, text: `Step ${step} of ${FLOW_STEPS}` }}
        style={{
          alignSelf: "center",
          flexDirection: "row",
          gap: SEGMENT_GAP,
          marginTop: 8,
        }}
      >
        {Array.from({ length: FLOW_STEPS }).map((_, index) => (
          <Segment key={index} fill={fillFor(index, step)} from={fillFor(index, step - 1)} />
        ))}
      </View>
    </PinnedHeader>
  );
}
