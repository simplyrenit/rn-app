import { Text } from "@/components/core";
import { CheckBox } from "@/components/core/checkbox";
import React from "react";
import { View } from "react-native";

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Opens the terms. The linked words are the link. */
  onOpenTerms: () => void;
}

/**
 * A terms tick: a box and one sentence whose last words open the terms. One row
 * for every tick in the app, so they all read and behave the same.
 */
export function TermsTick({
  checked,
  onChange,
  onOpenTerms,
  lead,
  link,
}: Props & {
  /** The words before the link: "I accept the ". */
  lead: string;
  /** The linked words: "owner terms". */
  link: string;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <CheckBox checked={checked} onPress={() => onChange(!checked)} accessibilityLabel={`${lead}${link}`} />
      <Text tone="body" style={{ flex: 1, marginLeft: 8 }}>
        {lead}
        <Text
          tone="brand"
          fontWeight="font-bold"
          accessibilityRole="link"
          style={{ textDecorationLine: "underline" }}
          onPress={onOpenTerms}
        >
          {link}
        </Text>
      </Text>
    </View>
  );
}

/** The owner's terms tick: at merchant sign-up and at the start of a listing. */
export function OwnerTermsTick(props: Props) {
  return <TermsTick lead="I accept the " link="owner terms" {...props} />;
}

/** The customer's tick on the price screen, before Book now (BK-03). */
export function RentalTermsTick(props: Props) {
  return <TermsTick lead="I agree to Renit's " link="rental terms" {...props} />;
}
