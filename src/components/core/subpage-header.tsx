import { MIN_TOUCH_TARGET } from "@/lib/design-tokens";
import React from "react";
import { View } from "react-native";
import { BackButton } from "./back-button";
import { Text } from "./text";

// Measured off the Figma sub-page frames (FAQs, Contact Us, Who we are, Terms and
// Privacy): the back control sits 16 from the screen edge, not on the 24 gutter the
// content uses, and the title is centred at 18 bold in a 44pt row.
const BACK_INSET = 16;

/**
 * The header the profile sub-pages share: a 44pt row with a centred 18pt bold title
 * and a back control 16pt from the edge.
 */
export function SubpageHeader({ title }: { title: string }) {
  return (
    <View
      style={{
        height: MIN_TOUCH_TARGET,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* First in the tree so VoiceOver reads the back control before the title. */}
      <View style={{ position: "absolute", left: BACK_INSET, top: 0 }}>
        <BackButton />
      </View>
      <Text accessibilityRole="header" fontSize="text-base" fontWeight="font-bold">
        {title}
      </Text>
    </View>
  );
}
