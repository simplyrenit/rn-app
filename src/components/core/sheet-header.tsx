import React from "react";
import { TouchableOpacity, View } from "react-native";
import { Text } from "./text";

// STUB (ENG-426 foundation): the public API below is final; Group A replaces the
// body with the kit Sheet header (figma/00 2071:14471).

export interface SheetHeaderProps {
  /** 18 Bold, left-aligned. Omit for a grabber-only header. */
  title?: string;
  /** Shows the close X (60%) on the right when given. */
  onClose?: () => void;
  /**
   * Draw the 44×5 grabber. Default true; pass false inside a sheet whose host
   * already draws one, so it is not doubled.
   */
  grabber?: boolean;
}

export function SheetHeader({ title, onClose }: SheetHeaderProps) {
  return (
    <View style={{ paddingHorizontal: 24, paddingVertical: 8 }}>
      {title ? <Text>{title}</Text> : null}
      {onClose ? (
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close" onPress={onClose}>
          <Text>×</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
