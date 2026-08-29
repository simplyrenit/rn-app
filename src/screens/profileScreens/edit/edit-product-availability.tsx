import { pluralize } from "@/lib/pluralize";
import { useProfile } from "@/backend/profile";
import { Button, StaticContainer, Text } from "@/components/core";
import { PostProductHeader } from "@/components/post/header";
import { useGlobalContext } from "@/context/global-context";
import { useProductContext } from "@/context/product-context";
import { RouteProps, useTypedNavigation } from "@/lib/types";
import { useRoute } from "@react-navigation/native";
import moment from "moment";
import { styled } from "nativewind";
import React, { useState } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { Calendar } from "react-native-calendars";
import type { MarkedDates } from "react-native-calendars/src/types";
import {
  ArrowLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
} from "react-native-heroicons/outline";

import { ink, colors, radius } from "@/lib/design-tokens";
import { toast } from "@/lib/toast";

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);

export default function ProductAvailability() {
  const [selectedRange, setSelectedRange] = useState<{
    startDate: string;
    endDate: string;
  } | null>(null);
  const route = useRoute<RouteProps<"EditProductAvailability">>();
  const { name, dates_blocked } = route.params;
  const [unavailableDates, setUnavailableDates] = useState<
    { startDate: string; endDate: string }[]
  >(dates_blocked.map((date) => ({
    startDate: date.start_date,
    endDate: date.end_date,
  })));
  const [markedDates, setMarkedDates] = useState<MarkedDates>(dates_blocked.reduce<MarkedDates>((acc, curr) => {
    let newAcc = { ...acc };
    const currStart = moment(curr.start_date);
    const currEnd = moment(curr.end_date);
    let currentDate = moment(curr.start_date);
    while (currentDate.isSameOrBefore(currEnd)) {
      newAcc = {
        ...newAcc, [currentDate.format('YYYY-MM-DD')]: {
          startingDay: currStart.isSame(currentDate),
          endingDay: currEnd.isSame(currentDate),
          color:
            currentDate.isSame(currStart) || currentDate.isSame(currEnd)
              ? ink.danger(isDark)
              : ink.dangerWash(isDark),
          textColor:
            currentDate.isSame(currStart) || currentDate.isSame(currEnd)
              ? "white"
              : ink.danger(isDark),
        }
      }
      currentDate = currentDate.add(1, "day");

    }
    return newAcc;
  }, {}));
  const navigation = useTypedNavigation();

  const { theme } = useGlobalContext();
  const isDark = theme === "dark";
  const { saveDetails } = useProductContext();
  const router = useTypedNavigation();
  const { updateMyProductDetails, loading } = useProfile();

  const minDate = moment().format("YYYY-MM-DD");

  const markSelectedDates = (start: string, end: string | null = null) => {
    const marked: MarkedDates = {};
    let currentDate = moment(start);

    if (!end) {
      const dateString = currentDate.format("YYYY-MM-DD");
      marked[dateString] = {
        startingDay: true,
        endingDay: true,
        color: ink.danger(isDark),
        textColor: "white",
      };
    } else {
      while (currentDate.isSameOrBefore(end)) {
        const dateString = currentDate.format("YYYY-MM-DD");
        marked[dateString] = {
          startingDay: currentDate.isSame(start),
          endingDay: currentDate.isSame(end),
          color:
            currentDate.isSame(start) || currentDate.isSame(end)
              ? ink.danger(isDark)
              : ink.dangerWash(isDark),
          textColor:
            currentDate.isSame(start) || currentDate.isSame(end)
              ? "white"
              : ink.danger(isDark),
        };
        currentDate = currentDate.add(1, "day");
      }
    }

    setMarkedDates((prevMarkedDates) => ({ ...prevMarkedDates, ...marked }));
  };

  const handleDayPress = (day: any) => {
    if (moment(day.dateString).isBefore(minDate, "day")) return;

    if (!selectedRange) {
      const newRange = { startDate: day.dateString, endDate: "" };
      setSelectedRange(newRange);
      markSelectedDates(newRange.startDate);
    } else {
      const newRange = {
        ...selectedRange,
        endDate: day.dateString,
      };
      setSelectedRange(newRange);
      markSelectedDates(newRange.startDate, newRange.endDate);
    }
  };

  const confirmDateRange = () => {
    if (!selectedRange) return;

    const rangeToAdd = {
      startDate: selectedRange.startDate,
      endDate: selectedRange.endDate || selectedRange.startDate,
    };
    const newStart = moment(rangeToAdd.startDate);
    const newEnd = moment(rangeToAdd.endDate);
    let overlappingRanges: number[] = [];
    let mergedStart = newStart;
    let mergedEnd = newEnd;

    unavailableDates.forEach((range, index) => {
      const rangeStart = moment(range.startDate);
      const rangeEnd = moment(range.endDate || range.startDate);

      if (
        newStart.isBetween(rangeStart, rangeEnd, "day", "[]") ||
        newEnd.isBetween(rangeStart, rangeEnd, "day", "[]") ||
        rangeStart.isBetween(newStart, newEnd, "day", "[]") ||
        rangeEnd.isBetween(newStart, newEnd, "day", "[]")
      ) {
        overlappingRanges.push(index);
        mergedStart = moment.min(mergedStart, rangeStart);
        mergedEnd = moment.max(mergedEnd, rangeEnd);
      }
    });

    if (overlappingRanges.length > 0) {
      const updatedRanges = unavailableDates.filter(
        (_, index) => !overlappingRanges.includes(index)
      );

      const mergedRange = {
        startDate: mergedStart.format("YYYY-MM-DD"),
        endDate: mergedEnd.format("YYYY-MM-DD"),
      };

      setUnavailableDates([...updatedRanges, mergedRange]);
    } else {
      setUnavailableDates([...unavailableDates, rangeToAdd]);
    }

    setSelectedRange(null);

    const newMarked: MarkedDates = {};
    const updatedRanges = [...unavailableDates, rangeToAdd];
    updatedRanges.forEach((range) => {
      let currentDate = moment(range.startDate);
      const endDate = range.endDate || range.startDate;
      while (currentDate.isSameOrBefore(endDate)) {
        const dateString = currentDate.format("YYYY-MM-DD");
        newMarked[dateString] = {
          startingDay: currentDate.isSame(range.startDate),
          endingDay: currentDate.isSame(endDate),
          color:
            currentDate.isSame(range.startDate) || currentDate.isSame(endDate)
              ? ink.danger(isDark)
              : ink.dangerWash(isDark),
          textColor:
            currentDate.isSame(range.startDate) || currentDate.isSame(endDate)
              ? "white"
              : ink.danger(isDark),
        };
        currentDate = currentDate.add(1, "day");
      }
    });
    setMarkedDates(newMarked);
  };

  const removeRange = (index: number) => {
    const updatedRanges = unavailableDates.filter((_, i) => i !== index);
    setUnavailableDates(updatedRanges);

    const newMarked: MarkedDates = {};
    updatedRanges.forEach((range) => {
      let currentDate = moment(range.startDate);
      while (currentDate.isSameOrBefore(range.endDate)) {
        const dateString = currentDate.format("YYYY-MM-DD");
        newMarked[dateString] = {
          startingDay: currentDate.isSame(range.startDate),
          endingDay: currentDate.isSame(range.endDate),
          color:
            currentDate.isSame(range.startDate) ||
              currentDate.isSame(range.endDate)
              ? ink.danger(isDark)
              : ink.dangerWash(isDark),
          textColor:
            currentDate.isSame(range.startDate) ||
              currentDate.isSame(range.endDate)
              ? "white"
              : ink.danger(isDark),
        };
        currentDate = currentDate.add(1, "day");
      }
    });
    setMarkedDates(newMarked);
  };

  const onPress = async () => {
    const formattedUnavailableDates = unavailableDates.map((range) => ({
      startDate: moment(range.startDate).format("YYYY-MM-DD"),
      endDate: moment(range.endDate).format("YYYY-MM-DD"),
    }));

    saveDetails({ productAvailability: formattedUnavailableDates });
    try {
      const response = await updateMyProductDetails(name, {
        blocked_dates: formattedUnavailableDates.map((range) => ({
          start_date: range.startDate,
          end_date: range.endDate,
        })),
      });

      toast.success("Your product was updated!");
      navigation.navigate("editProduct", { id: name });
    } catch (error) {
      console.error("Failed to update product details:", error);
    }
  };

  const calendarTheme = {
    backgroundColor: ink.canvas(isDark),
    calendarBackground: ink.canvas(isDark),
    textSectionTitleColor: ink.text(isDark),
    dayTextColor: ink.text(isDark),
    todayTextColor: colors.dark.brand,
    selectedDayBackgroundColor: "red",
    selectedDayTextColor: "white",
    monthTextColor: ink.body(false),
    arrowColor: ink.text(isDark),
    textDisabledColor: ink.line(false),
    "stylesheet.calendar.header": {
      header: {
        borderBottomWidth: 1,
        borderBottomColor: ink.line(isDark),
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 6,
      },
    },
  };

  return (
    <StaticContainer width={100}>
      <View className="px-3 flex-row items-center pt-2">
        <View className="flex-row items-center justify-between px-gutter pl-1 py-2">
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back"
            onPress={() => router.goBack()}
            className="flex-1 items-start"
          >
            <ArrowLeftIcon
              size={20}
              color={ink.text(isDark)}
            />
          </TouchableOpacity>
          <View className="items-center justify-center w-[80%]">
            <Text
              fontSize="text-xl"
              fontWeight="font-bold"
            >
              Edit Unavailability
            </Text>
          </View>

          <View className="w-[10%]"></View>
        </View>
        <View className="w-[10%]" />
      </View>

      <StyledView className="px-gutter flex-1 pt-4 justify-between">
        <View className="flex-1">
          <Calendar
            minDate={minDate}
            style={{
              borderColor: ink.line(isDark),
              borderWidth: 1,
              borderRadius: radius.input,
            }}
            markingType={"custom"}
            markedDates={markedDates}
            onDayPress={handleDayPress}
            enableSwipeMonths={true}
            theme={calendarTheme}
            dayComponent={({ date, state }) => {
              if (!date) return null;
              const marked = markedDates[date.dateString];

              return (
              <TouchableOpacity
                disabled={state === "disabled"}
                onPress={() => handleDayPress(date)}
              >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: radius.group,
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
                              ? ink.line(true)
                              : ink.line(false)
                            : ink.text(isDark),
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
              <Text
                fontWeight="font-bold"
                fontSize="text-base"
              >
                The product will be unavailable for{" "}
                {pluralize(
                  unavailableDates.reduce(
                    (acc, range) =>
                      acc +
                      moment(range.endDate).diff(
                        moment(range.startDate),
                        "days"
                      ) +
                      1,
                    0
                  ),
                  "day"
                )}
              </Text>
            ) : (
              <Text
                fontWeight="font-bold"
                fontSize="text-lg"
              >
                Choose the dates where the product will be unavailable
              </Text>
            )}

            <ScrollView className="mt-2 flex-1">
              {unavailableDates.map((range, index) => (
                <StyledView
                  key={index}
                  className="flex-row justify-between items-center py-2"
                >
                  <Text fontSize="text-base">
                    • {moment(range.startDate).format("MMM D, YYYY")}
                    {range.endDate &&
                      ` - ${moment(range.endDate).format("MMM D, YYYY")}`}
                  </Text>

                  <StyledTouchableOpacity accessibilityRole="button" accessibilityLabel="Close" onPress={() => removeRange(index)}>
                    <XMarkIcon
                      size={24}
                      color={ink.text(isDark)}
                    />
                  </StyledTouchableOpacity>
                </StyledView>
              ))}
            </ScrollView>
          </StyledView>
        </View>

        <View className="flex-row items-center justify-between space-x-4 py-3">
          <Button
            variant="outline"
            onPress={confirmDateRange}
            disabled={!selectedRange}
            className="w-[49%] border rounded-card"
            style={{ borderColor: ink.line(false) }}
          >
            <Text fontWeight="font-bold">Add date log</Text>
          </Button>

          <Button
            className="items-center flex flex-1 flex-row justify-center w-[49%]"
            onPress={onPress}
            variant="primary"
          >
            <Text
              fontWeight="font-bold"
              numberOfLines={1}
              className={`flex-1 ${"text-white"
                } `}
              lineHeight={22}
            >
              Update
            </Text>
            <View className="mt-[0.5] translate-y-1">
              <ChevronRightIcon
                size={16}
                color={"#FFFFFF"}
              />
            </View>
          </Button>
        </View>
      </StyledView>
    </StaticContainer>
  );
}
