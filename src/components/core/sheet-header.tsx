import { radius } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import React from "react";
import { TouchableOpacity, View } from "react-native";
import { XMarkIcon } from "react-native-heroicons/outline";
import { Text } from "./text";

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

// The kit's Sheet header (figma/00 2071:14471): a 21pt grabber row (8 / 5 / 8),
// a 44pt title row padded 24 at the sides, and 8 below it.
const CLOSE_SIZE = 24;
// The X is a 24pt glyph; the slop takes its touch area to the 44pt floor.
const CLOSE_SLOP = 10;

/**
 * The 2.1 kit's Sheet header. Inside `CustomBottomSheetModal` pass
 * `grabber={false}`: gorhom draws the handle there (restyled to this grabber),
 * and drawing it here too would double it.
 */
export function SheetHeader({ title, onClose, grabber = true }: SheetHeaderProps) {
  const { color } = useTheme();
  return (
    <View
      style={[
        { paddingBottom: 8, backgroundColor: color.surface },
        // Standalone, the header is the sheet's top edge, so it carries the radius.
        grabber ? { borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet } : null,
      ]}
    >
      {grabber ? (
        <View style={{ paddingVertical: 8, alignItems: "center" }}>
          <View style={{ width: 44, height: 5, borderRadius: radius.full, backgroundColor: color.line }} />
        </View>
      ) : null}
      {title || onClose ? (
        <View
          style={{
            // minHeight, not height: a long dynamic title (ConfirmSheet on Today)
            // wraps to a second line rather than clipping.
            minHeight: 44,
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 24,
            gap: 12,
          }}
        >
          <Text role="sectionTitle" accessibilityRole="header" style={{ flex: 1 }}>
            {title}
          </Text>
          {onClose ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              hitSlop={CLOSE_SLOP}
            >
              <XMarkIcon size={CLOSE_SIZE} color={color.textDim} />
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
