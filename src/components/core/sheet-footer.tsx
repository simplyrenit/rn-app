import React from "react";
import { View } from "react-native";
import type { BarAction } from "./bottom-bar";
import { Button } from "./button";

// STUB (ENG-426 foundation): the public API below is final; Group A replaces the
// body with the kit Sheet footer (figma/00 2071:14481; link below the primary).

export interface SheetFooterProps {
  /** The sheet's one filled button, 52 full width. */
  primary: BarAction;
  /** Optional text link below the primary: "Cancel", "Reset". */
  secondary?: BarAction;
}

export function SheetFooter({ primary, secondary }: SheetFooterProps) {
  return (
    <View style={{ padding: 16 }}>
      <Button
        onPress={primary.onPress}
        disabled={primary.disabled}
        loading={primary.loading}
        accessibilityLabel={primary.accessibilityLabel}
      >
        {primary.label}
      </Button>
      {secondary ? (
        <Button variant="ghost" onPress={secondary.onPress} disabled={secondary.disabled}>
          {secondary.label}
        </Button>
      ) : null}
    </View>
  );
}
