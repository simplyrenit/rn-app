import { StatusPill, Text, usePressFeedback } from "@/components/core";
import { radius } from "@/lib/design-tokens";
import { PhotoItem } from "@/lib/list-flow/types";
import { useTheme } from "@/lib/theme";
import { Image } from "expo-image";
import React, { useEffect, useRef } from "react";
import { Animated as RNAnimated, Easing, TouchableOpacity } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { ArrowPathIcon, PlusIcon } from "react-native-heroicons/outline";
import Svg, { Circle } from "react-native-svg";

// figma/10 2094:25067. The photo scrims and tags are the frame's own alphas, the same in both themes because they
// sit on a photo; no token carries them (photoScrim is 62%, photoScrimSoft 32%).
const TILE_FILL = "#F3F3F6";
const UPLOADING_SCRIM = "rgba(0,0,0,0.35)";
const FAILED_SCRIM = "rgba(0,0,0,0.55)";
export const PHOTO_TAG_FILL = "rgba(0,0,0,0.6)";

/** The photo behind a tile or the scan panel: the frame's #F3F3F6 on light, the skeleton grey on dark. */
export function usePhotoFill() {
  const { color, isDark } = useTheme();
  return isDark ? color.skeleton : TILE_FILL;
}

/**
 * A Figma arc spinner (an ELLIPSE with arcData), optionally over a full track. Angles are Figma's: radians from
 * 3 o'clock, clockwise. It turns while `spinning`; `spinning={false}` is the frame's still pose for fixtures.
 * Used for the upload arc (24, white, 0 → 4.5) and the checklist's pending glyph (18, a quarter over a track).
 * Not the kit RingSpinner, whose track and arc are always brand.
 */
export function ArcSpinner({
  size,
  start,
  end,
  innerRadius,
  color,
  track,
  spinning = true,
}: {
  size: number;
  start: number;
  end: number;
  /** Figma's innerRadius ratio: the ring is `size / 2 × (1 − innerRadius)` thick. */
  innerRadius: number;
  color: string;
  /** A full ring under the arc, stroked inside the circle. */
  track?: { width: number; color: string };
  spinning?: boolean;
}) {
  const turn = useRef(new RNAnimated.Value(0)).current;
  useEffect(() => {
    if (!spinning) {
      turn.setValue(0);
      return;
    }
    const loop = RNAnimated.loop(
      RNAnimated.timing(turn, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [spinning, turn]);

  const half = size / 2;
  const width = half * (1 - innerRadius);
  const r = half - width / 2;
  const rotate = turn.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  return (
    <RNAnimated.View style={{ width: size, height: size, transform: [{ rotate }] }}>
      <Svg width={size} height={size}>
        {track ? (
          <Circle cx={half} cy={half} r={half - track.width / 2} stroke={track.color} strokeWidth={track.width} fill="none" />
        ) : null}
        {/* An SVG circle's stroke starts at 3 o'clock and runs clockwise, as Figma's angles do. */}
        <Circle
          cx={half}
          cy={half}
          r={r}
          stroke={color}
          strokeWidth={width}
          strokeDasharray={`${r * (end - start)} ${2 * Math.PI * r}`}
          strokeLinecap="butt"
          fill="none"
          transform={`rotate(${(start * 180) / Math.PI} ${half} ${half})`}
        />
      </Svg>
    </RNAnimated.View>
  );
}

interface TileProps {
  photo: PhotoItem;
  index: number;
  size: number;
  isCover: boolean;
  /** L-12b: "Stock photo?", "Screenshot?", "Already listed?" on a purple tag. */
  warningTag?: string | null;
  onLongPress: () => void;
  onRetry: () => void;
  /** Dev design fixtures: hold the upload arc still so a screenshot settles. */
  still?: boolean;
}

/**
 * One photo on L-12. Shows its own upload state — a spinner while it uploads,
 * a retry target once the automatic retry has failed (§7.3) — so a slow photo
 * never holds up the others.
 */
export function PhotoTile({ photo, index, size, isCover, warningTag, onLongPress, onRetry, still }: TileProps) {
  const { color } = useTheme();
  const photoFill = usePhotoFill();
  const feedback = usePressFeedback();
  const failed = photo.status === "failed";
  const uploading = photo.status === "uploading";

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPressIn={feedback.onPressIn}
      onPressOut={feedback.onPressOut}
      onPress={failed ? onRetry : undefined}
      onLongPress={onLongPress}
      delayLongPress={350}
      accessibilityRole="button"
      accessibilityLabel={`Photo ${index + 1}${isCover ? ", cover" : ""}${
        failed ? ", upload failed" : uploading ? ", uploading" : ""
      }${warningTag ? `, ${warningTag}` : ""}`}
      accessibilityHint={
        failed ? "Tap to retry the upload" : "Long-press to set as cover or remove"
      }
      accessibilityActions={[
        { name: "longpress", label: "Set as cover or remove" },
        ...(failed ? [{ name: "activate", label: "Retry upload" }] : []),
      ]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === "longpress") onLongPress();
        if (event.nativeEvent.actionName === "activate" && failed) onRetry();
      }}
      style={[{ width: size, height: size }, feedback.pressStyle]}
    >
      <Image
        source={{ uri: photo.remoteUrl ?? photo.localUri }}
        style={{ width: size, height: size, borderRadius: radius.input, backgroundColor: photoFill }}
        contentFit="cover"
        transition={150}
      />

      {/* The upload scrim, warning tag and cover badge fade rather than
          blink, so a finished upload clears softly and "Cover" moves smoothly
          when the owner picks another photo. */}
      {uploading || failed ? (
        <Animated.View
          key={failed ? "failed" : "uploading"}
          entering={FadeIn.duration(150)}
          exiting={FadeOut.duration(260)}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: radius.input,
            backgroundColor: failed ? FAILED_SCRIM : UPLOADING_SCRIM,
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
          }}
        >
          {failed ? (
            <>
              <ArrowPathIcon size={22} strokeWidth={1.375} color={color.onPhoto} />
              <Text fontSize="text-xs" fontWeight="font-semibold" tone="onPhoto">
                Tap to retry
              </Text>
            </>
          ) : (
            <ArcSpinner size={24} start={0} end={4.5} innerRadius={0.82} color={color.onPhoto} spinning={!still} />
          )}
        </Animated.View>
      ) : null}

      {warningTag ? (
        <Animated.View
          entering={FadeIn.duration(220)}
          exiting={FadeOut.duration(150)}
          // No right inset: the frame's "Stock photo?" pill (2094:25123) is 99 wide in a 107 tile, past a 6 inset.
          style={{ position: "absolute", top: 6, left: 6 }}
        >
          <StatusPill tone="warning" label={warningTag} />
        </Animated.View>
      ) : null}

      {isCover ? (
        <Animated.View
          entering={FadeIn.duration(220)}
          exiting={FadeOut.duration(150)}
          style={{
            position: "absolute",
            left: 6,
            bottom: 6,
            backgroundColor: PHOTO_TAG_FILL,
            borderRadius: radius.full,
            paddingHorizontal: 8,
            paddingVertical: 2,
          }}
        >
          <Text fontSize="text-xs" fontWeight="font-semibold" tone="onPhoto">
            Cover
          </Text>
        </Animated.View>
      ) : null}
    </TouchableOpacity>
  );
}

/** The "Add more · up to 5" tile. */
export function AddPhotoTile({ size, label, onPress }: { size: number; label: string; onPress: () => void }) {
  const { color } = useTheme();
  const feedback = usePressFeedback();
  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={onPress}
      onPressIn={feedback.onPressIn}
      onPressOut={feedback.onPressOut}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        {
          width: size,
          height: size,
          borderRadius: radius.input,
          borderWidth: 1,
          borderStyle: "dashed",
          // The frame dashes 6/4; React Native draws its own dash.
          borderColor: color.line,
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          paddingHorizontal: 8,
        },
        feedback.pressStyle,
      ]}
    >
      <PlusIcon size={24} color={color.textDim} />
      <Text fontSize="text-xs" tone="dim" style={{ textAlign: "center" }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
