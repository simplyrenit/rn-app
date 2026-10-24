import { Notice } from "@/components/booking/parts";
import { Button, Text } from "@/components/core";
import CustomBottomSheetModal from "@/components/core/custom-bottom-sheet-modal";
import { MIN_TOUCH_TARGET, SCREEN_GUTTER, radius, space } from "@/lib/design-tokens";
import { ShopLine, UNTICK_REASONS, UntickReason, untickCopy } from "@/lib/shop-lines";
import { useTheme } from "@/lib/theme";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import React, { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { TouchableOpacity, View } from "react-native";
import { CheckIcon } from "react-native-heroicons/mini";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface UntickSheetHandle {
  present: (line: ShopLine) => void;
}

/**
 * MR-02, "Why can't you give it?": an item unticked on the ring. Every reason means `not_available` to the server
 * (plan §4.1) and blocks one unit of the item for the dates; the reason stays on this phone, under the item's name.
 */
export const UntickSheet = forwardRef<UntickSheetHandle, { range: string; onUntick: (line: ShopLine, reason: UntickReason) => void }>(
  ({ range, onUntick }, ref) => {
    const { color, isDark } = useTheme();
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
      <CustomBottomSheetModal ref={sheet} isDark={isDark} snapPoints={[470 + insets.bottom]} frame>
        <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: space.sm, paddingBottom: insets.bottom + space.sm, gap: space.md }}>
          <Text role="sectionTitle" accessibilityRole="header">
            {line ? `Why can't you give ${line.product.title}?` : ""}
          </Text>
          {line ? (
            <Text fontSize="text-sm" tone="body">
              {`${line.ref} · ${range}`}
            </Text>
          ) : null}
          <View accessibilityRole="radiogroup" style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
            {UNTICK_REASONS.map((r) => {
              const selected = r === reason;
              return (
                <TouchableOpacity
                  key={r}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  activeOpacity={0.8}
                  onPress={() => setReason(r)}
                  style={{
                    minHeight: MIN_TOUCH_TARGET,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: space.xs,
                    paddingHorizontal: space.md,
                    borderRadius: radius.full,
                    borderWidth: selected ? 1.5 : 1,
                    borderColor: selected ? color.brand : color.line,
                    backgroundColor: selected ? color.brandWash : color.surface,
                  }}
                >
                  {selected ? <CheckIcon size={16} color={color.brandText} /> : null}
                  <Text fontSize="text-md" fontWeight="font-bold" tone={selected ? "brand" : "default"}>
                    {r}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {copy ? (
            <Notice icon="info" title={copy.title}>
              {copy.body}
            </Notice>
          ) : null}
          <View style={{ gap: space.sm }}>
            <Button
              onPress={() => {
                if (line) onUntick(line, reason);
                sheet.current?.dismiss();
              }}
            >
              Untick this item
            </Button>
            <Button variant="outline" onPress={() => sheet.current?.dismiss()}>
              Keep it ticked
            </Button>
          </View>
        </View>
      </CustomBottomSheetModal>
    );
  }
);
