import { SubpageHeader, Text } from "@/components/core";
import { MIN_TOUCH_TARGET } from "@/lib/design-tokens";
import React from "react";
import { View } from "react-native";

/** §8.1: Add photos, Reading, Review, Preview. */
export const FLOW_STEPS = 4;

interface Props {
  title?: string;
  onBack?: () => void;
  showBack?: boolean;
}

/**
 * The listing flow's header: the kit Top bar, back and a left-aligned title (2.1, figma/10). The step bar moved
 * out of the header into the content, where every frame draws it, so it scrolls away with the page.
 */
export function FlowHeader({ title = "List an item", onBack, showBack = true }: Props) {
  if (showBack) return <SubpageHeader variant="back-title" title={title} onBack={onBack} />;
  // Preview while submitting: no way back. The kit has no arrow-less back-title and no frame draws this state,
  // so this row repeats the Top bar's numbers (56 high, 16 edge, 44 back slot, 12 gap) to keep the title at x72.
  return (
    <View style={{ height: 56, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, gap: 12 }}>
      <View style={{ width: MIN_TOUCH_TARGET }} />
      <Text accessibilityRole="header" numberOfLines={1} role="sectionTitle" style={{ flex: 1 }}>
        {title}
      </Text>
    </View>
  );
}

