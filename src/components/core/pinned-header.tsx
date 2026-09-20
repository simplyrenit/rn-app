import { SCREEN_GUTTER, density } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { BlurView } from "expo-blur";
import React from "react";
import { Platform, StyleSheet, View, ViewStyle } from "react-native";

interface Props {
  children: React.ReactNode;
  /** Set false when the caller lays out its own horizontal padding. */
  gutter?: boolean;
  /**
   * Draw the hairline under the header. On by default; a screen whose design
   * has no rule between the header and the content passes false and relies on
   * the blur alone to mark the boundary once content scrolls behind it.
   */
  separator?: boolean;
  /**
   * `blur` (the default) frosts what scrolls behind the header. `solid` paints
   * the canvas instead, for a screen whose design shows the header as part of
   * the page — over true black a blur reads as a grey band that isn't there.
   */
  material?: "blur" | "solid";
  style?: ViewStyle;
}

/**
 * A header that stays put while a list scrolls under it.
 *
 * Three screens pinned a header over a scroll with no fill, no blur and no
 * separator — Home, the post form and Profile. Text passing underneath was cut
 * through the middle of the letterforms and the top halves simply vanished, so
 * a price line on Home read as guillotined and Profile showed two orphaned
 * letter-tops under its title.
 *
 * The fix is the platform's own answer: a blur material plus a hairline, so the
 * boundary is legible and content visibly passes behind it rather than being
 * clipped by nothing. Android gets a solid canvas fill, where BlurView is
 * expensive and inconsistent across OEM skins.
 */
export function PinnedHeader({
  children,
  gutter = true,
  separator = true,
  material = "blur",
  style,
}: Props) {
  const { color, isDark } = useTheme();

  const body = (
    <View
      style={[
        {
          paddingHorizontal: gutter ? SCREEN_GUTTER : 0,
          paddingTop: 6,
          paddingBottom: density.sectionHeaderGap,
        },
        style,
      ]}
    >
      {children}
    </View>
  );

  return (
    <View
      style={{
        zIndex: 10,
        // Guards against a call site that drops this into a flex-row, where a
        // plain View shrink-wraps to its content instead of spanning.
        alignSelf: "stretch",
        width: "100%",
        borderBottomWidth: separator ? StyleSheet.hairlineWidth : 0,
        borderBottomColor: color.line,
      }}
    >
      {Platform.OS === "ios" && material === "blur" ? (
        <BlurView
          intensity={isDark ? 40 : 60}
          tint={isDark ? "dark" : "light"}
          // The blur samples what is behind it; without a faint tint on top the
          // canvas and the header read as the same plane in dark mode.
          style={{ backgroundColor: color.canvasVeil }}
        >
          {body}
        </BlurView>
      ) : (
        <View style={{ backgroundColor: color.canvas }}>{body}</View>
      )}
    </View>
  );
}
