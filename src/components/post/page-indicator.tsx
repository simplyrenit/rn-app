import { PageIndicator } from "@/components/core/page-indicator";
import React from "react";

interface PageIndicatorProps {
  /** Legacy percentage API, kept for call sites that still pass one. */
  percentage?: number;
  /** 1-based index of the step on screen. */
  step?: number;
}

/** The listing flow is seven screens long. */
export const POST_FLOW_STEPS = 7;

export const PostProductPageIndicator: React.FC<PageIndicatorProps> = ({
  percentage,
  step,
}) => (
  <PageIndicator
    totalSteps={POST_FLOW_STEPS}
    currentStep={step}
    percentage={percentage}
  />
);
