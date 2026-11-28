import { Chip, SheetHeader, Text } from "@/components/core";
import CustomBottomSheetModal from "@/components/core/custom-bottom-sheet-modal";
import { SCREEN_GUTTER } from "@/lib/design-tokens";
import { selectionFeedback } from "@/lib/haptics";
import { noticeLabel, noticeOptions, slotsWith, time12 } from "@/lib/shop";
import { useTheme } from "@/lib/theme";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import React, { forwardRef } from "react";
import { TouchableOpacity, View, useWindowDimensions } from "react-native";
import { CheckIcon } from "react-native-heroicons/outline";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Every section 12 sheet hides the kit header's close X and ends in a 42 strip: 8 of its own and the 34 home
// indicator, which `insets.bottom` stands in for. The snaps are the frames' sheet heights less that 34, plus the
// inset, so each sheet's top lands where the frame draws it.
const HOME_STRIP = 34;
const END_PAD = 8;
// Sheet · Shortest notice (2096:29485) and Sheet · Monday opens at (2096:30129).
const NOTICE_SHEET = 643;
const TIME_SHEET = 683;
const OPTION_HEIGHT = 48;

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
  const insets = useSafeAreaInsets();
  return (
    <CustomBottomSheetModal ref={ref} isDark={isDark} snapPoints={[NOTICE_SHEET - HOME_STRIP + insets.bottom]} frame>
      <SheetHeader title="Shortest notice" grabber={false} />
      <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingBottom: END_PAD + insets.bottom }}>
        <Text fontSize="text-sm" tone="body" style={{ marginBottom: 8 }}>
          How far ahead a customer has to book. Three hours unless you change it.
        </Text>
        {/* 48 rows with a hairline under each; the chosen one SemiBold brand with an outline check 20 at the end. */}
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
                height: OPTION_HEIGHT,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottomWidth: 1,
                borderBottomColor: color.line,
              }}
            >
              <Text
                fontSize="text-md"
                fontWeight={selected ? "font-semibold" : "font-normal"}
                tone={selected ? "brand" : "default"}
              >
                {noticeLabel(hours)}
              </Text>
              {selected ? <CheckIcon size={20} color={color.brandText} strokeWidth={1.5} /> : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </CustomBottomSheetModal>
  );
});
NoticeSheet.displayName = "NoticeSheet";

const COLUMNS = 4;
const GAP = 8;

/**
 * One time of day, every half hour, as a grid so the whole day is in view
 * instead of a list to scroll to 8 pm. Opened for opening or closing time; the
 * caller says which in `title`.
 */
export const TimeSheet = forwardRef<
  BottomSheetModal,
  { title: string; value: string | null; onSelect: (time: string) => void }
>(({ title, value, onSelect }, ref) => {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  // Four kit Chips across the content width, 8 apart: 79.5 at 390 (not floored, so the row ends on the gutter). Less
  // 0.01 so float rounding at a fractional Android width (411.43) never pushes the 4th chip onto the next row.
  const chip = (width - SCREEN_GUTTER * 2 - GAP * (COLUMNS - 1)) / COLUMNS - 0.01;
  return (
    <CustomBottomSheetModal ref={ref} isDark={isDark} snapPoints={[TIME_SHEET - HOME_STRIP + insets.bottom]} frame>
      <SheetHeader title={title} grabber={false} />
      <View
        style={{
          paddingHorizontal: SCREEN_GUTTER,
          paddingBottom: END_PAD + insets.bottom,
          flexDirection: "row",
          flexWrap: "wrap",
          gap: GAP,
        }}
      >
        {slotsWith(value).map((time) => {
          const selected = time === value;
          return (
            <Chip
              key={time}
              label={time12(time)}
              width={chip}
              selected={selected}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={time12(time)}
              // 40 high: 2 above and below make the 44pt target.
              hitSlop={{ top: 2, bottom: 2 }}
              onPress={() => {
                selectionFeedback();
                onSelect(time);
              }}
            />
          );
        })}
      </View>
    </CustomBottomSheetModal>
  );
});
TimeSheet.displayName = "TimeSheet";
