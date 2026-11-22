import React from "react";
import { View } from "react-native";
import { StepProgress } from "./step-progress";

interface PageIndicatorProps {
  /** 0–100. Kept for existing call sites. */
  percentage?: number;
  /** Preferred API: how many steps this flow actually has. */
  totalSteps?: number;
  /** 1-based index of the step currently on screen. */
  currentStep?: number;
}

/**
 * The auth header's step progress, kept for its `percentage` call sites and drawn
 * by the kit `StepProgress` so the app has one segmented bar, not two that drift.
 *
 * The kit fills whole segments only, so a percentage rounds up to the step it is
 * in (20% of three is step 1, 50% step 2); the first screen shows step 1 rather
 * than an empty bar, as StepProgress's steps are 1-based.
 */
export const PageIndicator: React.FC<PageIndicatorProps> = ({
  percentage,
  totalSteps,
  currentStep,
}) => {
  const steps = totalSteps ?? 3;
  const filled =
    currentStep ?? (Math.max(0, Math.min(100, percentage ?? 0)) / 100) * steps;

  return (
    // An explicit width: StepProgress's segments are flex children, so inside a
    // parent that only wraps its content they would collapse to nothing. 44 per
    // segment, centred, is the width the auth header has always drawn.
    <View style={{ alignSelf: "center", width: steps * 44 + (steps - 1) * 4 }}>
      <StepProgress
        step={Math.max(1, Math.min(steps, Math.ceil(filled)))}
        total={steps}
        showLabel={false}
      />
    </View>
  );
};
