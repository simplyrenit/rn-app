import React from "react";
import { View } from "react-native";
import { Text } from "./text";

// STUB (ENG-426 foundation): the public API below is final; Group B replaces the
// body with the kit Status pill (figma/00 2073:14380). No brand tone: the fix
// pass removed it, so purple is never a status colour.

export type StatusTone = "neutral" | "success" | "warning" | "danger" | "info";

export interface StatusPillProps {
  label: string;
  tone: StatusTone;
}

export function StatusPill({ label }: StatusPillProps) {
  return (
    <View style={{ height: 24, paddingHorizontal: 10, justifyContent: "center" }}>
      <Text>{label}</Text>
    </View>
  );
}
