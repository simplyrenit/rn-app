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
import {
  ArrowLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
} from "react-native-heroicons/outline";
import Toast from "react-native-toast-message";

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
  const [markedDates, setMarkedDates] = useState(dates_blocked.reduce((acc, curr) => {
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
              ? "#C80808"
              : "#C808081A",
          textColor:
            currentDate.isSame(currStart) || currentDate.isSame(currEnd)
              ? "white"
              : "#C80808",
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
    let marked = {};
    let currentDate = moment(start);

    if (!end) {
      const dateString = currentDate.format("YYYY-MM-DD");
      marked[dateString] = {
        startingDay: true,
        endingDay: true,
        color: "#C80808",
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
       if (!selectedRange) return
    
       const newRange = {
         startDate: selectedRange.startDate,
         endDate: selectedRange.endDate || selectedRange.startDate,
       }
    
       const updatedRanges = [...unavailableDates, newRange]
       console.log(updatedRanges,'m')
       setUnavailableDates(updatedRanges)
    
       const newMarked = updatedRanges.reduce((acc, range) => {
         let currentDate = moment(range.startDate)
         const endDate = range.endDate
         while (currentDate.isSameOrBefore(endDate)) {
           const dateString = currentDate.format("YYYY-MM-DD")
           acc[dateString] = {
             startingDay: currentDate.isSame(range.startDate),
             endingDay: currentDate.isSame(endDate),
             color:
               currentDate.isSame(range.startDate) || currentDate.isSame(endDate)
                 ? "#C80808"
                 : "#C808081A",
             textColor:
               currentDate.isSame(range.startDate) || currentDate.isSame(endDate)
                 ? "white"
                 : "#C80808",
           }
           currentDate = currentDate.add(1, "day")
         }
         return acc
       }, {})
    
       setMarkedDates(newMarked)
       setSelectedRange(null)
     }

  // const confirmDateRange = () => {
  //   if (!selectedRange) return;

  //   const newStart = moment(selectedRange.startDate);
  //   const newEnd = moment(selectedRange.endDate || selectedRange.startDate);
  //   let overlappingRanges: number[] = [];
  //   let mergedStart = newStart;
  //   let mergedEnd = newEnd;

  //   unavailableDates.forEach((range, index) => {
  //     const rangeStart = moment(range.startDate);
  //     const rangeEnd = moment(range.endDate || range.startDate);

  //     if (
  //       newStart.isBetween(rangeStart, rangeEnd, "day", "[]") ||
  //       newEnd.isBetween(rangeStart, rangeEnd, "day", "[]") ||
  //       rangeStart.isBetween(newStart, newEnd, "day", "[]") ||
  //       rangeEnd.isBetween(newStart, newEnd, "day", "[]")
  //     ) {
  //       overlappingRanges.push(index);
  //       mergedStart = moment.min(mergedStart, rangeStart);
  //       mergedEnd = moment.max(mergedEnd, rangeEnd);
  //     }
  //   });

  //   if (overlappingRanges.length > 0) {
  //     const updatedRanges = unavailableDates.filter(
  //       (_, index) => !overlappingRanges.includes(index)
  //     );

  //     const mergedRange = {
  //       startDate: mergedStart.format("YYYY-MM-DD"),
  //       endDate: mergedEnd.format("YYYY-MM-DD"),
  //     };

  //     setUnavailableDates([...updatedRanges, mergedRange]);
  //   } else {
  //     setUnavailableDates([...unavailableDates, selectedRange]);
  //   }

  //   setSelectedRange(null);

  //   let newMarked = {};
  //   const updatedRanges = [...unavailableDates, selectedRange];
  //   updatedRanges.forEach((range) => {
  //     let currentDate = moment(range.startDate);
  //     const endDate = range.endDate || range.startDate;
  //     while (currentDate.isSameOrBefore(endDate)) {
  //       const dateString = currentDate.format("YYYY-MM-DD");
  //       newMarked[dateString] = {
  //         startingDay: currentDate.isSame(range.startDate),
  //         endingDay: currentDate.isSame(endDate),
  //         color:
  //           currentDate.isSame(range.startDate) || currentDate.isSame(endDate)
  //             ? "#C80808"
  //             : "#C808081A",
  //         textColor:
  //           currentDate.isSame(range.startDate) || currentDate.isSame(endDate)
  //             ? "white"
  //             : "#C80808",
  //       };
  //       currentDate = currentDate.add(1, "day");
  //     }
  //   });
  //   setMarkedDates(newMarked);
  // };

  const removeRange = (index: number) => {
    const updatedRanges = unavailableDates.filter((_, i) => i !== index);
    setUnavailableDates(updatedRanges);

    let newMarked = {};
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
              ? "#C80808"
              : "#C808081A",
          textColor:
            currentDate.isSame(range.startDate) ||
              currentDate.isSame(range.endDate)
              ? "white"
              : "#C80808",
        };
        currentDate = currentDate.add(1, "day");
      }
    });
    setMarkedDates(newMarked);
  };

  const onPress = async () => {

    if (!selectedRange) return;

      const newRange = {
        startDate: selectedRange?.startDate,
        endDate: selectedRange?.endDate || selectedRange?.startDate,
      }
   
      const updatedRanges = [...unavailableDates, newRange]


    const formattedUnavailableDates = updatedRanges.map((range) => ({
      startDate: moment(range.startDate).format("YYYY-MM-DD"),
      endDate: moment(range.endDate).format("YYYY-MM-DD"),
    }));

    console.log(formattedUnavailableDates,'maxi')


    saveDetails({ productAvailability: formattedUnavailableDates });
    try {
      const response = await updateMyProductDetails(name, {
        booked: formattedUnavailableDates.map((range) => ({
          start_date: range.startDate,
          end_date: range.endDate,
        })),
      });

      console.log(JSON.stringify(response),'test')

      Toast.show({
        type: "customToast",
        position: "bottom",
        text1: "Your product was updated!",
        text2: "success",
        visibilityTime: 4000,
        autoHide: true,
      });
      navigation.navigate("editProduct", { id: name });
    } catch (error) {
      console.error("Failed to update product details:", error);
    }
  };

  return (
    <StaticContainer width={100}>
      <View className="px-3 flex-row items-center pt-2">
        <View className="flex-row items-center justify-between px-5 pl-1 py-2">
          <TouchableOpacity
            onPress={() => router.goBack()}
            className="flex-1 items-start"
          >
            <ArrowLeftIcon
              size={20}
              color={isDark ? "#FFF" : "#000"}
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

      <StyledView className="px-4 flex-1 pt-4 justify-between">
        <View className="h-[90%]">
          <Calendar
            minDate={minDate}
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
              <Text
                fontWeight="font-bold"
                fontSize="text-base"
              >
                The product will be unavailable for{" "}
                {unavailableDates.reduce(
                  (acc, range) =>
                    acc +
                    moment(range.endDate).diff(
                      moment(range.startDate),
                      "days"
                    ) +
                    1,
                  0
                )}{" "}
                days
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

        <View className="h-[10%] flex-row items-center justify-between gap-4">
          <Button
            variant="outline"
            onPress={confirmDateRange}
            disabled={!selectedRange}
            className="w-[49%] border rounded-xl"
            style={{ borderColor: '#e8e8e8' }}
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
                color={"#ffffff"}
              />
            </View>
          </Button>
        </View>
      </StyledView>
    </StaticContainer>
  );
}
