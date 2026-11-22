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
}

export function StepProgress({ step, total, label, showLabel = true }: StepProgressProps) {
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
      <View style={{ flexDirection: "row", gap: 4 }}>
        {Array.from({ length: total }, (_, index) => (
          <View
            key={index}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              backgroundColor: index < step ? color.brand : color.line,
            }}
          />
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
