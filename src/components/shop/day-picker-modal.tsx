import { Button, Text } from "@/components/core";
import { SCREEN_GUTTER, radius, space } from "@/lib/design-tokens";
import { dayLabel } from "@/lib/shop";
import { useTheme } from "@/lib/theme";
import React, { useState } from "react";
import { Modal, StyleSheet, TouchableOpacity } from "react-native";
import { Calendar } from "react-native-calendars";

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

/**
 * One day, for "Closed until". The range picker next door picks two; this is the
 * same modal surface with a single selected day, because Closed until is a day
 * the shop opens on, not a stretch.
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

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
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
          <Text fontSize="text-md" fontWeight="font-bold" style={styles.heading}>
            {title}
          </Text>
          <Text fontSize="text-sm" tone="body" style={styles.sub}>
            {line(picked)}
          </Text>
          <Calendar
            current={picked ?? minDate}
            minDate={minDate}
            maxDate={maxDate}
            markedDates={picked ? { [picked]: { selected: true } } : {}}
            onDayPress={(day: { dateString: string }) => setPicked(day.dateString)}
            theme={{
              backgroundColor: color.surface,
              calendarBackground: color.surface,
              textSectionTitleColor: color.textBody,
              monthTextColor: color.text,
              arrowColor: color.brandText,
              dayTextColor: color.text,
              textDisabledColor: color.textDim,
              todayTextColor: color.brandText,
              selectedDayBackgroundColor: color.brand,
              selectedDayTextColor: color.onBrand,
            }}
          />
          <TouchableOpacity activeOpacity={1} style={[styles.footer, { borderTopColor: color.line }]}>
            {onClear ? (
              <Button variant="ghost" style={styles.button} onPress={onClear}>
                Clear date
              </Button>
            ) : (
              <Button variant="ghost" style={styles.button} onPress={onCancel}>
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
    borderRadius: radius.group,
    borderWidth: 1,
    overflow: "hidden",
  },
  heading: { paddingHorizontal: SCREEN_GUTTER, paddingTop: space.md },
  sub: { paddingHorizontal: SCREEN_GUTTER, paddingTop: 2, paddingBottom: space.sm },
  footer: {
    flexDirection: "row",
    gap: space.sm,
    paddingHorizontal: SCREEN_GUTTER,
    paddingVertical: space.md,
    borderTopWidth: 1,
  },
  button: { flex: 1 },
});
