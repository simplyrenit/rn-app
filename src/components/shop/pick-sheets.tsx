import { Text } from "@/components/core";
import CustomBottomSheetModal from "@/components/core/custom-bottom-sheet-modal";
import { MIN_TOUCH_TARGET, SCREEN_GUTTER, radius, space } from "@/lib/design-tokens";
import { selectionFeedback } from "@/lib/haptics";
import { noticeLabel, noticeOptions, slotsWith, time12 } from "@/lib/shop";
import { useTheme } from "@/lib/theme";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import React, { forwardRef } from "react";
import { TouchableOpacity, View, useWindowDimensions } from "react-native";
import { CheckIcon } from "react-native-heroicons/outline";

/** The title and the sentence under it that open both sheets. */
function SheetHeading({ title, body }: { title: string; body?: string }) {
  return (
    <View style={{ gap: space.xs, marginBottom: space.md }}>
      <Text role="sectionTitle" accessibilityRole="header">
        {title}
      </Text>
      {body ? (
        <Text fontSize="text-md" tone="body">
          {body}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * "Shortest notice": how far ahead a customer must book. A list, because the
 * server takes 0 to 168 hours and an owner thinks in a few round numbers; a
 * value set on the dashboard (say 5) stays in the list.
 */
export const NoticeSheet = forwardRef<
  BottomSheetModal,
  { value: number; onSelect: (hours: number) => void }
>(({ value, onSelect }, ref) => {
  const { color, isDark } = useTheme();
  return (
    <CustomBottomSheetModal ref={ref} isDark={isDark} snapPoints={["75%"]} frame>
      <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: space.sm, paddingBottom: space.xl }}>
        <SheetHeading
          title="Shortest notice"
          body="How far ahead a customer has to book. Three hours unless you change it."
        />
        {noticeOptions(value).map((hours) => {
          const selected = hours === value;
          return (
            <TouchableOpacity
              key={hours}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={noticeLabel(hours)}
              activeOpacity={0.7}
              onPress={() => {
                selectionFeedback();
                onSelect(hours);
              }}
              style={{
                minHeight: MIN_TOUCH_TARGET,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottomWidth: 1,
                borderBottomColor: color.line,
              }}
            >
              <Text fontSize="text-md" fontWeight={selected ? "font-bold" : "font-normal"}>
                {noticeLabel(hours)}
              </Text>
              {selected ? <CheckIcon size={20} color={color.brandText} strokeWidth={2} /> : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </CustomBottomSheetModal>
  );
});
NoticeSheet.displayName = "NoticeSheet";

const COLUMNS = 4;
const GAP = space.sm;

/**
 * One time of day, every half hour, as a grid so the whole day is in view
 * instead of a list to scroll to 8 pm. Opened for opening or closing time; the
 * caller says which in `title`.
 */
export const TimeSheet = forwardRef<
  BottomSheetModal,
  { title: string; value: string | null; onSelect: (time: string) => void }
>(({ title, value, onSelect }, ref) => {
  const { color, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const chip = Math.floor((width - SCREEN_GUTTER * 2 - GAP * (COLUMNS - 1)) / COLUMNS);
  return (
    <CustomBottomSheetModal ref={ref} isDark={isDark} snapPoints={["85%"]} frame>
      <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: space.sm, paddingBottom: space.xl }}>
        <SheetHeading title={title} />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: GAP }}>
          {slotsWith(value).map((time) => {
            const selected = time === value;
            return (
              <TouchableOpacity
                key={time}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={time12(time)}
                activeOpacity={0.7}
                onPress={() => {
                  selectionFeedback();
                  onSelect(time);
                }}
                style={{
                  width: chip,
                  minHeight: MIN_TOUCH_TARGET,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: radius.input,
                  borderWidth: 1,
                  borderColor: selected ? color.brand : color.line,
                  backgroundColor: selected ? color.brand : color.surface,
                }}
              >
                <Text
                  fontSize="text-sm"
                  fontWeight={selected ? "font-bold" : "font-normal"}
                  style={{ color: selected ? color.onBrand : color.text }}
                >
                  {time12(time)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </CustomBottomSheetModal>
  );
});
TimeSheet.displayName = "TimeSheet";

