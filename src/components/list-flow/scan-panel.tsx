import { Text, useReduceMotion } from "@/components/core";
import { duration, radius, space } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInLeft,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { FLOW_SPRING } from "./motion";

const BAND_HEIGHT = 96;

export interface FoundChip {
  key: string;
  label: string;
  /** L-13b: the detection the model could not read, drawn dashed. */
  dashed?: boolean;
}

function Chip({ chip }: { chip: FoundChip }) {
  const { color } = useTheme();
  const reduceMotion = useReduceMotion();
  // §8.7: chips spring in (damping 14, stiffness 180); Reduce Motion fades.
  const entering = reduceMotion
    ? FadeIn.duration(duration.fast)
    : FadeInLeft.springify().damping(FLOW_SPRING.damping).stiffness(FLOW_SPRING.stiffness);
  return (
    <Animated.View
      entering={entering}
      style={{
        alignSelf: "flex-start",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: radius.full,
        backgroundColor: chip.dashed ? "transparent" : color.photoScrim,
        borderWidth: 1.5,
        borderStyle: chip.dashed ? "dashed" : "solid",
        borderColor: chip.dashed ? color.onPhoto : "transparent",
      }}
    >
      <Text fontSize="text-xs" fontWeight="font-bold" tone="onPhoto" numberOfLines={1}>
        {chip.label}
      </Text>
    </Animated.View>
  );
}

/**
 * L-13's photo panel: the cover, dimmed, with a scan sweep while the model
 * reads and the things it has found stacked at the bottom-left as chips.
 *
 * Chips, not boxes placed on the photo: the model's coordinates are not
 * reliable enough to draw where an object is (§8.3, a deliberate deviation
 * from the Figma mock).
 */
export function ScanPanel({
  uri,
  scanning,
  chips,
  status,
}: {
  uri: string | null;
  scanning: boolean;
  chips: FoundChip[];
  status: string;
}) {
  const { color } = useTheme();
  const reduceMotion = useReduceMotion();
  const [height, setHeight] = useState(0);
  const sweep = useSharedValue(0);
  const bandOpacity = useSharedValue(1);

  useEffect(() => {
    if (!scanning || reduceMotion || !height) {
      cancelAnimation(sweep);
      bandOpacity.value = withTiming(0, { duration: duration.fast });
      return;
    }
    bandOpacity.value = 1;
    sweep.value = 0;
    // §8.7: 1400 ms, inOut(quad), repeating until `done`.
    sweep.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
      -1,
      false
    );
    return () => cancelAnimation(sweep);
  }, [scanning, reduceMotion, height, sweep, bandOpacity]);

  const bandStyle = useAnimatedStyle(() => ({
    opacity: bandOpacity.value,
    transform: [{ translateY: -BAND_HEIGHT + sweep.value * (height + BAND_HEIGHT) }],
  }));

  return (
    <View
      onLayout={(e) => setHeight(e.nativeEvent.layout.height)}
      style={{
        width: "100%",
        aspectRatio: 4 / 3,
        borderRadius: radius.card,
        overflow: "hidden",
        backgroundColor: color.skeleton,
      }}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
      ) : null}
      <View
        pointerEvents="none"
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: color.photoScrimSoft }}
      />

      <Animated.View
        pointerEvents="none"
        style={[{ position: "absolute", left: 0, right: 0, top: 0, height: BAND_HEIGHT }, bandStyle]}
      >
        <LinearGradient
          colors={["transparent", color.brandVeil, "transparent"]}
          style={{ flex: 1 }}
        />
      </Animated.View>

      <View
        accessible
        accessibilityLiveRegion="polite"
        style={{
          position: "absolute",
          top: space.sm,
          right: space.sm,
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: radius.full,
          backgroundColor: color.photoScrim,
        }}
      >
        <Text fontSize="text-xs" fontWeight="font-bold" tone="onPhoto">
          {status}
        </Text>
      </View>

      <View style={{ position: "absolute", left: space.sm, bottom: space.sm, right: space.sm, gap: 6 }}>
        {chips.map((chip) => (
          <Chip key={chip.key} chip={chip} />
        ))}
      </View>
    </View>
  );
}
