import { Text } from "@/components/core/text";
import { useTypedNavigation } from "@/lib/types";
import React from "react";
import { TouchableOpacity, View } from "react-native";

// 02 Welcome "TermsAndPolicy" (2089:15437): a 12/16 `textDim` line, 2 above a row of two
// SemiBold underlined `textBody` links and a dim "&", 4 apart. The links draw 16 high, so the
// slop keeps them tappable.
const LINK_SLOP = { top: 12, bottom: 12, left: 4, right: 4 };

export function TermsAndPolicy(): JSX.Element {
  const router = useTypedNavigation();

  const Link = ({ label, to }: { label: string; to: "Terms" | "Privacy" }) => (
    <TouchableOpacity onPress={() => router.navigate(to)} hitSlop={LINK_SLOP} accessibilityRole="link">
      <Text
        fontSize="text-xs"
        fontWeight="font-semibold"
        lineHeight={16}
        tone="body"
        style={{ textDecorationLine: "underline" }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    // The link row wraps: at 360dp with a larger font it breaks before "Privacy Policy"
    // instead of running off the screen edge.
    <View style={{ width: "100%", alignItems: "center", gap: 2 }}>
      <Text fontSize="text-xs" lineHeight={16} tone="dim" style={{ textAlign: "center" }}>
        By continuing you agree to Renit’s
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 4 }}>
        <Link label="Terms & Conditions" to="Terms" />
        <Text fontSize="text-xs" lineHeight={16} tone="dim">
          &
        </Text>
        <Link label="Privacy Policy" to="Privacy" />
      </View>
    </View>
  );
}
