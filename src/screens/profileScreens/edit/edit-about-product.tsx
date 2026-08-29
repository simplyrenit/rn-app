import { useProfile } from "@/backend/profile";
import { Button, Text } from "@/components/core";
import CustomBottomSheetModal from "@/components/core/custom-bottom-sheet-modal";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { useGlobalContext } from "@/context/global-context";
import { GOOGLE_MAP_API_KEY } from "@/lib/config";
import { createLocationRequest } from "@/lib/location-request";
import { NearbyPlace, RouteProps, useTypedNavigation } from "@/lib/types";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { useRoute } from "@react-navigation/native";
import axios from "axios";
import * as Location from "expo-location";
import { styled } from "nativewind";
import * as React from "react";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, TextInput, TouchableOpacity, View } from "react-native";
import CountryPicker, { DARK_THEME, Flag } from "react-native-country-picker-modal";
import { Dropdown as RNEDropdown } from "react-native-element-dropdown";
import { ScrollView } from "react-native-gesture-handler";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import {
  ArrowLeftIcon,
  CheckIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  PencilSquareIcon,
  PhoneIcon,
  ViewfinderCircleIcon,
} from "react-native-heroicons/outline";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";

import {
  BadCondition,
  ExcellentCondition,
  GoodCondition,
} from "@/icons/conditions";
import { MaterialIcons } from "@expo/vector-icons";
import { RequiredMark } from "@/components/core/field";
import { ink, colors, radius } from "@/lib/design-tokens";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SCREEN_GUTTER } from "@/lib/design-tokens";
import { toast } from "@/lib/toast";
type ConditionOption = {
  label: string;
  value: string;
  icon: JSX.Element | null;
};

interface Coordinates {
  lat: number | undefined;
  lng: number | undefined;
}

const conditions = [
  { label: "Excellent", value: "Excellent" },
  { label: "Fair", value: "Fair" },
  { label: "Good", value: "Good" },
];

const isPositiveAmount = (value: string) =>
  /^\d+(\.\d{1,2})?$/.test(value) && Number(value) > 0;
const isNonNegativeAmount = (value: string) =>
  /^\d+(\.\d{1,2})?$/.test(value) && Number(value) >= 0;

const StyledBottomView = styled(BottomSheetView);

export default function EditAboutProduct() {
  const navigation = useTypedNavigation();
  const route = useRoute<RouteProps<"EditAboutProduct">>();
  const { data } = route.params;

  const { updateMyProductDetails, loading: L } = useProfile();

  const { theme } = useGlobalContext();
  const insets = useSafeAreaInsets();
  const isDark = theme === "dark";
  const [productName, setProductName] = useState(data.title || "");
  const [brandName, setBrandName] = useState(data.brand_name || "");
  const [modelName, setModelName] = useState(data.model_name || "");
  const [condition, setCondition] = useState(
    data.condition || "Select Condition"
  );
  const [productDescription, setProductDescription] = useState(
    data.description || ""
  );
  const [usageDescription, setUsageDescription] = useState(
    data.usage_description || ""
  );
  const [pricePerDay, setPricePerDay] = useState(data.rate?.toString() || "");
  const [securityDeposit, setSecurityDeposit] = useState(
    data.security_deposit?.toString() || ""
  );
  const [isFocus, setIsFocus] = useState(false);

  const [contactPerson, setContactPerson] = useState<"Owner" | "Other" | null>(
    data.isOwnerContact ? 'Owner' : 'Other'
  );
  const [otherName, setOtherName] = useState(data.contact_name || "");
  const [otherPhoneNumber, setOtherPhoneNumber] = useState(
    data.contact_number?.slice(-10) || ""
  );

  const [selectedLocationName, setSelectedLocationName] = useState<
    string | null
  >(null);
  const [selectedLocation, setSelectedLocation] = useState<Coordinates | null>(
    null
  );
  const [address, setAddress] = useState(data.location || "");
  const { userDetails } = useGlobalContext();
  const [location, setLocation] = useState({
    latitude: data.coordinates.lat || 0,
    longitude: data.coordinates.long || 0,
  });
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([]);
  const [loading, setLoading] = useState(false);

  const [country, setCountry] = useState<any>({
    cca2: "IN",
    callingCode: "91",
    flag: "🇮🇳",
  });

  const [productCountry, setProductCountry] = useState<string>("India");

  const bottomSheetRef = React.useRef<BottomSheetModal>(null);
  const googlePlacesRef = React.useRef<any>(null);

  const allFieldsFilled =
    productName.trim() &&
    // brandName &&
    // modelName &&
    condition !== "Select Condition" &&
    productDescription.trim() &&
    // usageDescription &&
    isPositiveAmount(pricePerDay) &&
    isNonNegativeAmount(securityDeposit) &&
    address.trim() &&
    (selectedLocation || (location.latitude !== 0 && location.longitude !== 0)) &&
    (contactPerson === "Owner" || (otherName && otherPhoneNumber));

  const fetchAddress = useCallback(async (loc: {
    coords: Pick<Location.LocationObjectCoords, "latitude" | "longitude">;
  }) => {
    try {
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      setSelectedLocation({
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
      });

      if (reverseGeocode.length > 0) {
        const {
          name,
          street,
          streetNumber,
          district,
          city,
          region,
          postalCode,
          country,
        } = reverseGeocode[0];

        let formattedAddress = "";

        // if (Platform.OS === "ios") {
        //   const addressLine1 = [streetNumber, street].filter(Boolean).join(" ");
        //   const addressLine2 = [district, city].filter(Boolean).join(", ");
        //   const addressLine3 = [region, postalCode].filter(Boolean).join(" ");

        //   formattedAddress = [addressLine1, addressLine2, addressLine3]
        //     .filter(Boolean)
        //     .join(", ");
        // } else {
        formattedAddress = reverseGeocode[0].formattedAddress || "";
        // }

        if (!formattedAddress) {
          const fallbackParts = [name, street, city, region, country].filter(
            Boolean
          );
          formattedAddress = fallbackParts.join(", ");
        }

        setSelectedLocationName(formattedAddress);
        // Validate country
        if (country) {
          setProductCountry(country);
        }
      }
    } catch (error) {
      console.error(error);
    }
  }, []);

  const handleOpenBottomSheet = () => {
    navigation.navigate("LocationModal", {
      requestId: createLocationRequest(handleDataFromLocation),
    });
  };

  const handleDataFromLocation = useCallback(
    (
      coords: { latitude: number; longitude: number } | null,
      addressToSend: string | null
    ) => {
      if (!coords) {
        return;
      }

      setSelectedLocation({ lat: coords.latitude, lng: coords.longitude });
      setSelectedLocationName(addressToSend);

      if (!addressToSend) {
        return;
      }

      const addressParts = addressToSend.split(",");

      const country = addressParts[addressParts.length - 1].trim();

      // Validate country
      const validCountries = ["USA", "UK", "India"];
      if (!validCountries.includes(country)) {
        toast.error("Country not supported!", { message: "We are currently only available in India, USA and UK" });
        return;
      }

      setProductCountry(country);
    },
    []
  );

  const handleCurrentLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      return;
    }

    let location = await Location.getCurrentPositionAsync({});
    fetchAddress(location);

    bottomSheetRef.current?.close();
  };

  const onPress = async () => {
    try {
      const formattedProductData = {
        title: productName,
        brand_name: brandName,
        model_name: modelName,
        condition: condition.toLowerCase(),
        description: productDescription,
        location: address,
        usage_description: usageDescription,
        rate: `${parseFloat(pricePerDay)}`,
        security_deposit: `${parseFloat(securityDeposit)}`,
        coordinates: {
          lat: selectedLocation?.lat ?? location.latitude ?? 0,
          long: selectedLocation?.lng ?? location.longitude ?? 0,
        },
        contact_name: contactPerson === "Other" ? otherName : userDetails?.name,
        contact_number:
          contactPerson === "Other" ? otherPhoneNumber : userDetails?.phone,
      };

      await updateMyProductDetails(data.name, formattedProductData);

      toast.success("Your product was updated!");

      navigation.goBack();
    } catch (error) {
      console.error("Error updating product details:", error);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { coords } = await Location.getCurrentPositionAsync();
      setLocation(coords);
    } catch (error) {
    }
  };

  const fetchNearbyPlaces = async () => {
    if (!location) return;

    setLoading(true);

    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location.latitude},${location.longitude}&radius=1500&type=restaurant&key=${GOOGLE_MAP_API_KEY}`;

    try {
      const response = await axios.get(url);
      setNearbyPlaces(response.data.results); // Save nearby places
    } catch (error) {
      console.error("Error fetching nearby places: ", error);
    } finally {
      setLoading(false);
    }
  };

  const askForLocationPermission = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      return;
    }
    const { coords } = await Location.getCurrentPositionAsync();
    setLocation(coords);
  };

  useEffect(() => {
    if (location) {
      fetchNearbyPlaces();
    } else {
      // ask the user for permission to access location
      askForLocationPermission();
    }
  }, [location]);

  useEffect(() => {
    getCurrentLocation(); // Fetch current location on component mount
    {
      fetchAddress({
        coords: {
          latitude: data.coordinates.lat,
          longitude: data.coordinates.long,
        },
      });
    }
  }, []);

  const handleSelectNearbyPlace = (place: any) => {
    setSelectedLocationName(place.name);
    setSelectedLocation({
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng,
    });
    bottomSheetRef.current?.close();
  };
  const options: ConditionOption[] = [
    {
      label: "Excellent",
      value: "excellent",
      icon: null,
    },
    {
      label: "Good",
      value: "good",
      icon: null,
    },
    {
      label: "Fair",
      value: "fair",
      icon: null,
    },
  ];

  return (
    <NonScrollableContainer>
      <View className=" h-10 items-center justify-center pt-2">
        <View className="flex-row items-center justify-between">
          <View className="w-[10%]">
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back"
              onPress={() => navigation.goBack()}
              className={`flex-row items-center py-4 px-6`}
            >
              <View className="mt-1 pr-1">
                <ArrowLeftIcon
                  className=""
                  size={20}
                  color={ink.text(isDark)}
                />
              </View>
            </TouchableOpacity>
          </View>
          <View className="w-[80%]">
            <View className="h-24 items-center justify-center">
              <Text
                fontSize="text-lg"
                fontWeight="font-bold"
              >
                Edit Product Details
              </Text>
            </View>
          </View>
          <View className="w-[10%]"></View>
        </View>
      </View>

      {/* Same defect as the create flow: the iOS branch dropped flex-1 and
          reserved a percentage of screen width, so the scroll container never
          made room for the home indicator and the CTA was clipped. */}
      <View className="flex-1 justify-between pt-2">
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: SCREEN_GUTTER,
            paddingTop: 16,
            paddingBottom: insets.bottom + 32,
          }}
        >
          <View className="space-y-1 mb-5">
            <Text fontSize="text-sm" fontWeight="font-semibold" tone="hi">
              Product Name
              <RequiredMark />

            </Text>
            <Text fontSize="text-xs" tone="body">
              Short and recognisable — “MacBook Air”, not a spec sheet
            </Text>
            <TextInput
              placeholder="e.g. MacBook Air"
              value={productName}
              placeholderTextColor={ink.dim(isDark)}
              onChangeText={setProductName}
              className={`rounded-input h-11 border px-3 ${isDark
                ? "border-input-line-dark text-white"
                : "border-input-line-light text-black"
                }`}
            />
          </View>

          <View className="space-y-1 mb-5">
            <Text fontSize="text-sm" fontWeight="font-semibold" tone="hi">
              Brand Name
            </Text>
            <TextInput
              placeholder="e.g. Apple"
              placeholderTextColor={ink.dim(isDark)}
              value={brandName}
              onChangeText={setBrandName}
              className={`rounded-input h-11 border px-3 ${isDark
                ? "border-input-line-dark text-white"
                : "border-input-line-light text-black"
                }`}
            />
          </View>

          <View className="space-y-1 mb-5">
            <Text fontSize="text-sm" fontWeight="font-semibold" tone="hi">
              Model Name/Number
            </Text>
            <TextInput
              placeholder="e.g. MacBook Air 2024"
              value={modelName}
              placeholderTextColor={ink.dim(isDark)}
              onChangeText={setModelName}
              className={`rounded-input h-11 border px-3 ${isDark
                ? "border-input-line-dark text-white"
                : "border-input-line-light text-black"
                }`}
            />
          </View>

          <View className="space-y-1 mb-5">
            <Text fontSize="text-sm" fontWeight="font-semibold" tone="hi">
              Condition
              <RequiredMark />
            </Text>

            <RNEDropdown
              style={{
                height: 48,
                backgroundColor: ink.canvas(isDark),
                borderRadius: radius.input,
                borderWidth: 1,
                borderColor: ink.line(isDark),
                paddingHorizontal: 16,
                marginVertical: 10,
              }}
              activeColor={ink.surface(isDark)}
              containerStyle={{
                marginTop: 10,
                backgroundColor: ink.canvas(isDark),
                borderRadius: radius.group,
              }}
              itemTextStyle={{
                color: ink.text(isDark),
              }}
              itemContainerStyle={{
                borderBottomWidth: 1,
                borderBottomColor: ink.line(isDark),
              }}
              placeholderStyle={{ color: ink.placeholder(isDark), fontSize: 16 }}
              selectedTextStyle={{ color: ink.text(isDark) }}
              inputSearchStyle={{
                height: 40,
                fontSize: 16,
                borderRadius: radius.input,
                color: ink.text(isDark),
              }}
              iconStyle={{ marginRight: 10 }}
              data={options}
              labelField="label"
              valueField="value"
              value={condition}
              onChange={(item) => setCondition(item.value)}
              renderLeftIcon={() =>
                condition ? (
                  <View style={{ marginRight: 8 }}>
                    {
                      options.find((option) => option.value === condition)
                        ?.icon
                    }
                  </View>
                ) : null
              }
              renderItem={(item) => (
                <View
                  className="p-4"
                  style={{ flexDirection: "row", alignItems: "center" }}
                >
                  {item.icon}
                  <Text
                    style={{ marginLeft: 8, color: ink.text(isDark) }}
                  >
                    {item.label}
                  </Text>
                </View>
              )}
              placeholder="Select Condition"
            />
          </View>

          <View className="space-y-1 mb-5">
            <Text fontSize="text-sm" fontWeight="font-semibold" tone="hi">
              Product Description
            </Text>
            <Text fontSize="text-xs" tone="body">
              What it is, what’s included, anything to watch for
            </Text>
            <TextInput
              placeholder="What it is, what condition it’s in, what’s included"
              value={productDescription}
              onChangeText={setProductDescription}
              placeholderTextColor={ink.dim(isDark)}
              multiline
              className={`rounded-card border h-32 p-3 ${isDark
                ? "border-input-line-dark text-white"
                : "border-input-line-light text-black"
                }`}
              style={{
                textAlignVertical: "top", // Ensures text starts at the top
              }}
            />
          </View>

          <View className="space-y-1 mb-5">
            <Text fontSize="text-sm" fontWeight="font-semibold" tone="hi">
              Usage Description
            </Text>
            <Text fontSize="text-xs" tone="body">
              Show a renter how to use it
            </Text>
            <TextInput
              placeholder="Setup, handling, anything easy to get wrong"
              value={usageDescription}
              onChangeText={setUsageDescription}
              placeholderTextColor={ink.dim(isDark)}
              multiline
              className={`rounded-card border h-32 p-3 ${isDark
                ? "border-input-line-dark text-white"
                : "border-input-line-light text-black"
                }`}
              style={{
                textAlignVertical: "top", // Ensures text starts at the top
              }}
            />
          </View>

          <View className="space-y-1 mb-5">
            <Text fontSize="text-sm" fontWeight="font-semibold" tone="hi">
              Product Location
              <RequiredMark />
            </Text>

            <TouchableOpacity
              className={`h-[50px] rounded-card w-full ${isDark
                ? "bg-canvas-dark border-input-line-dark"
                : "bg-surface-light border-input-line-light"
                } border px-2`}
              onPress={handleOpenBottomSheet}
            >
              <View className="flex flex-row h-full w-full items-center justify-between">
                <View className="flex flex-row items-center space-x-2 ">
                  <MapPinIcon
                    color={ink.text(isDark)}
                    size={24}
                  />
                  <View className="w-3/4">
                    {selectedLocationName ? (
                      // <Text fontSize="text-md">{selectedLocationName}</Text>
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
                        className={`${isDark ? "text-muted-dark" : "text-muted-light"
                          }`}
                      >
                        Select a location
                      </Text>
                    )}
                  </View>
                </View>
                {selectedLocationName && (
                  <PencilSquareIcon
                    color={ink.text(isDark)}
                    size={24}
                  />
                )}
              </View>
            </TouchableOpacity>
          </View>

          <View className="space-y-1 mb-5">
            <Text fontSize="text-sm" fontWeight="font-semibold" tone="hi">
              Product Address
              <RequiredMark />
            </Text>
            <Text fontSize="text-xs" tone="body">
              Add complete address where the product is located
            </Text>
            <TextInput
              placeholder="Enter address..."
              value={address}
              onChangeText={setAddress}
              placeholderTextColor={ink.dim(isDark)}
              multiline
              className={`rounded-card border h-32 p-3 ${isDark
                ? "border-input-line-dark text-white"
                : "border-input-line-light text-black"
                }`}
              style={{
                textAlignVertical: "top", // Ensures text starts at the top
              }}
            />
          </View>

          <View className="space-y-1 mb-5">
            <Text fontSize="text-sm" fontWeight="font-semibold" tone="hi">
              Price Per Day
              <RequiredMark />
            </Text>
            <Text fontSize="text-xs" tone="body">
              What a renter pays per day
            </Text>
            <View
              className={`flex-row items-center rounded-card border px-3 ${isDark
                ? "border-input-line-dark text-white"
                : "border-input-line-light text-black"
                }`}
            >
              {productCountry === "India" && (
                <MaterialIcons
                  name="currency-rupee"
                  color={colors.dark.brand}
                  size={20}
                />
              )}
              {(productCountry === "USA" || productCountry === 'United States') && (
                <MaterialIcons
                  name="attach-money"
                  color={colors.dark.brand}
                  size={20}
                />
              )}
              {productCountry === "UK" && (
                <MaterialIcons
                  name="currency-pound"
                  color={colors.dark.brand}
                  size={20}
                />
              )}
              <TextInput
                placeholder="e.g. 1200"
                keyboardType="numeric"
                value={pricePerDay}
                onChangeText={(value) => setPricePerDay(value.replace(/[^\d.]/g, ""))}
                placeholderTextColor={ink.dim(isDark)}
                className={`flex-1 h-12 p-3 ${isDark ? "text-white" : "text-black"
                  }`}
              />
            </View>
          </View>

          <View className="space-y-1 mb-5">
            <Text fontSize="text-sm" fontWeight="font-semibold" tone="hi">
              Security Deposit
              <RequiredMark />
            </Text>
            <Text fontSize="text-xs" tone="body">
              Refunded when the item comes back
            </Text>
            <View
              className={`flex-row items-center rounded-card border px-3 ${isDark
                ? "border-input-line-dark text-white"
                : "border-input-line-light text-black"
                }`}
            >
              {productCountry === "India" && (
                <MaterialIcons
                  name="currency-rupee"
                  color={colors.dark.brand}
                  size={20}
                />
              )}
              {(productCountry === "USA" || productCountry === 'United States') && (
                <MaterialIcons
                  name="attach-money"
                  color={colors.dark.brand}
                  size={20}
                />
              )}
              {productCountry === "UK" && (
                <MaterialIcons
                  name="currency-pound"
                  color={colors.dark.brand}
                  size={20}
                />
              )}
              <TextInput
                placeholder="e.g. 2500"
                placeholderTextColor={ink.dim(isDark)}
                keyboardType="numeric"
                value={securityDeposit}
                onChangeText={(value) => setSecurityDeposit(value.replace(/[^\d.]/g, ""))}
                className={`flex-1 h-12 p-3 ${isDark ? "text-white" : "text-black"
                  }`}
              />
            </View>
          </View>

          <View className="space-y-1 mb-5">
            <Text fontSize="text-sm" fontWeight="font-semibold" tone="hi">
              Concerned person of contact
              <RequiredMark />
            </Text>
            <Text fontSize="text-xs" tone="body">
              Mention who the person of contact would be in case of any
              questions from renters
            </Text>

            <View className="flex-row items-center justify-between">
              {/* Owner Option */}
              <TouchableOpacity
                onPress={() => {
                  setContactPerson("Owner");
                  setOtherName("");
                  setOtherPhoneNumber("");
                }}
                className={`rounded-card h-12 border w-[49%] p-3 flex-row items-center justify-between ${contactPerson === "Owner"
                  ? "border-brand"
                  : isDark
                    ? "border-input-line-dark text-white"
                    : "border-input-line-light text-black"
                  }`}
              >
                <Text fontSize="text-sm">Owner</Text>
                {contactPerson === "Owner" && (
                  <CheckIcon
                    size={18}
                    color={colors.dark.brand}
                  />
                )}
              </TouchableOpacity>

              {/* Other Option */}
              <TouchableOpacity
                onPress={() => setContactPerson("Other")}
                className={`rounded-card h-12 border w-[49%] p-3 flex-row items-center justify-between ${contactPerson === "Other"
                  ? "border-brand"
                  : isDark
                    ? "border-input-line-dark text-white"
                    : "border-input-line-light text-black"
                  }`}
              >
                <Text fontSize="text-sm">Other</Text>
                {contactPerson === "Other" && (
                  <CheckIcon
                    size={18}
                    color={colors.dark.brand}
                  />
                )}
              </TouchableOpacity>
            </View>

            {contactPerson === "Other" && (
              <View>
                <View className="space-y-2 mt-8">
                  <Text
                    fontSize="text-md"
                    fontWeight="font-bold"
                  >
                    Name
                  </Text>
                  <TextInput
                    placeholder="Enter name"
                    value={otherName}
                    onChangeText={setOtherName}
                    placeholderTextColor={ink.dim(isDark)}
                    className={`rounded-input h-11 border px-3 ${isDark
                      ? "border-input-line-dark text-white"
                      : "border-input-line-light text-black"
                      }`}
                  />
                </View>

                <View className="space-y-2 mt-8">
                  <Text
                    fontSize="text-md"
                    fontWeight="font-bold"
                  >
                    Phone Number
                  </Text>
                  <View className="flex-row flex-1 space-x-2 ">
                    <View
                      className={` rounded-card flex-[0.5] border h-12  flex-row items-center justify-center ${isDark
                        ? "border-input-line-dark text-white"
                        : "border-input-line-light text-black"
                        }`}
                    >
                      <CountryPicker
                        {...(isDark && { theme: DARK_THEME })}
                        withFlag
                        withCallingCode
                        withFilter
                        withCallingCodeButton
                        renderFlagButton={({ onOpen }) => <Pressable onPress={onOpen}>
                          <Flag countryCode={country.cca2} flagSize={16} />
                        </Pressable>
                        }
                        countryCode={country.cca2}
                        onSelect={(country) => {
                          setCountry({
                            cca2: country.cca2,
                            callingCode: country.callingCode[0],
                            flag: country.flag,
                          });
                        }}
                      />
                      <View className="ml-2 ">
                        <ChevronDownIcon
                          size={16}
                          color={ink.text(isDark)}
                          className="mt-1"
                        />
                      </View>
                    </View>

                    <View
                      // className="flex-row items-center flex-1"
                      className={`flex-row items-center rounded-card flex-1 border px-3 h-12  ${isDark
                        ? "border-input-line-dark text-white"
                        : "border-input-line-light text-black"
                        }`}
                    >
                      <View className="pr-2 items-center justify-center">
                        <Text>
                          +{country.callingCode}
                        </Text>
                      </View>
                      <View>
                        <TextInput
                          maxLength={10}
                          placeholder="Enter phone number"
                          value={otherPhoneNumber}
                          keyboardType="number-pad"
                          onChangeText={setOtherPhoneNumber}
                          placeholderTextColor={
                            ink.dim(isDark)
                          }
                          className={`flex-1 h-12 p-3  ${isDark ? "text-white" : "text-black"
                            }`}
                        />
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </View>
          <Button
            className="w-full items-center justify-between mt-10"
            disabled={!allFieldsFilled}
            onPress={onPress}
          >
            <View className="flex-row items-center justify-between">
              {L ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text tone="body"
                  fontWeight="font-bold"
                  style={{ color: "#FFFFFF" }}
                >
                  Update Product
                </Text>
              )}
            </View>
          </Button>
        </ScrollView>
      </View>

      <CustomBottomSheetModal
        snapPoints={["50%", "75%", "90%"]}
        ref={bottomSheetRef}
        isDark={isDark}
      >
        <StyledBottomView className="w-full px-gutter py-2 flex flex-col justify-start flex-1">
          <View className="h-full">
            <View
              className={`flex-row pl-3 min-h-11 rounded-card border ${isDark
                ? "border-input-line-dark bg-surface-dark"
                : "border-input-line-light bg-surface-light"
                }`}
            >
              <MagnifyingGlassIcon
                color={ink.body(isDark)}
                size={24}
                style={{ marginTop: hp(1.1) }}
              />
              <GooglePlacesAutocomplete
                ref={googlePlacesRef}
                placeholder="Search area or street name"
                query={{ key: GOOGLE_MAP_API_KEY }}
                fetchDetails={true}
                onPress={(data, details = null) => {
                  setSelectedLocationName(data.description);
                  setSelectedLocation({
                    lat: details?.geometry.location.lat,
                    lng: details?.geometry.location.lng,
                  });
                  bottomSheetRef.current?.close();
                }}
                onFail={(error) => console.log(error)}
                onNotFound={() => console.log("no results")}
                enablePoweredByContainer={false}
                styles={{
                  textInput: {
                    height: 40,
                    backgroundColor: ink.surface(isDark),
                    borderRadius: radius.card,
                    paddingHorizontal: 8,
                    zIndex: 10,
                    color: ink.text(isDark),
                    fontSize: 16,
                  },
                  row: {
                    backgroundColor: ink.surface(isDark),
                  },
                  description: {
                    color: ink.text(isDark),
                  },
                  separator: { backgroundColor: ink.line(true) },
                }}
                textInputProps={{
                  placeholderTextColor: ink.body(isDark),
                }}
              />
            </View>

            <TouchableOpacity
              className={`h-[48px] rounded-card w-full border-b ${isDark ? "border-input-line-dark" : "border-input-line-light"
                } px-2 mt-4`}
              onPress={handleCurrentLocation}
            >
              <View className="flex flex-row h-full w-full items-center justify-between">
                <View className="flex flex-row items-center space-x-4">
                  <ViewfinderCircleIcon
                    color={colors.dark.brand}
                    size={24}
                  />
                  <Text
                    fontWeight="font-bold"
                    className="text-brand"
                  >
                    Use current location
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            <View className="">
              {loading ? (
                <Text className="mt-3">Loading nearby places...</Text>
              ) : (
                <ScrollView keyboardShouldPersistTaps="handled">
                  {nearbyPlaces.map((item) => (
                    <TouchableOpacity
                      key={item.place_id}
                      onPress={() => handleSelectNearbyPlace(item)}
                      className={`pl-3 py-5 flex-row items-center space-x-3 border-b ${isDark ? "border-input-line-dark" : "border-input-line-light"
                        }`}
                    >
                      <MapPinIcon
                        color={ink.text(isDark)}
                        size={20}
                      />
                      <Text fontSize="text-sm">{item.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          </View>
        </StyledBottomView>
      </CustomBottomSheetModal>
    </NonScrollableContainer>
  );
}
