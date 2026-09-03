import { BackButton, Text } from "@/components/core";
import { MIN_TOUCH_TARGET, space } from "@/lib/design-tokens";
import React from "react";
import { View } from "react-native";

interface Props {
  title: string;
  /** Defaults to popping the screen. */
  onBack?: () => void;
}

/**
 * The header on a single-purpose edit screen.
 *
 * The edit screens each hand-rolled this row, and they had drifted: the
 * unavailability editor set its title one step up the ramp from every sibling,
 * the subcategory editor used a 96pt-tall centred block with no back control in
 * it at all, and the horizontal inset was a different number on each. This is
 * the same three-box row `PostProductHeader` uses, so a title stays centred on
 * the screen and not on whatever is left over beside the arrow.
 */
export function EditStepHeader({ title, onBack }: Props) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        minHeight: MIN_TOUCH_TARGET + space.sm,
        paddingHorizontal: space.xs,
      }}
    >
      <View style={{ width: MIN_TOUCH_TARGET, alignItems: "center" }}>
        <BackButton onPress={onBack} />
      </View>

      <View style={{ flex: 1, alignItems: "center" }}>
        <Text accessibilityRole="header" role="sectionTitle" numberOfLines={1}>
          {title}
        </Text>
      </View>

      <View style={{ width: MIN_TOUCH_TARGET }} />
    </View>
  );
}
