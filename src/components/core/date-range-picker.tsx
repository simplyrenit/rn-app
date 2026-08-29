import { useGlobalContext } from "@/context/global-context";
import { SCREEN_GUTTER, colors, ink, radius, space } from "@/lib/design-tokens";
import React, { useState } from "react";
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

const dayLabel = (date?: Date) =>
  date
    ? date.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
      })
    : null;

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
 */
const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onConfirm,
  onCancel,
}) => {
  const [selectedDates, setSelectedDates] = useState<any>({});
  const [tempStartDate, setTempStartDate] = useState<Date | undefined>(
    startDate
  );
  const [tempEndDate, setTempEndDate] = useState<Date | undefined>(endDate);
  const { theme } = useGlobalContext();
  const isDark = theme === "dark";

  const onDayPress = (day: any) => {
    let markedDates: any = {};
    const start = tempStartDate
      ? tempStartDate.toISOString().split("T")[0]
      : undefined;
    const end = day.dateString;

    if (!start || tempEndDate) {
      markedDates = {
        [day.dateString]: {
          startingDay: true,
          color: colors.dark.brand,
          textColor: "white",
          customStyles: {
            container: {
              backgroundColor: colors.dark.brand,
              borderRadius: radius.group,
            },
            text: { color: "white" },
          },
        },
      };
      setTempStartDate(new Date(day.dateString));
      setTempEndDate(undefined);
    } else {
      const range = generateRange(start, end);
      range.forEach((date, index) => {
        if (index === 0 || index === range.length - 1) {
          markedDates[date] = {
            customStyles: {
              container: {
                backgroundColor: colors.dark.brand,
                borderRadius: radius.group,
              },
              text: { color: "white" },
            },
            startingDay: index === 0,
            endingDay: index === range.length - 1,
          };
        } else {
          markedDates[date] = {
            customStyles: {
              container: {
                backgroundColor: ink.brandWash(isDark),
                borderRadius: radius.group,
              },
              text: { color: ink.brandText(isDark) },
            },
          };
        }
      });
      setTempEndDate(new Date(end));
    }
    setSelectedDates(markedDates);
  };

  const generateRange = (start: string, end: string): string[] => {
    const range: string[] = [];
    let currentDate = new Date(start);
    const endDate = new Date(end);

    while (currentDate <= endDate) {
      range.push(currentDate.toISOString().split("T")[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return range;
  };

  const handleConfirm = () => {
    if (tempStartDate && tempEndDate) {
      onConfirm({ startDate: tempStartDate, endDate: tempEndDate });
    }
  };

  const today = new Date().toISOString().split("T")[0];

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
            markingType={"custom"}
            markedDates={selectedDates}
            onDayPress={onDayPress}
            minDate={today}
            theme={{
              backgroundColor: ink.surface(isDark),
              calendarBackground: ink.surface(isDark),
              textSectionTitleColor: ink.body(isDark),
              dayTextColor: ink.text(isDark),
              todayTextColor: ink.brandText(isDark),
              selectedDayBackgroundColor: colors.dark.brand,
              selectedDayTextColor: "#FFFFFF",
              monthTextColor: ink.text(isDark),
              arrowColor: ink.brandText(isDark),
              // Was the literal "gray" in both themes, which sat at 2.8:1 on the
              // light card and read as "everything is disabled".
              textDisabledColor: ink.dim(isDark),
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
