import { ColorTokens, radius } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import React from "react";
import { StyleProp, View, ViewStyle } from "react-native";
import { Text } from "./text";

// The kit Status pill (figma/00 2073:14380). No brand tone: the fix pass removed
// it, so purple is never a status colour.

export type StatusTone = "neutral" | "success" | "warning" | "danger" | "info";

export interface StatusPillProps {
  label: string;
  tone: StatusTone;
  /**
   * Placement only. The pill does not set `alignSelf` itself: inside a row with
   * `alignItems: "center"` that would pin it to the top. A column parent that
   * would stretch it passes `{ alignSelf: "flex-start" }`.
   */
  style?: StyleProp<ViewStyle>;
}

/** Label and fill per tone, as plain data so the mapping can be tested without rendering. */
export function statusPillColors(tone: StatusTone, color: ColorTokens) {
  return {
    // Neutral is the kit's surface/muted under text/secondary (70%), not grey on grey.
    neutral: { fg: color.textBody, bg: color.surfaceMuted },
    success: { fg: color.success, bg: color.successWash },
    warning: { fg: color.warning, bg: color.warningWash },
    danger: { fg: color.danger, bg: color.dangerWash },
    info: { fg: color.info, bg: color.infoWash },
  }[tone];
}

export function StatusPill({ label, tone, style }: StatusPillProps) {
  const { color } = useTheme();
  const tint = statusPillColors(tone, color);
  return (
    <View
      style={[
        {
          // `minHeight`, not `height`: at a large text size the pill grows
          // rather than clipping its label. 24 at scale 1.0, as the kit.
          minHeight: 24,
          paddingHorizontal: 10,
          borderRadius: radius.full,
          backgroundColor: tint.bg,
          flexDirection: "row",
          alignItems: "center",
        },
        style,
      ]}
    >
      <Text fontSize="text-xs" fontWeight="font-semibold" style={{ color: tint.fg }}>
        {label}
      </Text>
    </View>
  );
}
