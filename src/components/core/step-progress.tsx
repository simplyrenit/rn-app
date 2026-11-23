import { useTheme } from "@/lib/theme";
import React from "react";
import { View } from "react-native";
import { Text } from "./text";

// The kit Stepper (figma/00 2074:14448): one 4pt segment per step, 4 apart,
// filled up to the current one, over a "Step N of M" line. Named StepProgress so
// it does not clash with the quantity `Stepper` in core/stepper.tsx.

export interface StepProgressProps {
  /** 1-based current step; segments 1..step are filled. */
  step: number;
  total: number;
  /** Defaults to "Step {step} of {total}". */
  label?: string;
  /** Hide the label line. Default true. */
  showLabel?: boolean;
  /**
   * Filled steps as a fraction (0..total), for progress that moves within a step. The auth header uses it so
   * each sign-up screen still shows its own point on the bar. Without it, `step` whole segments fill.
   */
  fill?: number;
  /** Space between segments. Default 4 (the kit Stepper); the auth header draws 6 (figma/02). */
  gap?: number;
}

export function StepProgress({ step, total, label, showLabel = true, fill, gap = 4 }: StepProgressProps) {
  const { color } = useTheme();
  const text = label ?? `Step ${step} of ${total}`;
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={text}
      accessibilityValue={{ min: 1, max: total, now: step }}
      style={{ gap: 8 }}
    >
      <View style={{ flexDirection: "row", gap }}>
        {Array.from({ length: total }, (_, index) => (
          <View
            key={index}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              overflow: "hidden",
              backgroundColor: fill === undefined && index < step ? color.brand : color.line,
            }}
          >
            {fill !== undefined ? (
              <View
                style={{
                  width: `${Math.max(0, Math.min(1, fill - index)) * 100}%`,
                  height: 4,
                  // figma/02 draws a part-filled segment as its own r2 rect, so its leading end is round too.
                  borderRadius: 2,
                  backgroundColor: color.brand,
                }}
              />
            ) : null}
          </View>
        ))}
      </View>
      {showLabel ? (
        <Text fontSize="text-xs" fontWeight="font-medium" tone="dim">
          {text}
        </Text>
      ) : null}
    </View>
  );
}
