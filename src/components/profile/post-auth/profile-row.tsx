import { Text } from "@/components/core";
import { ListRow } from "@/components/core/list-row";
import { SCREEN_GUTTER } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import React from "react";
import { View } from "react-native";
import type { NumberProp, SvgProps } from "react-native-svg";

/** A heroicons component, exactly as the outline set exports them. */
export type HeroIcon = React.ComponentType<SvgProps & { size?: NumberProp }>;

/**
 * The Profile list's rhythm, measured off the signed-in Figma frame.
 *
 * It lives here rather than in `density` because it describes one screen's
 * list, not a scale the rest of the app shares. 16 sits under a section header
 * and above and below the rule between two sections; the rows themselves are
 * the kit List row's 56.
 */
export const PROFILE_LIST_GAP = 16;

interface ProfileRowProps {
  icon: HeroIcon;
  label: string;
  onPress: () => void;
}

/**
 * One tappable line of the Profile list: icon, label, chevron. The kit List row
 * (figma/00 2073:14364) draws it; this keeps the props both Profile screens pass.
 */
export function ProfileRow({ icon, label, onPress }: ProfileRowProps) {
  return <ListRow leadingIcon={icon} label={label} onPress={onPress} />;
}

interface ProfileSectionProps {
  title: string;
  children: React.ReactNode;
}

/**
 * A titled group of rows.
 *
 * The header is still the previous design's Body Bold at full contrast. The
 * 2.1 kit sets a group header as `role="groupHeader"` (14 SemiBold at 60%); the
 * switch belongs to the Profile flow story, which owns the screen's spacing.
 */
export function ProfileSection({ title, children }: ProfileSectionProps) {
  return (
    <View>
      <Text
        accessibilityRole="header"
        fontSize="text-md"
        fontWeight="font-bold"
        style={{ paddingHorizontal: SCREEN_GUTTER }}
      >
        {title}
      </Text>
      <View style={{ marginTop: PROFILE_LIST_GAP }}>{children}</View>
    </View>
  );
}

/** The hairline between two sections, with its 16pt of air on either side. */
export function ProfileSectionRule() {
  const { color } = useTheme();

  return (
    <View
      style={{
        height: 1,
        marginVertical: PROFILE_LIST_GAP,
        backgroundColor: color.line,
      }}
    />
  );
}

/**
 * The heavier rule that closes the profile block above the list. The frame
 * stacks two 1pt rules here; `line` is opaque in both themes, so one 2pt rule is
 * the same pixels for half the views.
 */
export function ProfileBlockRule() {
  const { color } = useTheme();

  return <View style={{ height: 2, backgroundColor: color.line }} />;
}
