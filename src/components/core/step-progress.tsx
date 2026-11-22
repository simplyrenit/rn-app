import React from "react";
import { View } from "react-native";
import { Text } from "./text";

// STUB (ENG-426 foundation): the public API below is final; Group C replaces the
// body with the kit Stepper (figma/00 2074:14448). Named StepProgress so it does
// not clash with the quantity `Stepper` in core/stepper.tsx.

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
  return (
    <View>
      {showLabel ? <Text>{label ?? `Step ${step} of ${total}`}</Text> : null}
    </View>
  );
}
