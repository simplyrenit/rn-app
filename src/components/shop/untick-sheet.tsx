import { Notice } from "@/components/booking/parts";
import { Chip, SheetFooter, SheetHeader, Text } from "@/components/core";
import CustomBottomSheetModal from "@/components/core/custom-bottom-sheet-modal";
import { SCREEN_GUTTER } from "@/lib/design-tokens";
import { ShopLine, UNTICK_REASONS, UntickReason, untickCopy } from "@/lib/shop-lines";
import { useTheme } from "@/lib/theme";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import React, { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface UntickSheetHandle {
  present: (line: ShopLine) => void;
}

// 2094:24240 (515) less the 21pt home indicator, which `insets.bottom` stands in for. A longer name or notice scrolls.
const SHEET_HEIGHT = 515 - 21;

/**
 * MR-02, "Why can't you give it?": an item unticked on the ring. Every reason means `not_available` to the server
 * (plan §4.1) and blocks one unit of the item for the dates; the reason stays on this phone, under the item's name.
 */
export const UntickSheet = forwardRef<UntickSheetHandle, { range: string; onUntick: (line: ShopLine, reason: UntickReason) => void }>(
  ({ range, onUntick }, ref) => {
    const { isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const sheet = useRef<BottomSheetModal>(null);
    const [line, setLine] = useState<ShopLine | null>(null);
    const [reason, setReason] = useState<UntickReason>(UNTICK_REASONS[0]);

    useImperativeHandle(ref, () => ({
      present: (next) => {
        setLine(next);
        setReason(UNTICK_REASONS[0]);
        sheet.current?.present();
      },
    }));

    const copy = line ? untickCopy(line, range) : null;
    return (
      <CustomBottomSheetModal ref={sheet} isDark={isDark} snapPoints={[SHEET_HEIGHT + insets.bottom]} frame>
        <SheetHeader title={line ? `Why can't you give ${line.product.title}?` : ""} grabber={false} />
        <View style={{ paddingTop: 8, paddingHorizontal: SCREEN_GUTTER, paddingBottom: 24, gap: 16 }}>
          {line ? (
            <Text fontSize="text-sm" lineHeight={20} tone="body">
              {`${line.ref} · ${range}`}
            </Text>
          ) : null}
          {/* Kit Chips; the role and state sit on a wrapper, as the kit Chip forces role "button" (plan: chip wrapper). */}
          <View accessibilityRole="radiogroup" style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {UNTICK_REASONS.map((r) => (
              <View key={r} accessible accessibilityRole="radio" accessibilityLabel={r} accessibilityState={{ selected: r === reason }}>
                <Chip label={r} selected={r === reason} onPress={() => setReason(r)} />
              </View>
            ))}
          </View>
          {copy ? (
            <Notice icon="info" title={copy.title}>
              {copy.body}
            </Notice>
          ) : null}
        </View>
        <SheetFooter
          primary={{
            label: "Untick this item",
            onPress: () => {
              if (line) onUntick(line, reason);
              sheet.current?.dismiss();
            },
          }}
          secondary={{ label: "Keep it ticked", onPress: () => sheet.current?.dismiss() }}
        />
      </CustomBottomSheetModal>
    );
  }
);
