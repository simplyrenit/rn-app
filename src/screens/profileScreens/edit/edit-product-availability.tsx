import { useProfile } from "@/backend/profile";
import { Button, Text } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { useGlobalContext } from "@/context/global-context";
import { RouteProps, useTypedNavigation } from "@/lib/types";
import { useRoute } from "@react-navigation/native";
import moment from "moment-timezone";
import { styled } from "nativewind";
import React, { useEffect, useState } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { Calendar } from "react-native-calendars";
import { ArrowLeftIcon, XMarkIcon } from "react-native-heroicons/outline";
import * as Progress from "react-native-progress";
import Toast from "react-native-toast-message";

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);

export default function EditProductAvailability() {
  const {
    params: { dates_blocked, name },
  } = useRoute<RouteProps<"EditProductAvailability">>();

  const [selectedRange, setSelectedRange] = useState<{
    start_date: string;
    end_date: string;
  } | null>(null);
  const [unavailableDates, setUnavailableDates] = useState<
    { start_date: string; end_date: string }[]
  >([]);
  const [markedDates, setMarkedDates] = useState({});
  const navigation = useTypedNavigation();
  const { theme } = useGlobalContext();
  const isDark = theme === "dark";
  const { updateMyProductDetails, loading } = useProfile();

  const initialDate = dates_blocked.length
    ? moment(
        Math.min(
          ...dates_blocked.map((date) => new Date(date.start_date).getTime())
        )
      ).format("YYYY-MM-DD")
    : moment().format("YYYY-MM-DD");

  useEffect(() => {
    // Convert dates_blocked to unavailableDates format and set initial state
    const formattedDates = dates_blocked.map((date) => ({
      start_date: moment(date.start_date).format("YYYY-MM-DD"),
      end_date: moment(date.end_date).format("YYYY-MM-DD"),
    }));
    setUnavailableDates(formattedDates);

    // Mark all blocked dates on the calendar
    let marked = {};
    formattedDates.forEach((range) => {
      let currentDate = moment(range.start_date);
      while (currentDate.isSameOrBefore(range.end_date)) {
        const dateString = currentDate.format("YYYY-MM-DD");
        marked = {
          ...marked,
          [dateString]: {
            startingDay: currentDate.isSame(range.start_date),
            endingDay: currentDate.isSame(range.end_date),
            color:
              currentDate.isSame(range.start_date) ||
              currentDate.isSame(range.end_date)
                ? "#C80808"
                : "#C808081A",
            textColor:
              currentDate.isSame(range.start_date) ||
              currentDate.isSame(range.end_date)
                ? "white"
                : "#C80808",
          },
        };
        currentDate = currentDate.add(1, "day");
      }
    });

    setMarkedDates(marked);
  }, [dates_blocked]);

  const markSelectedDates = (start: string, end: string | null = null) => {
    let marked = {};
    let currentDate = moment(start);

    if (!end) {
      const dateString = currentDate.format("YYYY-MM-DD");

      // @ts-ignore
      marked[dateString] = {
        startingDay: true,
        endingDay: true,
        color: "#C80808",
        textColor: "white",
      };
    } else {
      while (currentDate.isSameOrBefore(end)) {
        const dateString = currentDate.format("YYYY-MM-DD");

        // @ts-ignore
        marked[dateString] = {
          startingDay: currentDate.isSame(start),
          endingDay: currentDate.isSame(end),
          color:
            currentDate.isSame(start) || currentDate.isSame(end)
              ? "#C80808"
              : "#C808081A",
          textColor:
            currentDate.isSame(start) || currentDate.isSame(end)
              ? "white"
              : "#C80808",
        };
        currentDate = currentDate.add(1, "day");
      }
    }

    setMarkedDates((prevMarkedDates) => ({ ...prevMarkedDates, ...marked }));
  };

  const handleDayPress = (day: any) => {
    if (!selectedRange) {
      const newRange = { start_date: day.dateString, end_date: "" };
      setSelectedRange(newRange);
      markSelectedDates(newRange.start_date);
    } else {
      const newRange = {
        ...selectedRange,
        end_date: day.dateString,
      };
      console.log(newRange);
      setSelectedRange(newRange);
      markSelectedDates(newRange.start_date, newRange.end_date);
    }
  };

  const confirmDateRange = () => {
    if (selectedRange) {
      setUnavailableDates([...unavailableDates, selectedRange]);
      setSelectedRange(null); // Reset selected range
    }
  };

  const removeRange = (index: number) => {
    const updatedRanges = unavailableDates.filter((_, i) => i !== index);
    setUnavailableDates(updatedRanges);

    // Recalculate marked dates
    let newMarked = {};
    updatedRanges.forEach((range) => {
      let currentDate = moment(range.start_date);
      while (currentDate.isSameOrBefore(range.end_date)) {
        const dateString = currentDate.format("YYYY-MM-DD");
        // @ts-ignore
        newMarked[dateString] = {
          startingDay: currentDate.isSame(range.start_date),
          endingDay: currentDate.isSame(range.end_date),
          color:
            currentDate.isSame(range.start_date) ||
            currentDate.isSame(range.end_date)
              ? "#C80808"
              : "#C808081A",
          textColor:
            currentDate.isSame(range.start_date) ||
            currentDate.isSame(range.end_date)
              ? "white"
              : "#C80808",
        };
        currentDate = currentDate.add(1, "day");
      }
    });
    setMarkedDates(newMarked);
  };

  const onPress = async () => {
    try {
      const formattedUnavailableDates = unavailableDates.map((range) => ({
        start_date: moment(range.start_date)
          .tz("Asia/Kolkata")
          .format("YYYY-MM-DDTHH:mm:ssZ"),
        end_date: moment(range.end_date)
          .tz("Asia/Kolkata")
          .format("YYYY-MM-DDTHH:mm:ssZ"),
      }));

      console.log("Formatted unavailableDates:", formattedUnavailableDates);

      await updateMyProductDetails(name, {
        blocked_dates: formattedUnavailableDates,
      });

      Toast.show({
        type: "customToast",
        position: "bottom",
        text1: "Your product was updated!",
        text2: "success",
      });

      navigation.navigate("editProduct", { id: name });
    } catch (error) {
      console.error("Error updating product details:", error);
    }
  };

  return (
    <NonScrollableContainer>
      <View className="px-3 flex-row items-center">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-[10%]"
        >
          <ArrowLeftIcon size={24} color={isDark ? "#ffffff" : "#000000"} />
        </TouchableOpacity>
        <View className="w-[80%]">
          <View className="h-24 items-center justify-center">
            <Text fontSize="text-lg" fontWeight="font-bold">
              Product Availability
            </Text>
          </View>
        </View>
        <View className="w-[10%]" />
      </View>

      <StyledView className="px-3 flex-1 justify-between">
        <View className="h-[90%]">
          <Calendar
            initialDate={initialDate}
            style={{
              borderColor: isDark ? "#292929" : "#E6E6E6",
              borderWidth: 1,
              borderRadius: 10,
            }}
            markingType={"custom"}
            markedDates={markedDates}
            onDayPress={handleDayPress}
            enableSwipeMonths={true}
            theme={{
              backgroundColor: isDark ? "#000" : "#fff",
              calendarBackground: isDark ? "#000" : "#fff",
              textSectionTitleColor: isDark ? "#fff" : "#000",
              dayTextColor: isDark ? "#fff" : "#000",
              todayTextColor: "#635BE8",
              selectedDayBackgroundColor: "red",
              selectedDayTextColor: "white",
              monthTextColor: "#828282",
              arrowColor: isDark ? "#fff" : "#000",
              textDisabledColor: "#d9e1e8",
              "stylesheet.calendar.header": {
                header: {
                  borderBottomWidth: 1,
                  borderBottomColor: isDark ? "#292929" : "#E6E6E6",
                  flexDirection: "row",
                  justifyContent: "space-between",
                  paddingVertical: 6,
                },
              },
            }}
            dayComponent={({ date, state }: { date: any; state: string }) => {
              // @ts-ignore
              const marked = markedDates[date.dateString];

              return (
                <TouchableOpacity onPress={() => handleDayPress(date)}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: marked ? marked.color : "transparent",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: marked
                          ? marked.textColor
                          : state === "disabled"
                          ? isDark
                            ? "#292929"
                            : "#d9e1e8"
                          : isDark
                          ? "#fff"
                          : "#000",
                      }}
                    >
                      {date.day}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />

          <StyledView className="mt-8 flex-1">
            {unavailableDates.length > 0 ? (
              <Text fontWeight="font-bold" fontSize="text-base">
                The product will be unavailable for{" "}
                {unavailableDates.reduce(
                  (acc, range) =>
                    acc +
                    moment(range.end_date).diff(
                      moment(range.start_date),
                      "days"
                    ) +
                    1,
                  0
                )}{" "}
                days
              </Text>
            ) : (
              <Text fontWeight="font-bold" fontSize="text-lg">
                Choose the dates where the product will be unavailable
              </Text>
            )}

            <ScrollView className="mt-2 flex-1 ">
              {unavailableDates.map((range, index) => (
                <StyledView
                  key={index}
                  className="flex-row justify-between items-center py-2"
                >
                  <Text fontSize="text-base">
                    • {moment(range.start_date).format("MMM D, YYYY")}
                    {range.end_date &&
                      ` - ${moment(range.end_date).format("MMM D, YYYY")}`}
                  </Text>

                  <StyledTouchableOpacity onPress={() => removeRange(index)}>
                    <XMarkIcon
                      size={24}
                      color={isDark ? "#ffffff" : "#000000"}
                    />
                  </StyledTouchableOpacity>
                </StyledView>
              ))}
            </ScrollView>
          </StyledView>
        </View>

        <View className="h-[10%] flex-row items-center justify-between ">
          <Button
            variant="outline"
            onPress={confirmDateRange}
            disabled={!selectedRange}
            className="w-[49%]"
          >
            <Text fontWeight="font-bold">Add date log</Text>
          </Button>

          <Button
            disabled={unavailableDates.length === 0}
            className="items-center justify-between w-[49%]"
            onPress={onPress}
          >
            {loading ? (
              <Progress.CircleSnail color={"white"} size={22} />
            ) : (
              <View className="flex-row items-center justify-between">
                <Text
                  fontWeight="font-bold"
                  className={`${
                    unavailableDates.length === 0
                      ? "text-gray-500"
                      : "text-white"
                  }`}
                >
                  Update Availability
                </Text>
              </View>
            )}
          </Button>
        </View>
      </StyledView>
    </NonScrollableContainer>
  );
}
