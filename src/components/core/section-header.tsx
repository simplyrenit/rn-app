import { SCREEN_GUTTER, density } from "@/lib/design-tokens";
import React from "react";
import { View } from "react-native";
import { Text } from "./text";

interface Props {
  title: string;
  subtitle?: string;
  /** Rendered on the right of the title row — usually a "See all" control. */
  accessory?: React.ReactNode;
  /**
   * Set false when the parent already applies the gutter, so the heading and
   * the content it introduces always share one content edge.
   */
  gutter?: boolean;
  /**
   * Opt-in: drop the heading's own bottom margin, for a parent that sets the
   * gap between its children itself. Without it the two spacings add up, which
   * is how a block asking for 16 under its heading ends up with 24.
   */
  flush?: boolean;
}

/** One heading treatment, at the app's one content edge. */
export function SectionHeader({
  title,
  subtitle,
  accessory,
  gutter = true,
  flush = false,
}: Props) {
  return (
    <View
      style={{
        paddingHorizontal: gutter ? SCREEN_GUTTER : 0,
        marginBottom: flush ? 0 : density.sectionHeaderGap,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          accessibilityRole="header"
          fontSize="text-lg"
          fontWeight="font-semibold"
        >
          {title}
        </Text>
        {subtitle ? (
          <Text fontSize="text-sm" tone="body">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {accessory}
    </View>
  );
}
