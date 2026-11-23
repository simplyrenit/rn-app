import { StepProgress, SubpageHeader } from "@/components/core";
import React from "react";
import { View } from "react-native";

interface Props {
  percentage: number;
}

const STEPS = 3;

/**
 * The sign-up header (figma/02): the kit Top bar `back-only`, with the 3-segment progress laid over it at x72,
 * 26 into the 56 row, inset 72 each side (246 wide on the 390 frame: three 78 segments, 6 apart). The top bar has no centre slot, so the bar is
 * absolutely placed and lets touches through to the back control.
 *
 * A percentage fills the bar to that exact point (0 / 20 / 30 / 50 / 85 %), so every sign-up screen keeps its
 * own point on it; `step` (rounded up) only feeds the accessibility value.
 */
export function HeaderIndicator({ percentage }: Props) {
  const filled = (Math.max(0, Math.min(100, percentage)) / 100) * STEPS;
  return (
    <View>
      <SubpageHeader variant="back-only" />
      <View pointerEvents="none" style={{ position: "absolute", left: 72, right: 72, top: 26 }}>
        <StepProgress
          step={Math.max(1, Math.min(STEPS, Math.ceil(filled)))}
          total={STEPS}
          fill={filled}
          gap={6}
          showLabel={false}
        />
      </View>
    </View>
  );
}
