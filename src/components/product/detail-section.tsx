import { SectionHeader } from "@/components/core";
import { SCREEN_GUTTER } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import React from "react";
import { View } from "react-native";

/**
 * One block of the product detail page, below the facts row.
 *
 * The frame (Figma 1:9120) sets every one of them identically: 32 above and
 * below, the page gutter at the sides, 16 between the heading and what it
 * introduces, and a hairline underneath. That rhythm used to be 26/8 and was
 * spelled out at each call site, so a new section was free to invent its own.
 */
const SECTION_PAD_V = 32;
const SECTION_GAP = 16;
/**
 * The owner profile (Figma 1:21984) rules its page with the same blocks at a
 * different rhythm: 24 above and below rather than 32, and 24 under the heading
 * rather than 16. Its blocks introduce a rail with a button beneath it, not a
 * paragraph, so the heading needs the extra air and the block needs less.
 */
const PROFILE_PAD_V = 24;
const PROFILE_GAP = 24;
/** A line that belongs to the heading — the reviews block's score — sits closer. */
const META_GAP = 4;

interface Props {
  title: string;
  /**
   * A line set under the heading rather than as content: it reads as part of
   * the heading, so it takes 4pt rather than the block's 16.
   */
  meta?: React.ReactNode;
  /**
   * Off when the content bleeds past the gutter — a rail that must scroll to
   * the screen edge. The heading keeps the gutter either way, so the two still
   * share one content edge.
   */
  inset?: boolean;
  /** The hairline below. Off for the last block on the page. */
  divider?: boolean;
  /**
   * Opt-in. `profile` is the owner profile's tighter block; see the metrics
   * above. Everything else keeps the product detail page's rhythm.
   */
  variant?: "detail" | "profile";
  children?: React.ReactNode;
}

export function DetailSection({
  title,
  meta,
  inset = true,
  divider = true,
  variant = "detail",
  children,
}: Props) {
  const { color } = useTheme();
  const profile = variant === "profile";

  return (
    <View
      style={{
        paddingVertical: profile ? PROFILE_PAD_V : SECTION_PAD_V,
        paddingHorizontal: inset ? SCREEN_GUTTER : 0,
        gap: profile ? PROFILE_GAP : SECTION_GAP,
        borderBottomWidth: divider ? 1 : 0,
        borderBottomColor: color.line,
      }}
    >
      <View
        style={{
          gap: META_GAP,
          paddingHorizontal: inset ? 0 : SCREEN_GUTTER,
        }}
      >
        {/* `flush`: this block owns the space under its heading, so the
            heading must not also carry its own. */}
        <SectionHeader title={title} gutter={false} flush />
        {meta}
      </View>
      {children}
    </View>
  );
}
