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
 * The old list rhythm (16). The 2.1 Profile frames stack sections with no gap, so the signed-in list no longer uses
 * it; it stays exported because the guest list (`profile-pre-auth.tsx`, ENG-428) still pads with it.
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
 * A titled group of rows: the kit group header (Profile 2095:25572 "Group header", 44 high, padding 20 24 4, text
 * `role="groupHeader"`), then the rows with nothing between them.
 */
export function ProfileSection({ title, children }: ProfileSectionProps) {
  return (
    <View>
      <View style={{ minHeight: 44, paddingTop: 20, paddingBottom: 4, paddingHorizontal: SCREEN_GUTTER }}>
        <Text accessibilityRole="header" role="groupHeader">
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}

/** The 1pt `line` divider between two sections (the frame's "Divider", 390x1), with no air around it. */
export function ProfileSectionRule() {
  const { color } = useTheme();

  return <View style={{ height: 1, backgroundColor: color.line }} />;
}

/** The divider under the account block: the same 1pt rule (the frame draws one, not two). */
export const ProfileBlockRule = ProfileSectionRule;
