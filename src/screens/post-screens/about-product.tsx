import { useProfile } from "@/backend/profile";
import { Button, FieldLabel, FieldShell, Text, TextField, useFieldSurfaceStyle } from "@/components/core";
import CustomBottomSheetModal from "@/components/core/custom-bottom-sheet-modal";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { PostProductHeader } from "@/components/post/header";
import { useGlobalContext } from "@/context/global-context";
import { useProductContext } from "@/context/product-context";
import { GOOGLE_MAP_API_KEY } from "@/lib/config";
import { createLocationRequest } from "@/lib/location-request";
import { NearbyPlace, useTypedNavigation } from "@/lib/types";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import axios from "axios";
import * as Location from "expo-location";
import { styled } from "nativewind";
import * as React from "react";
import { useCallback, useEffect, useState } from "react";
import { Platform, Pressable, TextInput, TouchableOpacity, View } from "react-native";
import CountryPicker, { DARK_THEME, Flag } from "react-native-country-picker-modal";
import { Dropdown as RNEDropdown } from "react-native-element-dropdown";
import { ScrollView } from "react-native-gesture-handler";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CurrencyDollarIcon,
  CurrencyPoundIcon,
  CurrencyRupeeIcon,
  MapPinIcon,
  PencilSquareIcon,
  PhoneIcon,
  ViewfinderCircleIcon,
} from "react-native-heroicons/outline";

import {
  BadCondition,
  ExcellentCondition,
  GoodCondition,
} from "@/icons/conditions";
import { MaterialIcons } from "@expo/vector-icons";
import { SCREEN_GUTTER, MIN_TOUCH_TARGET, density, ink, colors, radius, space } from "@/lib/design-tokens";
import { SegmentedChoice } from "@/components/core/segmented-choice";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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

export default function AboutProduct() {
  const navigation = useTypedNavigation();
  const { saveDetails } = useProductContext();
  const { theme } = useGlobalContext();
  const isDark = theme === "dark";
  const insets = useSafeAreaInsets();
  const [productName, setProductName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [modelName, setModelName] = useState("");
  const [condition, setCondition] = useState("Select Condition");
  const [productDescription, setProductDescription] = useState("");
  const [usageDescription, setUsageDescription] = useState("");
  const [pricePerDay, setPricePerDay] = useState("");
  const [securityDeposit, setSecurityDeposit] = useState("");
  // Condition is a select, not a TextInput, so it tracks its own focus rather
  // than getting one for free from TextField.
  const [isFocus, setIsFocus] = useState(false);
  const [priceFocus, setPriceFocus] = useState(false);
  const [depositFocus, setDepositFocus] = useState(false);
  const [phoneFocus, setPhoneFocus] = useState(false);
  const [address, setAddress] = useState("");
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedValue, setSelectedValue] = useState<string>("");
  const [productCountry, setProductCountry] = useState<string>("India");

  const [contactPerson, setContactPerson] = useState<"Owner" | "Other" | null>(
    null
  );
  const [otherName, setOtherName] = useState("");
  const [otherPhoneNumber, setOtherPhoneNumber] = useState("");
  const [selectedLocationName, setSelectedLocationName] = useState<
    string | null
  >(null);
  const [selectedLocation, setSelectedLocation] =
    useState<Coordinates | null>();

  const [location, setLocation] = useState({
    latitude: 0,
    longitude: 0,
  });
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState({
    name: "",
    phone: "",
    coordinates: null as { lat: number; long: number } | null,
  });

  const [country, setCountry] = useState<any>({
    cca2: "IN",
    callingCode: "91",
    flag: "🇮🇳",
  });
  const { getMyDetails } = useProfile();

  const fetchMyDetails = async () => {
    const details = await getMyDetails();
    setDetails({
      name: details.first_name + " " + details.last_name,
      phone: details.phone,
      coordinates: details.coordinates ?? null,
    });
  };

  const bottomSheetRef = React.useRef<BottomSheetModal>(null);
  const googlePlacesRef = React.useRef<any>(null);
  /**
   * What is still missing, named.
   *
   * There are eight required fields spread over three screens of scroll, and
   * the footer only said "Fill in every required field to continue" — so the
   * customer had to hunt for the one they had skipped.
   */
  const missingFields = [
    !productName.trim() && "a product name",
    !selectedValue && "a condition",
    !productDescription.trim() && "a description",
    !isPositiveAmount(pricePerDay) && "a price per day",
    !isNonNegativeAmount(securityDeposit) && "a security deposit",
    !address.trim() && "a landmark",
    !(
      selectedLocation ||
      (location.latitude !== 0 && location.longitude !== 0) ||
      details.coordinates
    ) && "a location on the map",
    !(contactPerson === "Owner" || (otherName && otherPhoneNumber)) &&
      "a contact person",
  ].filter(Boolean) as string[];

  const allFieldsFilled = missingFields.length === 0;

  const missingLabel =
    missingFields.length === 0
      ? ""
      : missingFields.length === 1
      ? `Still needed: ${missingFields[0]}`
      : missingFields.length <= 3
      ? `Still needed: ${missingFields.slice(0, -1).join(", ")} and ${
          missingFields[missingFields.length - 1]
        }`
      : `Still needed: ${missingFields.length} fields, starting with ${missingFields[0]}`;

  const fetchAddress = useCallback(async (loc: Location.LocationObject) => {
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

        if (Platform.OS === "ios") {
          const addressLine1 = [streetNumber, street].filter(Boolean).join(" ");
          const addressLine2 = [district, city].filter(Boolean).join(", ");
          const addressLine3 = [region, postalCode].filter(Boolean).join(" ");

          formattedAddress = [addressLine1, addressLine2, addressLine3]
            .filter(Boolean)
            .join(", ");
        } else {
          formattedAddress = reverseGeocode[0].formattedAddress || "";
        }

        if (!formattedAddress) {
          const fallbackParts = [name, street, city, region, country].filter(
            Boolean
          );
          formattedAddress = fallbackParts.join(", ");
        }

        setSelectedLocationName(formattedAddress);
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
        setSelectedLocation(null);
        setSelectedLocationName(null);
        return;
      }

      setSelectedLocation({ lat: coords.latitude, lng: coords.longitude });
      setSelectedLocationName(addressToSend);

      if (!addressToSend) {
        return;
      }

      const addressParts = addressToSend.split(",");
      const country = addressParts[addressParts.length - 1].trim();
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
    // setBottomSheetVisible(false);
    bottomSheetRef.current?.close();
  };

  const renderBackdrop = (props: any) => (
    <BottomSheetBackdrop
      {...props}
      disappearsOnIndex={-1}
      opacity={0.8}
    />
  );

  const handleConfirmModalLocation = (
    coords: {
      latitude: number;
      longitude: number;
    },
    address: string | null
  ) => {
    setSelectedLocation({ lat: coords.latitude, lng: coords.longitude });
    setSelectedLocationName(address);
    setModalVisible(false);
  };

  const onPress = () => {
    const fallbackLocation =
      selectedLocation ??
      (location.latitude && location.longitude
        ? { lat: location.latitude, lng: location.longitude }
        : details.coordinates
        ? { lat: details.coordinates.lat, lng: details.coordinates.long }
        : null);

    saveDetails({
      name: productName,
      brandName: brandName,
      modelName: modelName,
      // condition: condition,
      condition: selectedValue,
      productDescription: productDescription,
      usageDescription: usageDescription,
      location: {
        lat: fallbackLocation?.lat ?? 0,
        long: fallbackLocation?.lng ?? 0,
      },
      pricePerDay: pricePerDay,
      securityDeposit: securityDeposit,
      personOfContact: {
        name: contactPerson === "Owner" ? details.name : otherName,
        phoneNumber:
          contactPerson === "Owner" ? details.phone : otherPhoneNumber,
      },
      address: address.trim() || selectedLocationName || "",
    });
    navigation.navigate("ProductImages");
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
    fetchMyDetails();
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
      <PostProductHeader
        heading="Tell us about your product"
        step={3}
        showBackArrow
      />

      {/*
        The iOS branch used to drop flex-1 here and pin a percentage of screen
        width as bottom padding, so the scroll container never reserved room for
        the home indicator and the primary CTA was clipped through the middle of
        its label with no way to scroll it into view. flex-1 on both platforms,
        and the reserved space comes from the measured safe-area inset.
      */}
      <View className="flex-1 justify-between">
        <KeyboardAwareScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          // The keyboard covered whichever field a customer tapped, and the
          // primary CTA below it, on the two longest forms in the app — a
          // plain ScrollView does not scroll a focused input into view for you.
          enableOnAndroid
          extraScrollHeight={16}
          contentContainerStyle={{
            paddingHorizontal: SCREEN_GUTTER,
            paddingTop: 16,
            paddingBottom: insets.bottom + 32,
          }}
        >
          <TextField
            label="Product name"
            required
            hint="Short and recognisable — “MacBook Air”, not a spec sheet"
            placeholder="e.g. MacBook Air"
            value={productName}
            onChangeText={setProductName}
          />

          <TextField
            label="Brand name"
            placeholder="e.g. Apple"
            value={brandName}
            onChangeText={setBrandName}
          />

          <TextField
            label="Model name/number"
            placeholder="e.g. MacBook Air 2024"
            value={modelName}
            onChangeText={setModelName}
          />

          <View style={{ marginBottom: density.fieldGap }}>
            <FieldLabel label="Condition" required />
            {/* Same surface tokens as every TextField beside it, with the
                border answering focus the way the rest of this screen's
                fields do — a select is not exempt from the one field look. */}
            <RNEDropdown
              onFocus={() => setIsFocus(true)}
              onBlur={() => setIsFocus(false)}
              style={{
                ...useFieldSurfaceStyle({ focused: isFocus }),
                height: MIN_TOUCH_TARGET,
              }}
              activeColor={ink.surface(isDark)}
              containerStyle={{
                marginTop: 10,
                backgroundColor: ink.surface(isDark),
                borderRadius: radius.group,
                borderColor: ink.inputLine(isDark),
                overflow: 'hidden'
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
              value={selectedValue}
              onChange={(item) => setSelectedValue(item.value)}
              renderLeftIcon={() =>
                selectedValue ? (
                  <View style={{ marginRight: 8 }}>
                    {
                      options.find((option) => option.value === selectedValue)
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

          <TextField
            label="Product description"
            required
            hint="What it is, what’s included, anything to watch for"
            placeholder="What it is, what condition it’s in, what’s included"
            value={productDescription}
            onChangeText={setProductDescription}
            multiline
          />

          <TextField
            label="Usage description"
            hint="Show a renter how to use it"
            placeholder="Setup, handling, anything easy to get wrong"
            value={usageDescription}
            onChangeText={setUsageDescription}
            multiline
          />

          <View style={{ marginBottom: density.fieldGap }}>
            <FieldLabel label="Product location" required />
            <TouchableOpacity
              onPress={handleOpenBottomSheet}
              accessibilityRole="button"
              accessibilityLabel={selectedLocationName ?? "Pin the location on a map"}
            >
              <FieldShell>
                <MapPinIcon color={ink.text(isDark)} size={24} />
                <View style={{ flex: 1 }}>
                  {selectedLocationName ? (
                    <Text
                      fontSize="text-xs"
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {selectedLocationName}
                    </Text>
                  ) : (
                    <Text fontSize="text-sm" tone="dim">
                      Pin the location on a map
                    </Text>
                  )}
                </View>
                {selectedLocationName && (
                  <PencilSquareIcon color={ink.text(isDark)} size={24} />
                )}
              </FieldShell>
            </TouchableOpacity>
          </View>

          {/* The map pin above sets the location that drives discovery. This
              field is the detail a renter needs once they are on the street —
              labelled as such, rather than as a second, free-text "address"
              competing with the picker. */}
          <TextField
            label="Flat, building and landmark"
            required
            hint="The bit a map can’t tell them — floor, building name, the shop opposite."
            placeholder="e.g. 2nd floor, Sunrise Apartments, opposite the bakery"
            value={address}
            onChangeText={setAddress}
            multiline
          />

          <View style={{ marginBottom: density.fieldGap }}>
            <FieldLabel
              label="Price per day"
              required
              hint="What a renter pays per day"
            />
            <FieldShell focused={priceFocus}>
              {productCountry === "India" && (
                <MaterialIcons name="currency-rupee" color={ink.brandText(isDark)} size={20} />
              )}
              {productCountry === "USA" && (
                <MaterialIcons name="attach-money" color={ink.brandText(isDark)} size={20} />
              )}
              {productCountry === "UK" && (
                <MaterialIcons name="currency-pound" color={ink.brandText(isDark)} size={20} />
              )}
              <TextInput
                placeholder="e.g. 1200"
                keyboardType="numeric"
                value={pricePerDay}
                onChangeText={(value) => setPricePerDay(value.replace(/[^\d.]/g, ""))}
                placeholderTextColor={ink.placeholder(isDark)}
                onFocus={() => setPriceFocus(true)}
                onBlur={() => setPriceFocus(false)}
                style={{ flex: 1, color: ink.text(isDark) }}
              />
            </FieldShell>
          </View>

          <View style={{ marginBottom: density.fieldGap }}>
            <FieldLabel
              label="Security deposit"
              required
              hint="Refunded when the item comes back"
            />
            <FieldShell focused={depositFocus}>
              {productCountry === "India" && (
                <MaterialIcons name="currency-rupee" color={ink.brandText(isDark)} size={20} />
              )}
              {productCountry === "USA" && (
                <MaterialIcons name="attach-money" color={ink.brandText(isDark)} size={20} />
              )}
              {productCountry === "UK" && (
                <MaterialIcons name="currency-pound" color={ink.brandText(isDark)} size={20} />
              )}
              <TextInput
                placeholder="e.g. 2500"
                placeholderTextColor={ink.placeholder(isDark)}
                keyboardType="numeric"
                value={securityDeposit}
                onChangeText={(value) => setSecurityDeposit(value.replace(/[^\d.]/g, ""))}
                onFocus={() => setDepositFocus(true)}
                onBlur={() => setDepositFocus(false)}
                style={{ flex: 1, color: ink.text(isDark) }}
              />
            </FieldShell>
          </View>

          <View style={{ marginBottom: density.fieldGap }}>
            <FieldLabel
              label="Who should renters contact?"
              required
              hint="Who answers questions and hands the item over"
            />

            <SegmentedChoice
              accessibilityLabel="Who should renters contact?"
              value={contactPerson}
              onChange={(next) => {
                setContactPerson(next);
                if (next === "Owner") {
                  setOtherName("");
                  setOtherPhoneNumber("");
                }
              }}
              options={[
                { value: "Owner", label: "Me", hint: "Use my details" },
                { value: "Other", label: "Someone else", hint: "Add their details" },
              ]}
            />

            {contactPerson === "Other" && (
              <View>
                <View style={{ marginTop: density.fieldGap }}>
                  <TextField
                    label="Name"
                    required
                    placeholder="Enter name"
                    value={otherName}
                    onChangeText={setOtherName}
                  />
                </View>

                <View>
                  <FieldLabel label="Phone number" required />
                  <View className="flex-row flex-1 space-x-2">
                    <FieldShell style={{ flex: 0.5, justifyContent: "center" }}>
                      <CountryPicker
                        {...(isDark && { theme: DARK_THEME })}
                        renderCountryFilter={(props) => <TextInput placeholder="Search country" style={{ height: 40, borderBottomWidth: 1, width: '80%', borderColor: 'rgba(0,0,0,0.5)' }} className="" {...props} />}
                        withFlag
                        renderFlagButton={({ onOpen }) => <Pressable onPress={onOpen}>
                          <Flag countryCode={country.cca2} flagSize={16} />
                        </Pressable>
                        }
                        withCallingCode
                        withFilter
                        withCallingCodeButton
                        countryCode={country.cca2}
                        onSelect={(country) => {
                          setCountry({
                            cca2: country.cca2,
                            callingCode: country.callingCode[0],
                            flag: country.flag,
                          });
                        }}
                      />
                      <ChevronDownIcon size={16} color={ink.text(isDark)} />
                    </FieldShell>

                    <FieldShell focused={phoneFocus} style={{ flex: 1 }}>
                      <Text>+{country.callingCode}</Text>
                      <TextInput
                        maxLength={10}
                        placeholder="Enter phone number"
                        value={otherPhoneNumber}
                        keyboardType="number-pad"
                        onChangeText={setOtherPhoneNumber}
                        placeholderTextColor={ink.placeholder(isDark)}
                        onFocus={() => setPhoneFocus(true)}
                        onBlur={() => setPhoneFocus(false)}
                        style={{ flex: 1, color: ink.text(isDark) }}
                      />
                    </FieldShell>
                  </View>
                </View>
              </View>
            )}
          </View>
          {/* One disabled treatment, and it says why it is disabled rather
              than leaving the customer to guess which field is missing. */}
          {!allFieldsFilled ? (
            <Text
              fontSize="text-sm"
              tone="dim"
              style={{ textAlign: "center", marginBottom: 8 }}
            >
              {missingLabel}
            </Text>
          ) : null}
          <Button disabled={!allFieldsFilled} onPress={onPress}>
            <Text
              fontWeight="font-bold"
              fontSize="text-md"
              tone={allFieldsFilled ? "onBrand" : "dim"}
            >
              Next
            </Text>
            <ChevronRightIcon
              size={16}
              color={allFieldsFilled ? ink.onBrand() : ink.dim(isDark)}
              style={{ marginLeft: 6 }}
            />
          </Button>
        </KeyboardAwareScrollView>
      </View>
      {/* <LocationModal onConfirm={handleConfirmModalLocation} /> */}

      {/* <CustomBottomSheetModal
        snapPoints={["50%", "75%", "90%"]}
        ref={bottomSheetRef}
        isDark={isDark}
      >
        <StyledBottomView className="w-full px-gutter py-2 flex flex-col justify-start flex-1">
          <View className="h-full">
            <View
              className={`flex-row pl-3 min-h-11 rounded-card border ${
                isDark
                  ? "border-input-line-dark bg-surface-dark"
                  : "border-input-line-light bg-surface-light"
              }`}
            >
              <MagnifyingGlassIcon
                color={ink.body(isDark)}
                size={24}
                style={{ marginTop: space.sm }}
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
              className={`h-[48px] rounded-card w-full border-b ${
                isDark ? "border-input-line-dark" : "border-input-line-light"
              } px-2 mt-4`}
              onPress={handleCurrentLocation}
            >
              <View className="flex flex-row h-full w-full items-center justify-between">
                <View className="flex flex-row items-center space-x-4">
                  <ViewfinderCircleIcon color={colors.dark.brand} size={24} />
                  <Text fontWeight="font-bold" className="text-brand">
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
                      className={`pl-3 py-5 flex-row items-center space-x-3 border-b ${
                        isDark ? "border-input-line-dark" : "border-input-line-light"
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
      </CustomBottomSheetModal> */}
    </NonScrollableContainer>
  );
}
