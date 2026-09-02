import { useGlobalContext } from "@/context/global-context";
import { SCREEN_GUTTER, colors, ink, radius, space } from "@/lib/design-tokens";
import React, { useCallback, useMemo, useState } from "react";
import { Modal, StyleSheet, TouchableOpacity, View } from "react-native";
import { Calendar } from "react-native-calendars";
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
}

/** Height of a day cell. The row pitch is 50pt, so the hit slop below can make
 *  up Apple's 44pt floor without two rows fighting over the same finger. */
const DAY_HEIGHT = 36;
const DAY_CAP = DAY_HEIGHT / 2;
const DAY_HIT_SLOP = { top: 4, bottom: 4, left: 4, right: 4 };

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
 * The range picker.
 *
 * Two things were badly wrong here. The card declared
 * `backgroundColor: "transparent"` in both themes, so it had no surface of its
 * own — only the embedded calendar painted a ground, and the footer did not.
 * The Confirm button underneath it starts disabled, and the old disabled style
 * was the brand at 40% opacity, so the screen behind the modal showed straight
 * through the button: "Popular categories" from the page beneath ran across the
 * word "Confirm". There was also no Cancel, and nothing said whether you were
 * picking the start of the range or its end.
 *
 * The days themselves drew each selected date as its own rounded pill, so three
 * contiguous nights read as three separate choices with gaps between them, and
 * "today" was purple text sitting beside purple-filled endpoints — one colour
 * carrying two meanings. Days now render through `dayComponent`: one continuous
 * track capped at the ends, today as a neutral ring, and a hit area that clears
 * 44pt on a cell that is tapped over and over during date entry.
 */
const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onConfirm,
  onCancel,
}) => {
  const [tempStartDate, setTempStartDate] = useState<Date | undefined>(
    startDate
  );
  const [tempEndDate, setTempEndDate] = useState<Date | undefined>(endDate);
  const { theme } = useGlobalContext();
  const isDark = theme === "dark";

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
        ? ink.onBrand()
        : isDisabled
        ? ink.dim(isDark)
        : inRange
        ? ink.brandText(isDark)
        : ink.text(isDark);

      return (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={date?.dateString}
          accessibilityState={{
            disabled: isDisabled,
            selected: inRange,
          }}
          disabled={isDisabled}
          // 36pt cells, tapped repeatedly through a whole date entry.
          hitSlop={DAY_HIT_SLOP}
          activeOpacity={0.8}
          onPress={() => onPress?.(date)}
          style={{
            // Stretched to the full column so adjacent days touch: the track is
            // one bar, capped only where the range actually starts and ends.
            alignSelf: "stretch",
            height: DAY_HEIGHT,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: inRange ? ink.brandWash(isDark) : "transparent",
            borderTopLeftRadius: marking?.rangeStart ? DAY_CAP : 0,
            borderBottomLeftRadius: marking?.rangeStart ? DAY_CAP : 0,
            borderTopRightRadius: marking?.rangeEnd ? DAY_CAP : 0,
            borderBottomRightRadius: marking?.rangeEnd ? DAY_CAP : 0,
          }}
        >
          <View
            style={{
              width: DAY_HEIGHT,
              height: DAY_HEIGHT,
              borderRadius: DAY_CAP,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: isEndpoint ? colors.dark.brand : "transparent",
              // Today is a ring and never a fill. A purple fill already means
              // "range endpoint" on this same row, and one colour cannot carry
              // two meanings.
              borderWidth: isToday && !isEndpoint ? 1.5 : 0,
              borderColor: ink.inputLine(isDark),
            }}
          >
            <Text
              fontSize="text-md"
              fontWeight={isToday || isEndpoint ? "font-semibold" : "font-normal"}
              style={{ color: textColor }}
            >
              {date?.day}
            </Text>
          </View>
        </TouchableOpacity>
      );
    },
    [isDark]
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
          style={[
            styles.container,
            { backgroundColor: ink.surface(isDark), borderColor: ink.line(isDark) },
          ]}
          onPress={() => {}}
        >
          <View style={styles.header}>
            <Text fontSize="text-md" fontWeight="font-semibold">
              When do you need it?
            </Text>
            <Text
              fontSize="text-sm"
              tone={tempStartDate && tempEndDate ? "brand" : "body"}
              style={{ marginTop: 2 }}
            >
              {prompt}
            </Text>
          </View>

          <Calendar
            markedDates={markedDates}
            dayComponent={renderDay}
            onDayPress={onDayPress}
            minDate={localToday()}
            theme={{
              backgroundColor: ink.surface(isDark),
              calendarBackground: ink.surface(isDark),
              textSectionTitleColor: ink.body(isDark),
              monthTextColor: ink.text(isDark),
              arrowColor: ink.brandText(isDark),
              // Day colours — including today's and the range's — belong to
              // `dayComponent` above; nothing here can reach them.
            }}
          />

          <View style={[styles.footer, { borderTopColor: ink.line(isDark) }]}>
            <Button variant="ghost" style={styles.footerButton} onPress={onCancel}>
              Cancel
            </Button>
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
    borderRadius: radius.group,
    borderWidth: 1,
    overflow: "hidden",
  },
  header: {
    paddingHorizontal: SCREEN_GUTTER,
    paddingTop: space.md,
    paddingBottom: space.sm,
  },
  footer: {
    flexDirection: "row",
    gap: space.sm,
    paddingHorizontal: SCREEN_GUTTER,
    paddingVertical: space.md,
    borderTopWidth: 1,
  },
  footerButton: { flex: 1 },
});

export default DateRangePicker;
