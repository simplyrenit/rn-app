import { Text, useReduceMotion } from "@/components/core";
import { duration, radius, space } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInLeft,
  FadeOut,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { EASE_OUT, FLOW_SPRING, MOTION, SMOOTH_LAYOUT, exitFade } from "./motion";
import { PHOTO_TAG_FILL, usePhotoFill } from "./photo-tile";

// figma/10 2095:24471 and 01 2082:14565: a 342-wide panel, 200 high beside a warning and 256 on its own. `band` is
// where the frame draws the 88-high scan band, held there under a design fixture (`still`).
export const SCAN_PANEL = {
  compact: { height: 200, band: 56 },
  tall: { height: 256, band: 96 },
} as const;
const BAND_HEIGHT = 88;
const PANEL_SCRIM = "rgba(0,0,0,0.28)";
const BAND_CLEAR = "rgba(99,91,232,0)";
const BAND_PEAK = "rgba(99,91,232,0.45)";

export interface FoundChip {
  key: string;
  label: string;
  /** L-13b: the detection the model could not read, drawn dashed. */
  dashed?: boolean;
}

function Chip({ chip }: { chip: FoundChip }) {
  const { color } = useTheme();
  const reduceMotion = useReduceMotion();
  // §8.7: chips spring in on the flow spring, from 12 pt left rather than the
  // preset's full-width slide; Reduce Motion fades. They also fade out, and the
  // stack reflows smoothly, when a new run replaces them.
  const entering = reduceMotion
    ? FadeIn.duration(duration.fast)
    : FadeInLeft.springify()
        .damping(FLOW_SPRING.damping)
        .stiffness(FLOW_SPRING.stiffness)
        .withInitialValues({ opacity: 0, transform: [{ translateX: -12 }] });
  return (
    <Animated.View
      entering={entering}
      exiting={reduceMotion ? FadeOut.duration(duration.fast) : exitFade}
      layout={reduceMotion ? undefined : SMOOTH_LAYOUT}
      style={{
        alignSelf: "flex-start",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: radius.full,
        backgroundColor: chip.dashed ? "transparent" : PHOTO_TAG_FILL,
        // The frame's dashed chip is 1px (26 high); a solid chip has no border (24 high).
        ...(chip.dashed ? { borderWidth: 1, borderStyle: "dashed" as const, borderColor: color.onPhoto } : null),
      }}
    >
      <Text fontSize="text-xs" fontWeight="font-semibold" tone="onPhoto" numberOfLines={1}>
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
  size = "tall",
  still = false,
}: {
  uri: string | null;
  scanning: boolean;
  chips: FoundChip[];
  status: string;
  size?: keyof typeof SCAN_PANEL;
  /** Dev design fixtures: hold the band where the frame draws it instead of sweeping. */
  still?: boolean;
}) {
  const { color } = useTheme();
  const photoFill = usePhotoFill();
  const reduceMotion = useReduceMotion();
  const { height, band } = SCAN_PANEL[size];
  const sweep = useSharedValue(0);
  const bandOpacity = useSharedValue(1);

  useEffect(() => {
    if (still) {
      cancelAnimation(sweep);
      bandOpacity.value = scanning ? 1 : 0;
      return;
    }
    if (!scanning || reduceMotion) {
      // Let the beam dissolve where it is rather than blink out.
      cancelAnimation(sweep);
      bandOpacity.value = withTiming(0, { duration: 450, easing: EASE_OUT });
      return;
    }
    bandOpacity.value = withTiming(1, { duration: MOTION.enter, easing: EASE_OUT });
    sweep.value = 0;
    // Repeats until `done`. §8.7 had 1400 ms on inOut(quad); quad's harder
    // ease made the beam visibly stall at each edge, so it is now a slightly
    // slower pass on a sine curve.
    sweep.value = withRepeat(
      withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
      -1,
      false
    );
    return () => cancelAnimation(sweep);
  }, [scanning, reduceMotion, still, sweep, bandOpacity]);

  const bandStyle = useAnimatedStyle(() => ({
    opacity: bandOpacity.value,
    transform: [{ translateY: still ? band : -BAND_HEIGHT + sweep.value * (height + BAND_HEIGHT) }],
  }));

  return (
    <View
      style={{
        width: "100%",
        height,
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: photoFill,
      }}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: "100%", height: "100%" }}
          contentFit="contain"
          transition={reduceMotion ? 0 : { duration: MOTION.enter, effect: "cross-dissolve" }}
        />
      ) : null}
      <View
        pointerEvents="none"
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: PANEL_SCRIM }}
      />

      <Animated.View
        pointerEvents="none"
        style={[{ position: "absolute", left: 0, right: 0, top: 0, height: BAND_HEIGHT }, bandStyle]}
      >
        <LinearGradient
          colors={[BAND_CLEAR, BAND_PEAK, BAND_CLEAR]}
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
          backgroundColor: PHOTO_TAG_FILL,
        }}
      >
        <Text fontSize="text-xs" fontWeight="font-semibold" tone="onPhoto">
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
