import { useGlobalContext } from "@/context/global-context";
import React, { useState } from "react";
import { View, Modal, StyleSheet, TouchableOpacity } from "react-native";
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
      // Select new start date
      markedDates = {
        [day.dateString]: {
          startingDay: true,
          color: "#635BE8",
          textColor: "white",
          customStyles: {
            container: {
              backgroundColor: "#635BE8",
              borderRadius: 15,
            },
            text: {
              color: "white",
            },
          },
        },
      };
      setTempStartDate(new Date(day.dateString));
      setTempEndDate(undefined);
    } else {
      // Select end date and generate range
      const range = generateRange(start, end);
      range.forEach((date, index) => {
        if (index === 0 || index === range.length - 1) {
          // Start and End Date Styling
          markedDates[date] = {
            customStyles: {
              container: {
                backgroundColor: "#635BE8",
                borderRadius: 15,
              },
              text: {
                color: "white",
              },
            },
            startingDay: index === 0,
            endingDay: index === range.length - 1,
          };
        } else {
          // Intermediate Date Styling
          markedDates[date] = {
            customStyles: {
              container: {
                backgroundColor: isDark ? "#201E4D" : "#EDEDFC",
                borderRadius: 15,
              },
              text: {
                color: "#635BE8",
              },
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

  return (
    <Modal
      visible={true}
      transparent={true}
      animationType="slide"
      onRequestClose={onCancel}
    >
      <TouchableOpacity
        style={styles.modalBackground}
        activeOpacity={1}
        onPress={onCancel} // Close modal when clicking on the background
      >
        <TouchableOpacity
          activeOpacity={1}
          style={[
            styles.container,
            isDark ? styles.darkTheme : styles.lightTheme,
          ]}
          onPress={() => {}}
        >
          <Calendar
            markingType={"custom"}
            markedDates={selectedDates}
            onDayPress={onDayPress}
            minDate={today} // Disable all dates before today
            theme={{
              backgroundColor: isDark ? "#000" : "#fff",
              calendarBackground: isDark ? "#292929" : "#f5f5f5",
              textSectionTitleColor: isDark ? "#fff" : "#000",
              dayTextColor: isDark ? "#fff" : "#000",
              todayTextColor: "#635BE8",
              selectedDayBackgroundColor: "red",
              selectedDayTextColor: "white",
              monthTextColor: isDark ? "#fff" : "#000",
              arrowColor: isDark ? "#fff" : "#000",
              textDisabledColor: "#1A1A1A", // Change color of disabled dates
            }}
          />
          <View
            style={styles.buttons}
            className="px-5"
          >
            <Button
              disabled={!tempStartDate || !tempEndDate} // Disable button if no range selected
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
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  container: {
    width: "90%",
    borderRadius: 10,
    overflow: "hidden",
  },
  lightTheme: {
    backgroundColor: "transparent",
  },
  darkTheme: {
    backgroundColor: "transparent",
  },
  buttons: { paddingVertical: 10 },
});

export default DateRangePicker;
