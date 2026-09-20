import { Text } from "@/components/core";
import { SCREEN_GUTTER } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import React from "react";
import { TouchableOpacity, View } from "react-native";
import { ChevronRightIcon } from "react-native-heroicons/mini";
import type { NumberProp, SvgProps } from "react-native-svg";

/** A heroicons component, exactly as the outline set exports them. */
export type HeroIcon = React.ComponentType<SvgProps & { size?: NumberProp }>;

/**
 * The Profile list's metrics, measured off the signed-in Figma frame.
 *
 * They live here rather than in `density` because they describe one screen's
 * list, not a scale the rest of the app shares — the app's grouped lists run on
 * `density.row` (44) with inset separators, and this frame runs a taller, airier
 * row with no separators at all.
 *
 * The rhythm is a single number: 16 sits under a section header, above and below
 * the rule between two sections, and inside a row above and below its 24pt line
 * box — which is what makes the row 56.
 */
export const PROFILE_LIST_GAP = 16;
const ROW_MIN_HEIGHT = 56;
const ROW_GAP = 8;
/** Glyph box for both the leading icon and the trailing chevron. */
const ROW_ICON_SIZE = 20;
/** The frame's outline weight. Heroicons default to 1.5 only on `outline`. */
const ROW_ICON_STROKE = 1.5;

interface ProfileRowProps {
  icon: HeroIcon;
  label: string;
  onPress: () => void;
}

/**
 * One tappable line of the Profile list: icon, label, chevron.
 *
 * `minHeight` rather than a fixed height so a customer at an accessibility text
 * size gets a taller row instead of a clipped one.
 */
export function ProfileRow({ icon: Icon, label, onPress }: ProfileRowProps) {
  const { color } = useTheme();

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      activeOpacity={0.6}
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: ROW_GAP,
        minHeight: ROW_MIN_HEIGHT,
        paddingVertical: PROFILE_LIST_GAP,
        paddingHorizontal: SCREEN_GUTTER,
      }}
    >
      <Icon size={ROW_ICON_SIZE} color={color.text} strokeWidth={ROW_ICON_STROKE} />
      <Text fontSize="text-md" numberOfLines={1} style={{ flex: 1 }}>
        {label}
      </Text>
      {/* The mini set, not outline: at 20pt the outline chevron reads as a
          second full-weight glyph competing with the row's leading icon. */}
      <ChevronRightIcon size={ROW_ICON_SIZE} color={color.text} />
    </TouchableOpacity>
  );
}

interface ProfileSectionProps {
  title: string;
  children: React.ReactNode;
}

/**
 * A titled group of rows.
 *
 * The header is Body Bold at full contrast, not the app's usual grouped-list
 * header — the design draws these as small headings, and `role="groupHeader"`
 * would set them in dimmed, tracked caps, which this frame does not.
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
