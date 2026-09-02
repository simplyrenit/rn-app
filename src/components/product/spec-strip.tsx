import { Text } from "@/components/core";
import { SCREEN_GUTTER, density } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import React from "react";
import { View } from "react-native";

const ICON_SIZE = 22;

export interface SpecItem {
  /** The glyph above the value. Supplied by the caller so each screen can use
   *  the real icon for the thing — the category's own icon, the condition's own
   *  icon — rather than a decorative stand-in. */
  icon: React.ReactNode;
  value: string | null | undefined;
  label: string;
}

/**
 * The three-up specification strip: Category, Deposit, Condition.
 *
 * The design puts this on both the product detail screen and the last step of
 * the post wizard, where the seller reviews the listing exactly as a renter
 * will see it. Those two were drifting — the wizard had this layout and the
 * detail screen had vertical key/value rows — so it lives here now and both
 * screens read from one place.
 *
 * A note for whoever revisits this. An earlier pass deliberately replaced this
 * layout on the detail screen with label-led rows, on the grounds that people
 * scan for the label to find the value, that these are arbitrary strings rather
 * than comparable stats, and that the glyphs were decorative — a lightbulb over
 * "Excellent" says nothing about condition. The first objection stands: the
 * label is smaller and below the value here, so this is worse for lookup and
 * better for glance. The glyph objection has since been answered — the icons
 * are the category's own and the condition's own, not stand-ins — which is why
 * `icon` is a caller-supplied node and not a hardcoded set.
 */
export function SpecStrip({ items }: { items: SpecItem[] }) {
  const { color } = useTheme();
  const shown = items.filter((item) => Boolean(item.value));
  if (shown.length === 0) return null;

  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        paddingHorizontal: SCREEN_GUTTER,
        paddingVertical: density.section,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: color.line,
      }}
    >
      {shown.map((item) => (
        <View
          key={item.label}
          style={{ flex: 1, alignItems: "center", gap: 6 }}
        >
          {/* A fixed slot, so a column whose icon failed to load still lines
              its value up with the columns either side of it. */}
          <View
            style={{ height: ICON_SIZE, justifyContent: "center" }}
          >
            {item.icon}
          </View>
          <Text fontSize="text-md" fontWeight="font-bold" numberOfLines={1}>
            {item.value}
          </Text>
          <Text fontSize="text-sm" tone="dim" numberOfLines={1}>
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
}
