import { useTheme } from "@/lib/theme";
import React from "react";
import { View } from "react-native";

interface PageIndicatorProps {
  /** 0–100. Kept for existing call sites. */
  percentage?: number;
  /** Preferred API: how many steps this flow actually has. */
  totalSteps?: number;
  /** 1-based index of the step currently on screen. */
  currentStep?: number;
}

/**
 * Step progress for a multi-screen flow.
 *
 * The previous version was hardcoded to three segments and divided by 33.33,
 * so a five-step flow showed the same partial fill on segment 1 for two
 * consecutive screens — the customer completed a step and got no feedback.
 * Pass `totalSteps`/`currentStep` and each step gets its own segment.
 */
export const PageIndicator: React.FC<PageIndicatorProps> = ({
  percentage,
  totalSteps,
  currentStep,
}) => {
  const { color } = useTheme();

  const steps = totalSteps ?? 3;
  const filled =
    currentStep !== undefined
      ? Math.max(0, Math.min(steps, currentStep))
      : ((Math.max(0, Math.min(100, percentage ?? 0)) / 100) * steps);

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{
        min: 0,
        max: steps,
        now: Math.round(filled),
        text: `Step ${Math.max(1, Math.ceil(filled))} of ${steps}`,
      }}
      // An explicit width: the segments are flex children, so inside a parent
      // that only wraps its content they would collapse to nothing.
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        width: 220,
      }}
    >
      {Array.from({ length: steps }).map((_, index) => {
        const fill = Math.max(0, Math.min(1, filled - index));
        return (
          <View
            key={index}
            style={{
              flex: 1,
              maxWidth: 44,
              height: 4,
              borderRadius: 4,
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
