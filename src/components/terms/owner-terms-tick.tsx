import { Text } from "@/components/core";
import { CheckBox } from "@/components/core/checkbox";
import React from "react";
import { View } from "react-native";

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Opens the terms. The words "owner terms" are the link. */
  onOpenTerms: () => void;
}

/**
 * The owner's terms tick: at merchant sign-up and at the start of a listing.
 * One row so both places say the same words.
 */
export function OwnerTermsTick({ checked, onChange, onOpenTerms }: Props) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <CheckBox
        checked={checked}
        onPress={() => onChange(!checked)}
        accessibilityLabel="I accept the owner terms"
      />
      <Text tone="body" style={{ flex: 1, marginLeft: 8 }}>
        {"I accept the "}
        <Text
          tone="brand"
          fontWeight="font-bold"
          accessibilityRole="link"
          style={{ textDecorationLine: "underline" }}
          onPress={onOpenTerms}
        >
          owner terms
        </Text>
      </Text>
    </View>
  );
}
