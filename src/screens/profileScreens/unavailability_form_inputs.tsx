import { Button, Text } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { useGlobalContext } from "@/context/global-context";
import {
  RouteProps,
  UnavailabilityFormData,
  useTypedNavigation,
} from "@/lib/types";
import React, { useCallback, useEffect, useState } from "react";
import { TextInput, TouchableOpacity, View } from "react-native";
import {
  ArrowLeftIcon,
  ChevronRightIcon,
  CalendarIcon,
  PencilSquareIcon,
  MapPinIcon,
} from "react-native-heroicons/outline";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { widthPercentageToDP as wp } from "react-native-responsive-screen";
import DateRangePicker from "@/components/core/date-range-picker";
import { Dimensions } from "react-native";
import { useAuthContext } from "@/context/auth-context";
import { useRoute } from "@react-navigation/native";
import moment from "moment-timezone";
import { useProfile } from "@/backend/profile";
import * as Progress from "react-native-progress";
import Toast from "react-native-toast-message";

const { height } = Dimensions.get("window");
interface UnavailabilityProps {}

const UnavailabilityFormInputs: React.FC<UnavailabilityProps> = () => {
  const [range, setRange] = useState({
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined,
  });
  const route = useRoute<RouteProps<"UnavailabilityFormInputs">>();
  const { category, subcategory } = route.params;

  const router = useTypedNavigation();
  const { theme } = useGlobalContext();
  const { user } = useAuthContext();
  const isDarkMode = theme === "dark";
  const [open, setOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [address, setAddress] = useState("");
  const [contactDetail, setContactDetail] = useState("");

  type Option = {
    label: string;
    value: string;
  };

  interface Coordinates {
    lat: number | undefined;
    lng: number | undefined;
  }
  const options: Option[] = [
    { label: "Phone", value: "phone" },
    { label: "Whatsapp", value: "whatsapp" },
    { label: "Email", value: "email" },
    { label: "SMS", value: "sms" },
    { label: "Other", value: "other" },
  ];

  useEffect(() => {
    console.log("----------", user);
  }, []);

  const formatDate = (date: Date | undefined) => {
    if (!date) return "";
    const options: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
    };
    return date.toLocaleDateString("en-US", options);
  };
  const { submitUnavailabilityForm, loading } = useProfile();

  const [formData, setFormData] = useState({
    productName: "",
    noOfUnits: "",
  });
  const [selectedLocationName, setSelectedLocationName] = useState<
    string | null
  >(null);
  const [selectedLocation, setSelectedLocation] =
    useState<Coordinates | null>();

  const handleOpenBottomSheet = () => {
    router.navigate("LocationModal", {
      onGoBack: (coordinates, addressToSend) =>
        handleDataFromLocation(coordinates, addressToSend),
    });
  };

  const handleDataFromLocation = useCallback(
    (coords: any, addressToSend: any) => {
      console.log("Received Coordinates:", coords);
      console.log("Received Address:", addressToSend);
      setSelectedLocation({ lat: coords.latitude, lng: coords.longitude });
      setSelectedLocationName(addressToSend);
    },
    []
  );

  const handleOptionChange = (selectedOption: string | null) => {
    setSelectedOption(selectedOption ?? options[0].value);
    if (selectedOption === "email" && user?.email) {
      setContactDetail(user.email);
    } else {
      setContactDetail("");
    }
  };

  useEffect(() => {
    handleOptionChange(selectedOption);
  }, [selectedOption, user?.email ?? ""]);

  const handleNextPress = async () => {
    const unavailabilityFormData: UnavailabilityFormData = {
      category,
      subcategory,
      coordinates: {
        type: "Point",
        coordinates: [selectedLocation?.lng ?? 0, selectedLocation?.lat ?? 0],
      },
      address: address ?? "",
      what_are_you_looking_for: formData.productName,
      quantity: formData.noOfUnits,
      when_do_you_need_it: {
        start_date: moment(range.startDate)
          .tz("Asia/Kolkata")
          .format("YYYY-MM-DDTHH:mm:ssZ"),
        end_date: moment(range.endDate)
          .tz("Asia/Kolkata")
          .format("YYYY-MM-DDTHH:mm:ssZ"),
      },
      how_to_contact: {
        mode: selectedOption ?? "",
        value: contactDetail,
      },
    };

    const { status, data } = await submitUnavailabilityForm(
      unavailabilityFormData
    );

    if (status === 201) {
      router.navigate("profile");
      Toast.show({
        type: "customToast",
        position: "bottom",
        text1: "Your form has been submitted",
        text2: "success",
        visibilityTime: 4000,
        autoHide: true,
        bottomOffset: 20,
        onPress: () => {
          Toast.hide();
        },
      });
    } else {
      Toast.show({
        type: "customToast",
        position: "bottom",
        text1: "There was an error submitting your form",
        text2: "error",
        visibilityTime: 4000,
        autoHide: true,
        bottomOffset: 20,
        onPress: () => {
          Toast.hide();
        },
      });
    }
  };

  return (
    <NonScrollableContainer height={height > 700 ? 105 : 100}>
      <View
        className="flex-row items-center justify-between px-5 "
        style={{ paddingVertical: wp("5%") }}
      >
        <TouchableOpacity
          onPress={() => router.goBack()}
          className="flex-1 items-start w-[10%]"
        >
          <ArrowLeftIcon
            size={26}
            color={isDarkMode ? "#FFF" : "#000"}
          />
        </TouchableOpacity>
        <View className="items-center justify-center w-[80%]">
          <Text
            fontSize="text-xl"
            fontWeight="font-bold"
          >
            Unavailability Form
          </Text>
        </View>

        <View className="w-[10%]"></View>
      </View>

      <KeyboardAwareScrollView className="px-5 py-5 flex-1">
        <View className="space-y-2 mb-10">
          <Text
            fontSize="text-md"
            fontWeight="font-bold"
          >
            What are you looking for? (Product Name)
          </Text>
          <View className="pt-3">
            <TextInput
              placeholder={`"Product Name"`}
              value={formData.productName}
              placeholderTextColor={isDarkMode ? "#ffffff80" : "#00000080"}
              onChangeText={(text) =>
                setFormData({ ...formData, productName: text })
              }
              className={`rounded-[12px] h-12 border p-3  ${
                isDarkMode
                  ? "border-[#292929] text-white"
                  : "border-[#e6e6e6] text-black"
              }`}
            />
          </View>
        </View>

        <View className="space-y-2 mb-10">
          <Text
            fontSize="text-md"
            fontWeight="font-bold"
          >
            Quantity or Number of Units required
          </Text>
          <View className="pt-3">
            <TextInput
              placeholder={`"No. of units"`}
              value={formData.noOfUnits}
              placeholderTextColor={isDarkMode ? "#ffffff80" : "#00000080"}
              onChangeText={(text) =>
                setFormData({ ...formData, noOfUnits: text })
              }
              className={`rounded-[12px] h-12 border p-3  ${
                isDarkMode
                  ? "border-[#292929] text-white"
                  : "border-[#e6e6e6] text-black"
              }`}
            />
          </View>
        </View>

        <View className=" mb-10">
          <Text
            fontSize="text-md"
            fontWeight="font-bold"
          >
            When do you need the product?
          </Text>
          <View className="pt-4">
            <TouchableOpacity
              onPress={() => setOpen(true)}
              className={`h-[48px] rounded-[12px] w-full ${
                isDarkMode
                  ? "bg-[#0F0F0F] border-[#292929]"
                  : "bg-white border-[#e6e6e6]"
              } border px-2`}
            >
              <View className="flex flex-row h-full w-full items-center justify-between">
                <View className="flex flex-row items-center space-x-4">
                  <CalendarIcon
                    color={isDarkMode ? "white" : "black"}
                    size={24}
                  />
                  {range.startDate && range.endDate ? (
                    <Text style={{ fontSize: 15 }}>
                      {formatDate(range.startDate)} -{" "}
                      {formatDate(range.endDate)}
                    </Text>
                  ) : (
                    <Text style={{ color: "gray", fontSize: 15 }}>
                      Select Dates
                    </Text>
                  )}
                </View>
                {range.endDate && (
                  <PencilSquareIcon
                    color={isDarkMode ? "white" : "black"}
                    size={24}
                  />
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>
        <View className="space-y-2 mb-10">
          <Text
            fontSize="text-md"
            fontWeight="font-bold"
          >
            Product location
          </Text>
          <Text className={`${isDarkMode ? "text-white/70" : "text-black/70"}`}>
            Mention the product's location
          </Text>

          <TouchableOpacity
            className={`h-[50px] rounded-[12px] w-full ${
              isDarkMode
                ? "bg-[#000] border-[#292929]"
                : "bg-white border-[#e6e6e6]"
            } border px-2`}
            onPress={handleOpenBottomSheet}
          >
            <View className="flex flex-row h-full w-full items-center justify-between">
              <View className="flex flex-row items-center space-x-2 ">
                <MapPinIcon
                  color={isDarkMode ? "white" : "black"}
                  size={24}
                />
                <View className="w-3/4">
                  {selectedLocationName ? (
                    <Text
                      fontSize="text-xs"
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {selectedLocationName}
                    </Text>
                  ) : (
                    <Text
                      fontSize="text-sm"
                      className={`${
                        isDarkMode ? "text-white/70" : "text-black/70"
                      }`}
                    >
                      Select a location
                    </Text>
                  )}
                </View>
              </View>
              {selectedLocationName && (
                <PencilSquareIcon
                  color={isDarkMode ? "white" : "black"}
                  size={24}
                />
              )}
            </View>
          </TouchableOpacity>
        </View>

        <View className="space-y-2 mb-10">
          <Text
            fontSize="text-md"
            fontWeight="font-bold"
          >
            Product Address
          </Text>
          <Text className={`${isDarkMode ? "text-white/70" : "text-black/70"}`}>
            Add complete address where the product is located
          </Text>
          <TextInput
            placeholder="Enter address..."
            value={address}
            onChangeText={setAddress}
            placeholderTextColor={isDarkMode ? "#ffffff80" : "#00000080"}
            multiline
            className={`rounded-[12px] border h-32 p-3 ${
              isDarkMode
                ? "border-[#292929] text-white"
                : "border-[#e6e6e6] text-black"
            }`}
            style={{
              textAlignVertical: "top", // Ensures text starts at the top
            }}
          />
        </View>

        <View className="space-y-2 mb-10">
          <Text
            fontSize="text-md"
            fontWeight="font-bold"
          >
            How would you like to be contacted?
          </Text>
          <View className="pt-3">
            {options.map((option) => (
              <TouchableOpacity
                key={option.value}
                // onPress={() => setSelectedOption(option.value)}
                onPress={handleOptionChange.bind(null, option.value)}
                className="flex-row items-center mb-3"
              >
                {/* Use a View to create both checked and unchecked states */}
                <View
                  className={`w-5 h-5 rounded-full border-2 ${
                    selectedOption === option.value
                      ? "border-[#635BE8] bg-[#635BE8]"
                      : "border-gray-400"
                  } flex items-center justify-center`}
                >
                  {selectedOption === option.value && (
                    <View className="w-2.5 h-2.5 rounded-full bg-white" />
                  )}
                </View>
                <Text className="ml-3 text-base">{option.label}</Text>
              </TouchableOpacity>
            ))}
            <TextInput
              placeholder={`"Enter details"`}
              value={contactDetail}
              placeholderTextColor={isDarkMode ? "#ffffff80" : "#00000080"}
              onChangeText={setContactDetail}
              className={`rounded-[12px] h-12 border p-3  ${
                isDarkMode
                  ? "border-[#292929] text-white"
                  : "border-[#e6e6e6] text-black"
              }`}
            />
          </View>
        </View>
      </KeyboardAwareScrollView>
      <View className="py-2 px-5">
        <Button
          disabled={
            !formData.productName ||
            !formData.noOfUnits ||
            !selectedOption ||
            !range.startDate ||
            !range.endDate ||
            !address ||
            !contactDetail ||
            !selectedLocation
          }
          onPress={handleNextPress}
          className="flex items-center justify-center"
        >
          {loading ? (
            <Progress.CircleSnail
              size={22}
              color={"white"}
            />
          ) : (
            <View className="flex-row items-center translate-y-0.5 justify-center space-x-2">
              <Text
                fontWeight="font-bold"
                className={`${
                  !formData.productName ||
                  !formData.noOfUnits ||
                  !selectedOption ||
                  !range.startDate ||
                  !range.endDate ||
                  !address ||
                  !contactDetail ||
                  !selectedLocation
                    ? isDarkMode
                      ? "text-[#ffffff80]"
                      : "text-[#00000080]"
                    : "text-white"
                }`}
              >
                Submit
              </Text>
              <View className="ml-2">
                <ChevronRightIcon
                  size={16}
                  color={
                    formData.productName ||
                    formData.noOfUnits ||
                    selectedOption ||
                    range.startDate ||
                    !range.endDate ||
                    !address ||
                    !contactDetail ||
                    !selectedLocation
                      ? "#ffffff"
                      : "#888888"
                  }
                />
              </View>
            </View>
          )}
        </Button>
      </View>
      {open && (
        <DateRangePicker
          startDate={range.startDate}
          endDate={range.endDate}
          onConfirm={({ startDate, endDate }) => {
            setRange({ startDate, endDate });
            setOpen(false);
          }}
          onCancel={() => setOpen(false)}
        />
      )}
    </NonScrollableContainer>
  );
};

export default UnavailabilityFormInputs;
