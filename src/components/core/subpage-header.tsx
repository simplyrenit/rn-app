import React from "react";
import { View } from "react-native";
import { BackButton } from "./back-button";
import { Text } from "./text";

/**
 * The 2.1 kit's Top bar (figma/00 2071:14418), in its three types:
 *
 *  - `back-title` (default): a 44pt back control 16 from the edge, then the
 *    title 12 after it (x72), left-aligned at 18/24 Bold.
 *  - `tab-title`: a tab root's title at 20/28 Bold on the 24 gutter, no back.
 *  - `back-only`: the back control alone, for a screen whose content carries
 *    its own heading.
 *
 * Every type is 56 high with an optional 44pt trailing control at the end. The
 * kit fills the bar white; it is left transparent here because every screen
 * already paints that canvas behind it, and a fill would show as a band on the
 * few screens that sit it over something else.
 */
export type SubpageHeaderVariant = "back-title" | "tab-title" | "back-only";

const BAR_HEIGHT = 56;

export function SubpageHeader({
  title,
  onBack,
  backLabel,
  variant = "back-title",
  trailing,
}: {
  /** Required by `back-title` and `tab-title`; ignored by `back-only`. */
  title?: string;
  /** Opt-in: where the arrow goes when it is not simply "back". */
  onBack?: () => void;
  /** Opt-in: what VoiceOver says when the arrow does not go simply "back". */
  backLabel?: string;
  variant?: SubpageHeaderVariant;
  /** A 44pt control at the end of the bar: share, bell, overflow. */
  trailing?: React.ReactNode;
}) {
  const isTab = variant === "tab-title";
  return (
    <View
      style={{
        height: BAR_HEIGHT,
        flexDirection: "row",
        alignItems: "center",
        // The kit insets the back arrow 16 from the edge, not the 24 gutter the
        // content uses; a tab title has no arrow and sits on the gutter.
        paddingHorizontal: isTab ? 24 : 16,
        gap: 12,
      }}
    >
      {/* First in the tree so VoiceOver reads the back control before the title. */}
      {isTab ? null : <BackButton onPress={onBack} accessibilityLabel={backLabel} />}
      {variant === "back-only" ? (
        <View style={{ flex: 1 }} />
      ) : (
        <Text
          accessibilityRole="header"
          // One line in a fixed 56 bar: a long dynamic title ("Areas within …")
          // truncates rather than pushing the bar taller than the kit.
          numberOfLines={1}
          role={isTab ? "screenTitle" : "sectionTitle"}
          style={{ flex: 1 }}
        >
          {title}
        </Text>
      )}
      {trailing}
    </View>
  );
}
