import { radius } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import React from "react";
import { View } from "react-native";

interface PageIndicatorProps {
  /** Legacy percentage API, kept for call sites that still pass one. */
  percentage?: number;
  /** 1-based index of the step on screen. */
  step?: number;
}

/** The listing flow is seven screens long. */
export const POST_FLOW_STEPS = 7;

/**
 * Segment geometry, measured off the Figma post frames (`1:13231` and its
 * siblings): a 24×4 pill with a 4pt gap. The shared `PageIndicator` in core
 * spreads its segments across a fixed 220pt instead, which lands a seven-step
 * bar on 28pt segments — a whole design step wide of the frame — so the wizard
 * draws its own row rather than changing the component the auth flow shares.
 */
const SEGMENT_WIDTH = 24;
const SEGMENT_HEIGHT = 4;
const SEGMENT_GAP = 4;

/**
 * Step progress for the listing flow.
 *
 * Fill is per segment, not a percentage of the bar: a percentage put two
 * consecutive screens on the same partial fill, so the customer completed a
 * step and got no feedback.
 */
export const PostProductPageIndicator: React.FC<PageIndicatorProps> = ({
  percentage,
  step,
}) => {
  const { color } = useTheme();

  const filled =
    step !== undefined
      ? Math.max(0, Math.min(POST_FLOW_STEPS, step))
      : (Math.max(0, Math.min(100, percentage ?? 0)) / 100) * POST_FLOW_STEPS;

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{
        min: 0,
        max: POST_FLOW_STEPS,
        now: Math.round(filled),
        text: `Step ${Math.max(1, Math.ceil(filled))} of ${POST_FLOW_STEPS}`,
      }}
      style={{
        alignSelf: "center",
        flexDirection: "row",
        alignItems: "center",
        gap: SEGMENT_GAP,
      }}
    >
      {Array.from({ length: POST_FLOW_STEPS }).map((_, index) => {
        const fill = Math.max(0, Math.min(1, filled - index));
        return (
          <View
            key={index}
            style={{
              width: SEGMENT_WIDTH,
              height: SEGMENT_HEIGHT,
              // A 4pt-tall bar is a pill, not a card corner.
              borderRadius: radius.full,
              overflow: "hidden",
              backgroundColor: color.line,
            }}
          >
            <View
              style={{
                width: `${fill * 100}%`,
                height: "100%",
                backgroundColor: color.brand,
              }}
            />
          </View>
        );
      })}
    </View>
  );
};
