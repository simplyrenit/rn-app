import { SCREEN_GUTTER, density } from "@/lib/design-tokens";
import React from "react";
import { Platform, TouchableOpacity, View } from "react-native";
import { Text } from "./text";

interface Props {
  title: string;
  subtitle?: string;
  /** Rendered on the right of the title row, for anything other than the kit's "See all" link. */
  accessory?: React.ReactNode;
  /**
   * The kit's trailing link (14 SemiBold purple). Given `onSeeAll`, it draws
   * "See all", or `seeAllLabel` when set.
   */
  onSeeAll?: () => void;
  seeAllLabel?: string;
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

/** The kit Section header (figma/00 2073:14341): 18 Bold, one line, an optional "See all". */
export function SectionHeader({
  title,
  subtitle,
  accessory,
  onSeeAll,
  seeAllLabel = "See all",
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
      {/* The subtitle (only owners-review uses it, 2089:24740): 14/20 dim, 4 under the title. */}
      <View style={{ flex: 1, gap: 4 }}>
        <Text
          accessibilityRole="header"
          role="sectionTitle"
          numberOfLines={1}
          // iOS sets 18/24 Bold Plus Jakarta Sans 1/3pt lower in its line than Figma does; measured against
          // the kit frame (ENG-426: 2.65% before, 1.16% after). Android is checked separately.
          style={Platform.OS === "ios" ? { transform: [{ translateY: -1 / 3 }] } : undefined}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text fontSize="text-sm" tone="dim">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {accessory}
      {onSeeAll ? (
        // A plain text link, not the ghost Button: the kit draws it 20 high and
        // hugging, so the 44pt target is made up in hitSlop.
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`${seeAllLabel}, ${title}`}
          activeOpacity={0.6}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPress={onSeeAll}
        >
          <Text fontSize="text-sm" fontWeight="font-semibold" tone="brand">
            {seeAllLabel}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
