import { LONGEST_BOOKING_DAYS, addDays } from "@/lib/booking";
import { SCREEN_GUTTER, ink, radius } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import React, { useCallback, useMemo, useState } from "react";
import { Modal, StyleSheet, TouchableOpacity, View } from "react-native";
import { Calendar } from "react-native-calendars";
import { ChevronLeftIcon, ChevronRightIcon } from "react-native-heroicons/outline";
import { Button } from "./button";
import { Text } from "./text";

interface DateRangePickerProps {
  startDate?: Date;
  endDate?: Date;
  onConfirm: ({
    startDate,
    endDate,
  }: {
    startDate: Date;
    endDate: Date;
  }) => void;
  onCancel: () => void;
  /** The last start day the calendar offers, as days from today (decision T-25: 180); the end may be a year after the start (ENG-281). */
  maxDaysAhead?: number;
}

// Figma 2089:29905. A 342 card padded 24 around a 294 calendar: 40pt month
// and weekday rows, then 42x40 day cells, every row 4 apart. A picked end is a
// 36 brand disc on a brandPanel band that runs through the range and is capped
// (20) on its outer side.
const CARD_PADDING = 24;
const CARD_GAP = 16;
const ROW_HEIGHT = 40;
const ROW_GAP = 4;
const DISC = 36;
const BAND_CAP = 20;
const CHEVRON = 20;
const FOOTER_HEIGHT = 52;
const FOOTER_GAP = 12;
/** A day cell is 40 high in a 44 row pitch; the slop makes up Apple's 44pt floor. */
const DAY_HIT_SLOP = { top: 2, bottom: 2, left: 0, right: 0 };
/** The frame's single-letter weekdays. Local, not `LocaleConfig`, which is global to every calendar in the app. */
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

const dayLabel = (date?: Date) =>
  date
    ? date.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
      })
    : null;

/** `YYYY-MM-DD` for a Date the calendar produced (they are UTC midnight). */
const toISODate = (date: Date) => date.toISOString().split("T")[0];

/**
 * Today in the *device's* calendar. `new Date().toISOString()` is UTC, which
 * in IST names yesterday for the first five and a half hours of every day —
 * long enough for `minDate` to disagree with the cell the calendar itself
 * marks as today.
 */
const localToday = () => {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
};

const generateRange = (start: string, end: string): string[] => {
  const range: string[] = [];
  const currentDate = new Date(start);
  const endDate = new Date(end);

  while (currentDate <= endDate) {
    range.push(toISODate(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return range;
};

/**
 * The month row and the weekday row, drawn as the frame has them: brand
 * chevrons either side of the month, then single-letter weekdays. A custom
 * header so the letters stay local to this picker.
 */
function PickerHeader({ month, addMonth }: { month?: { toString(format: string): string }; addMonth?: (count: number) => void }) {
  const { color } = useTheme();
  const arrow = (count: number, label: string, Icon: typeof ChevronLeftIcon) => (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => addMonth?.(count)}
      hitSlop={12}
    >
      <Icon color={color.brandText} size={CHEVRON} strokeWidth={1.5} />
    </TouchableOpacity>
  );
  return (
    <View>
      <View style={{ height: ROW_HEIGHT, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        {arrow(-1, "Previous month", ChevronLeftIcon)}
        <Text fontSize="text-md" fontWeight="font-semibold" accessibilityRole="header">
          {month?.toString("MMMM yyyy")}
        </Text>
        {arrow(1, "Next month", ChevronRightIcon)}
      </View>
      <View style={{ height: ROW_HEIGHT, marginTop: ROW_GAP, flexDirection: "row" }}>
        {WEEKDAYS.map((day, index) => (
          <View key={index} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Text fontSize="text-xs" fontWeight="font-medium" tone="dim" allowFontScaling={false}>
              {day}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * The range picker.
 *
 * The card is a real surface, so nothing behind the modal shows through the
 * Confirm button (the old disabled style let the page bleed through it), and it
 * has a Cancel and a line that says which end of the range the next tap sets.
 *
 * Days render through `dayComponent`: one continuous band capped at the ends,
 * so three contiguous nights read as one choice, and a hit area that clears
 * 44pt on a cell that is tapped over and over during date entry. Today is the
 * brand numeral (Figma 2089:29905), never a fill: a purple fill means "range end".
 */
const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onConfirm,
  onCancel,
  maxDaysAhead,
}) => {
  const [tempStartDate, setTempStartDate] = useState<Date | undefined>(
    startDate
  );
  const [tempEndDate, setTempEndDate] = useState<Date | undefined>(endDate);
  const { color, isDark } = useTheme();

  const onDayPress = (day: { dateString: string }) => {
    const picked = new Date(day.dateString);

    // A tap before the current start is a new start, not an invalid end —
    // which is what picking an earlier date obviously means.
    if (!tempStartDate || tempEndDate || picked < tempStartDate) {
      setTempStartDate(picked);
      setTempEndDate(undefined);
      return;
    }

    setTempEndDate(picked);
  };

  const markedDates = useMemo(() => {
    if (!tempStartDate) return {};

    const start = toISODate(tempStartDate);
    const end = tempEndDate ? toISODate(tempEndDate) : start;
    const dates = generateRange(start, end);

    return dates.reduce<Record<string, any>>((marks, iso, index) => {
      marks[iso] = {
        inRange: true,
        rangeStart: index === 0,
        rangeEnd: index === dates.length - 1,
      };
      return marks;
    }, {});
  }, [tempStartDate, tempEndDate]);

  const renderDay = useCallback(
    ({ date, state, marking, onPress }: any) => {
      const inRange = Boolean(marking?.inRange);
      const isEndpoint = Boolean(marking?.rangeStart || marking?.rangeEnd);
      const isDisabled = state === "disabled";
      const isToday = state === "today";

      const textColor = isEndpoint
        ? color.onBrand
        : isDisabled
        ? color.textDim
        : isToday
        ? color.brandText
        : color.text;

      return (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={date?.dateString}
          accessibilityState={{
            disabled: isDisabled,
            selected: inRange,
          }}
          disabled={isDisabled}
          hitSlop={DAY_HIT_SLOP}
          activeOpacity={0.8}
          onPress={() => onPress?.(date)}
          style={{
            // Stretched to the full column so adjacent days touch: the band is
            // one bar, capped only where the range actually starts and ends.
            alignSelf: "stretch",
            height: ROW_HEIGHT,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: inRange ? color.brandPanel : "transparent",
            borderTopLeftRadius: marking?.rangeStart ? BAND_CAP : 0,
            borderBottomLeftRadius: marking?.rangeStart ? BAND_CAP : 0,
            borderTopRightRadius: marking?.rangeEnd ? BAND_CAP : 0,
            borderBottomRightRadius: marking?.rangeEnd ? BAND_CAP : 0,
          }}
        >
          <View
            style={{
              width: DISC,
              height: DISC,
              borderRadius: DISC / 2,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: isEndpoint ? color.brand : "transparent",
            }}
          >
            <Text
              fontSize="text-sm"
              fontWeight={isToday || isEndpoint ? "font-semibold" : "font-normal"}
              style={{ color: textColor }}
            >
              {date?.day}
            </Text>
          </View>
        </TouchableOpacity>
      );
    },
    [color]
  );

  const handleConfirm = () => {
    if (tempStartDate && tempEndDate) {
      onConfirm({ startDate: tempStartDate, endDate: tempEndDate });
    }
  };

  // Says which end of the range the next tap will set, and echoes what has been
  // chosen so far. Previously the customer had no way to tell either.
  const prompt = !tempStartDate
    ? "Pick a start date"
    : !tempEndDate
    ? "Pick an end date"
    : `${dayLabel(tempStartDate)} — ${dayLabel(tempEndDate)}`;

  return (
    <Modal
        // Android: draw under the status bar too, so the scrim covers it and
        // insets.top means the same thing as on iOS.
        statusBarTranslucent
      visible={true}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <TouchableOpacity
        style={[styles.modalBackground, { backgroundColor: ink.scrim(isDark) }]}
        activeOpacity={1}
        accessibilityLabel="Dismiss date picker"
        onPress={onCancel}
      >
        <TouchableOpacity
          activeOpacity={1}
          // A real surface. Everything inside now composites against this and
          // not against the page behind the modal.
          style={[styles.container, { backgroundColor: color.surface }]}
          onPress={() => {}}
        >
          <View style={{ gap: ROW_GAP }}>
            <Text role="sectionTitle">When do you need it?</Text>
            <Text
              fontSize="text-sm"
              fontWeight="font-semibold"
              tone={tempStartDate && tempEndDate ? "brand" : "body"}
            >
              {prompt}
            </Text>
          </View>

          <Calendar
            markedDates={markedDates}
            dayComponent={renderDay}
            customHeader={PickerHeader}
            // The frame leaves the cells outside the month empty.
            hideExtraDays
            onDayPress={onDayPress}
            minDate={localToday()}
            // A day past the limit is greyed and cannot be tapped (the server would refuse it): a start within
            // `maxDaysAhead`, then an end up to a year after it (ENG-281).
            maxDate={
              maxDaysAhead
                ? tempStartDate && !tempEndDate
                  ? addDays(toISODate(tempStartDate), LONGEST_BOOKING_DAYS - 1)
                  : addDays(localToday(), maxDaysAhead)
                : undefined
            }
            theme={
              {
                calendarBackground: color.surface,
                // The library pads its month 5pt a side and its weeks 7pt apart;
                // the frame's calendar is flush and 4 apart.
                "stylesheet.calendar.main": {
                  container: { paddingLeft: 0, paddingRight: 0 },
                  week: { marginTop: ROW_GAP, marginBottom: 0, flexDirection: "row", justifyContent: "space-around" },
                },
              } as any
            }
          />

          <View style={styles.footer}>
            {/* The kit's Sheet footer link (SemiBold 14/20), not the Bold ghost
                Button; 52 high so its target matches the Confirm beside it. */}
            <TouchableOpacity
              accessibilityRole="button"
              onPress={onCancel}
              style={[styles.footerButton, { alignItems: "center", justifyContent: "center" }]}
            >
              <Text fontSize="text-sm" fontWeight="font-semibold" tone="brand">
                Cancel
              </Text>
            </TouchableOpacity>
            <Button
              disabled={!tempStartDate || !tempEndDate}
              style={styles.footerButton}
              onPress={handleConfirm}
            >
              Confirm
            </Button>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SCREEN_GUTTER,
  },
  container: {
    width: "100%",
    borderRadius: radius.card,
    padding: CARD_PADDING,
    gap: CARD_GAP,
    overflow: "hidden",
  },
  footer: {
    flexDirection: "row",
    gap: FOOTER_GAP,
  },
  footerButton: { flex: 1, minHeight: FOOTER_HEIGHT },
});

export default DateRangePicker;
