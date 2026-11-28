import { SheetFooter, SheetHeader, Text } from "@/components/core";
import CustomBottomSheetModal from "@/components/core/custom-bottom-sheet-modal";
import { SCREEN_GUTTER, radius } from "@/lib/design-tokens";
import { RefuseReason } from "@/lib/shop-ring";
import { useTheme } from "@/lib/theme";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import React, { forwardRef, useState } from "react";
import { TouchableOpacity, View } from "react-native";
import { InformationCircleIcon } from "react-native-heroicons/outline";
import { CalendarIcon } from "react-native-heroicons/solid";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Props {
  /** The booking's days, as the frame writes them: "Tue 24 – Thu 26 Nov". */
  dates: string;
  /** A refusal is in flight: the primary spins and neither action takes a second tap. */
  busy: boolean;
  onRefuse: (reason: RefuseReason, blockDates: boolean) => void;
}

// The sheets less the 21pt home indicator, which `insets.bottom` stands in for: 2094:24052 (545) with the
// "Block these dates?" card and "Refuse only", 2094:24156 (361) for "Other".
const NOT_AVAILABLE_HEIGHT = 545 - 21;
const OTHER_HEIGHT = 361 - 21;

/** A reason row (2094:24052 `Radio · …`): 54 high, 56 selected (its stroke is 2). */
function Radio({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { color } = useTheme();
  return (
    <TouchableOpacity
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      activeOpacity={0.8}
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: radius.input,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? color.brand : color.line,
        backgroundColor: selected ? color.brandPanel : color.surface,
      }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: radius.full,
          borderWidth: 2,
          borderColor: selected ? color.brand : color.textDim,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {selected ? <View style={{ width: 10, height: 10, borderRadius: radius.full, backgroundColor: color.brand }} /> : null}
      </View>
      <Text fontSize="text-md" fontWeight="font-semibold" lineHeight={24} style={{ flex: 1 }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/**
 * SH-02, "Why can't you do it?". "Not available on these dates" offers the one
 * more tap, "Block these dates?", so the calendar is corrected on the spot: the
 * server blocks one unit for the booking's days in the same step as the refusal
 * (API-CONTRACT refuse; the frame's unit stepper and reason chips are not in it,
 * so they are not drawn). "Other" refuses and blocks nothing.
 */
export const RefuseSheet = forwardRef<BottomSheetModal, Props>(({ dates, busy, onRefuse }, ref) => {
  const { color, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [reason, setReason] = useState<RefuseReason>("not_available");
  const notAvailable = reason === "not_available";

  return (
    <CustomBottomSheetModal
      ref={ref}
      isDark={isDark}
      snapPoints={[(notAvailable ? NOT_AVAILABLE_HEIGHT : OTHER_HEIGHT) + insets.bottom]}
      frame
    >
      <SheetHeader title="Why can't you do it?" grabber={false} />
      <View style={{ paddingTop: 8, paddingHorizontal: SCREEN_GUTTER, paddingBottom: 24, gap: 16 }}>
        <View accessibilityRole="radiogroup" style={{ gap: 8 }}>
          <Radio label="Not available on these dates" selected={notAvailable} onPress={() => setReason("not_available")} />
          <Radio label="Other" selected={!notAvailable} onPress={() => setReason("other")} />
        </View>

        {notAvailable ? (
          <View style={{ gap: 8, padding: 16, borderRadius: radius.input, backgroundColor: color.surfaceMuted }}>
            <Text fontSize="text-md" fontWeight="font-semibold" lineHeight={24}>
              Block these dates?
            </Text>
            <Text fontSize="text-sm" fontWeight="font-semibold" lineHeight={20}>
              1 unit
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <CalendarIcon size={20} color={color.text} />
              <Text fontSize="text-sm" fontWeight="font-semibold" lineHeight={20}>
                {dates}
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <InformationCircleIcon size={18} color={color.textDim} />
              <Text fontSize="text-sm" lineHeight={20} tone="body" style={{ flex: 1 }}>
                So nobody else is offered this unit.
              </Text>
            </View>
          </View>
        ) : null}

        <Text fontSize="text-xs" lineHeight={16} tone="dim" style={{ textAlign: "center" }}>
          A refusal carries no penalty.
        </Text>
      </View>
      <SheetFooter
        primary={
          notAvailable
            ? { label: "Refuse and block", loading: busy, disabled: busy, onPress: () => onRefuse("not_available", true) }
            : { label: "Refuse", loading: busy, disabled: busy, onPress: () => onRefuse("other", false) }
        }
        secondary={
          notAvailable ? { label: "Refuse only", disabled: busy, onPress: () => onRefuse("not_available", false) } : undefined
        }
      />
    </CustomBottomSheetModal>
  );
});
