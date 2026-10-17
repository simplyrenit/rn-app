import { Button, Text } from "@/components/core";
import CustomBottomSheetModal from "@/components/core/custom-bottom-sheet-modal";
import { MIN_TOUCH_TARGET, SCREEN_GUTTER, radius, space } from "@/lib/design-tokens";
import { RefuseReason } from "@/lib/shop-ring";
import { useTheme } from "@/lib/theme";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import React, { forwardRef, useState } from "react";
import { TouchableOpacity, View } from "react-native";
import { CalendarIcon, InformationCircleIcon } from "react-native-heroicons/outline";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Props {
  /** The booking's days, as the frame writes them: "Sat 24 – Mon 26 Oct". */
  dates: string;
  /** A refusal is in flight: both buttons spin and a second tap does nothing. */
  busy: boolean;
  onRefuse: (reason: RefuseReason, blockDates: boolean) => void;
}

function Radio({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { color } = useTheme();
  return (
    <TouchableOpacity
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      activeOpacity={0.8}
      onPress={onPress}
      style={{
        minHeight: MIN_TOUCH_TARGET + 10,
        flexDirection: "row",
        alignItems: "center",
        gap: space.sm,
        paddingHorizontal: space.md,
        borderRadius: radius.input,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? color.brand : color.line,
        backgroundColor: selected ? color.brandWash : color.surface,
      }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: radius.full,
          borderWidth: 2,
          borderColor: selected ? color.brand : color.inputLine,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {selected ? <View style={{ width: 10, height: 10, borderRadius: radius.full, backgroundColor: color.brand }} /> : null}
      </View>
      <Text fontSize="text-md" fontWeight="font-bold">
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
    <CustomBottomSheetModal ref={ref} isDark={isDark} snapPoints={[(notAvailable ? 560 : 330) + insets.bottom]} frame>
      <View
        style={{
          paddingHorizontal: SCREEN_GUTTER,
          paddingTop: space.sm,
          paddingBottom: insets.bottom + space.sm,
          gap: space.md,
        }}
      >
        <Text role="sectionTitle" accessibilityRole="header">
          Why can't you do it?
        </Text>
        <View accessibilityRole="radiogroup" style={{ gap: space.sm }}>
          <Radio
            label="Not available on these dates"
            selected={notAvailable}
            onPress={() => setReason("not_available")}
          />
          <Radio label="Other" selected={!notAvailable} onPress={() => setReason("other")} />
        </View>

        {notAvailable ? (
          <View
            style={{
              gap: space.sm,
              padding: space.md,
              borderRadius: radius.card,
              backgroundColor: color.surfaceRaised,
            }}
          >
            <Text fontSize="text-md" fontWeight="font-bold">
              Block these dates?
            </Text>
            <Text fontSize="text-md" fontWeight="font-bold">
              1 unit
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
              <CalendarIcon size={20} color={color.text} />
              <Text fontSize="text-sm" fontWeight="font-bold">
                {dates}
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
              <InformationCircleIcon size={18} color={color.textDim} />
              <Text fontSize="text-sm" tone="body" style={{ flex: 1 }}>
                So nobody else is offered this unit.
              </Text>
            </View>
          </View>
        ) : null}

        <View style={{ gap: space.sm }}>
          {notAvailable ? (
            <>
              <Button loading={busy} disabled={busy} onPress={() => onRefuse("not_available", true)}>
                Refuse and block
              </Button>
              <Button variant="outline" disabled={busy} onPress={() => onRefuse("not_available", false)}>
                Refuse only
              </Button>
            </>
          ) : (
            <Button loading={busy} disabled={busy} onPress={() => onRefuse("other", false)}>
              Refuse
            </Button>
          )}
          <Text fontSize="text-sm" tone="dim" style={{ textAlign: "center" }}>
            A refusal carries no penalty.
          </Text>
        </View>
      </View>
    </CustomBottomSheetModal>
  );
});
