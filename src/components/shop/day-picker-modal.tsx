import { Button, Text } from "@/components/core";
import { SCREEN_GUTTER, fontFamily } from "@/lib/design-tokens";
import { dayLabel } from "@/lib/shop";
import { useTheme } from "@/lib/theme";
import React, { useState } from "react";
import { Modal, StyleSheet, TouchableOpacity, View } from "react-native";
import { Calendar } from "react-native-calendars";
import { ChevronLeftIcon, ChevronRightIcon } from "react-native-heroicons/mini";

interface Props {
  /** The day now set, `YYYY-MM-DD`, or null. */
  value: string | null;
  /** The earliest day that can be picked, `YYYY-MM-DD`. */
  minDate: string;
  /** The last day that can be picked, when there is one (ending a rental early: the end of the current month). */
  maxDate?: string;
  onPick: (day: string) => void;
  /** Present when a day is set: clears it. */
  onClear?: () => void;
  onCancel: () => void;
  /** The heading. "Closed until" is what this was made for. */
  title?: string;
  /** The line under it, from the day now picked. */
  line?: (picked: string | null) => string;
}

const closedUntilLine = (picked: string | null) =>
  picked ? `You open again on ${dayLabel(picked)}.` : "Pick the day you open again.";

// The frame's day cell (2094:22168): 40 round, seven to a 308 row with the space between them.
const CELL = 40;

/**
 * One day, for "Closed until". The range picker next door picks two; this is the
 * same modal surface with a single selected day, because Closed until is a day
 * the shop opens on, not a stretch.
 *
 * Drawn to 2094:22168 (`Modal · Extend until`): a 342 card, r16, a hairline; the heading padded 20/24/8 with its
 * line 2 under it; the month padded 8/16/12 (a 36 month row, 40 weekday and day rows, 4 apart); a hairline, then the
 * footer padded 16/24 with two 52 buttons 8 apart. The month's today marker is the library's, from the phone's clock.
 */
export function DayPickerModal({
  value,
  minDate,
  maxDate,
  onPick,
  onClear,
  onCancel,
  title = "Closed until",
  line = closedUntilLine,
}: Props) {
  const { color } = useTheme();
  const [picked, setPicked] = useState<string | null>(value);

  // react-native-calendars takes its inner styles by stylesheet key; these keys are not in its `Theme` type.
  const stylesheets = {
    "stylesheet.calendar.main": {
      container: { paddingLeft: 0, paddingRight: 0, backgroundColor: color.surface },
      week: { marginTop: 4, marginBottom: 0, flexDirection: "row", justifyContent: "space-between" },
      dayContainer: { width: CELL, alignItems: "center" },
      emptyDayContainer: { width: CELL },
    },
    "stylesheet.calendar.header": {
      header: {
        height: 36,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: 4,
        paddingBottom: 8,
        paddingHorizontal: 4,
        marginTop: 0,
      },
      monthText: { margin: 0, fontSize: 16, lineHeight: 24, fontFamily: fontFamily.semibold, color: color.text },
      // A 20 chevron in a 44 target that takes no room of its own.
      arrow: { padding: 12, margin: -12 },
      week: { marginTop: 4, height: CELL, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
      dayHeader: {
        width: CELL,
        marginTop: 0,
        marginBottom: 0,
        textAlign: "center",
        fontSize: 12,
        lineHeight: 16,
        fontFamily: fontFamily.medium,
        color: color.textDim,
      },
    },
    "stylesheet.day.basic": {
      base: { width: CELL, height: CELL, alignItems: "center", justifyContent: "center" },
      text: { marginTop: 0, fontSize: 14, lineHeight: 20, fontFamily: fontFamily.medium, color: color.text },
      selected: { backgroundColor: color.brand, borderRadius: CELL / 2 },
      selectedText: { color: color.onBrand, fontFamily: fontFamily.semibold },
      // A day before the first that can be picked: Regular at 60%, at 60% again.
      disabledText: { color: color.textDim, fontFamily: fontFamily.regular, opacity: 0.6 },
    },
  } as object;

  return (
    <Modal
        // Android: draw under the status bar too, so the scrim covers it and
        // insets.top means the same thing as on iOS.
        statusBarTranslucent visible transparent animationType="fade" onRequestClose={onCancel}>
      <TouchableOpacity
        style={[styles.backdrop, { backgroundColor: color.scrim }]}
        activeOpacity={1}
        accessibilityLabel="Dismiss date picker"
        onPress={onCancel}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={[styles.card, { backgroundColor: color.surface, borderColor: color.line }]}
          onPress={() => {}}
        >
          <View style={styles.heading}>
            <Text role="sectionTitle" accessibilityRole="header">
              {title}
            </Text>
            <Text fontSize="text-sm" lineHeight={20} tone="body">
              {line(picked)}
            </Text>
          </View>
          <View style={styles.month}>
            <Calendar
              current={picked ?? minDate}
              minDate={minDate}
              maxDate={maxDate}
              hideExtraDays
              markedDates={picked ? { [picked]: { selected: true } } : {}}
              onDayPress={(day: { dateString: string }) => setPicked(day.dateString)}
              renderArrow={(direction: "left" | "right") =>
                direction === "left" ? (
                  <ChevronLeftIcon size={20} color={color.brandText} />
                ) : (
                  <ChevronRightIcon size={20} color={color.brandText} />
                )
              }
              theme={{
                backgroundColor: color.surface,
                calendarBackground: color.surface,
                textSectionTitleColor: color.textDim,
                monthTextColor: color.text,
                arrowColor: color.brandText,
                dayTextColor: color.text,
                textDisabledColor: color.textDim,
                todayTextColor: color.brandText,
                selectedDayBackgroundColor: color.brand,
                selectedDayTextColor: color.onBrand,
                ...stylesheets,
              }}
            />
          </View>
          <TouchableOpacity activeOpacity={1} style={[styles.footer, { borderTopColor: color.line }]}>
            {/* Kit Secondary: the frame's stroke is the neutral #E6E6E6, the kit's is brandPanelLine (ENG-426). */}
            {onClear ? (
              <Button variant="outline" style={styles.button} onPress={onClear}>
                Clear date
              </Button>
            ) : (
              <Button variant="outline" style={styles.button} onPress={onCancel}>
                Cancel
              </Button>
            )}
            <Button disabled={!picked} style={styles.button} onPress={() => picked && onPick(picked)}>
              Confirm
            </Button>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SCREEN_GUTTER,
  },
  card: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  heading: { paddingTop: 20, paddingHorizontal: 24, paddingBottom: 8, gap: 2 },
  month: { paddingTop: 8, paddingHorizontal: 16, paddingBottom: 12 },
  footer: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  button: { flex: 1 },
});
