import { useProfile } from "@/backend/profile";
import { Button, Text } from "@/components/core";
import CustomBottomSheetModal from "@/components/core/custom-bottom-sheet-modal";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { useGlobalContext } from "@/context/global-context";
import { GOOGLE_MAP_API_KEY } from "@/lib/config";
import { NearbyPlace, RouteProps, useTypedNavigation } from "@/lib/types";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { useRoute } from "@react-navigation/native";
import axios from "axios";
import * as Location from "expo-location";
import { styled } from "nativewind";
import * as React from "react";
import { useCallback, useEffect, useState } from "react";
import { Platform, Pressable, TextInput, TouchableOpacity, View } from "react-native";
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
import * as Progress from "react-native-progress";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import Toast from "react-native-toast-message";
import {
  BadCondition,
  ExcellentCondition,
  GoodCondition,
} from "@/icons/conditions";
import { MaterialIcons } from "@expo/vector-icons";
type ConditionOption = {
  label: string;
  value: string;
  icon: JSX.Element;
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

const StyledBottomView = styled(BottomSheetView);

export default function EditAboutProduct() {
  const navigation = useTypedNavigation();
  const route = useRoute<RouteProps<"EditAboutProduct">>();
  const { data } = route.params;

  const { updateMyProductDetails, loading: L } = useProfile();

  const { theme } = useGlobalContext();
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
    productName &&
    // brandName &&
    // modelName &&
    condition &&
    // productDescription &&
    // usageDescription &&
    pricePerDay &&
    securityDeposit &&
    // selectedLocation &&
    (contactPerson === "Owner" || (otherName && otherPhoneNumber));


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
    // setBottomSheetVisible(true);
    navigation.navigate("LocationModal", {
      onGoBack: (coordinates, addressToSend) =>
        handleDataFromLocation(coordinates, addressToSend),
    });
  };

  const handleDataFromLocation = useCallback(
    (coords: any, addressToSend: any) => {
      setSelectedLocation({ lat: coords.latitude, lng: coords.longitude });
      setSelectedLocationName(addressToSend);
      const addressParts = addressToSend.split(",");

      const country = addressParts[addressParts.length - 1].trim();

      // Validate country
      const validCountries = ["USA", "UK", "India"];
      if (!validCountries.includes(country)) {
        Toast.show({
          type: "error",
          text1: "Country not supported!",
          text2: "We are currently only available in India, USA and UK",
          position: "bottom",
          text1Style: { color: "red" },
        });
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

      Toast.show({
        type: "customToast",
        position: "bottom",
        text1: "Your product was updated!",
        text2: "success",
      });

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
      icon: (
        <ExcellentCondition
          size={20}
          color={`${isDark ? "white" : "black"}`}
        />
      ),
    },
    {
      label: "Good",
      value: "good",
      icon: (
        <GoodCondition
          size={20}
          color={`${isDark ? "white" : "black"}`}
        />
      ),
    },
    {
      label: "Fair",
      value: "fair",
      icon: (
        <BadCondition
          size={20}
          color={`${isDark ? "white" : "black"}`}
        />
      ),
    },
  ];

  return (
    <NonScrollableContainer>
      <View className=" h-10 items-center justify-center pt-2">
        <View className="flex-row items-center justify-between">
          <View className="w-[10%]">
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              className={`flex-row items-center py-4 px-6`}
            >
              <View className="mt-1 pr-1">
                <ArrowLeftIcon
                  className=""
                  size={20}
                  color={theme === "dark" ? "white" : "black"}
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

      <View
        className={`${Platform.OS === "ios" ? "" : "flex-1"
          } justify-between pt-2`}
        style={{
          paddingBottom: Platform.OS === "ios" ? wp("15%") : 0,
        }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            padding: 16,
          }}
          style={{ height: "100%" }}
        >
          <View className="space-y-2 mb-10">
            <Text
              fontSize="text-md"
              fontWeight="font-bold"
            >
              Product Name
              <Text style={{ color: '#E50914' }}>{" "}*</Text>

            </Text>
            <Text className={`${isDark ? "text-white/70" : "text-black/70"}`}>
              Keep the name concise with relevant info
            </Text>
            <TextInput
              placeholder={`"Macbook Air"`}
              value={productName}
              placeholderTextColor={isDark ? "#ffffff80" : "#00000080"}
              onChangeText={setProductName}
              className={`rounded-[12px] h-12 border p-3 ${isDark
                ? "border-[#292929] text-white"
                : "border-[#e6e6e6] text-black"
                }`}
            />
          </View>

          <View className="space-y-2 mb-10">
            <Text
              fontSize="text-md"
              fontWeight="font-bold"
            >
              Brand Name
            </Text>
            <TextInput
              placeholder={`"Apple"`}
              placeholderTextColor={isDark ? "#ffffff80" : "#00000080"}
              value={brandName}
              onChangeText={setBrandName}
              className={`rounded-[12px] h-12 border p-3 ${isDark
                ? "border-[#292929] text-white"
                : "border-[#e6e6e6] text-black"
                }`}
            />
          </View>

          <View className="space-y-2 mb-10">
            <Text
              fontSize="text-md"
              fontWeight="font-bold"
            >
              Model Name/Number
            </Text>
            <TextInput
              placeholder={`"Macbook Air 2024"`}
              value={modelName}
              placeholderTextColor={isDark ? "#ffffff80" : "#00000080"}
              onChangeText={setModelName}
              className={`rounded-[12px] h-12 border p-3 ${isDark
                ? "border-[#292929] text-white"
                : "border-[#e6e6e6] text-black"
                }`}
            />
          </View>

          <View className="space-y-2 mb-10">
            <Text
              fontSize="text-md"
              fontWeight="font-bold"
            >
              Condition
              <Text style={{ color: '#E50914' }}>{" "}*</Text>
            </Text>
            <Text className={`${isDark ? "text-white/70" : "text-black/70"}`}>
              Choose the condition your product is in currently
            </Text>

            <RNEDropdown
              style={{
                height: 48,
                backgroundColor: isDark ? "#000" : "#fff",
                borderRadius: 10,
                borderWidth: 1,
                borderColor: isDark ? "#292929" : "#E6E6E6",
                paddingHorizontal: 16,
                marginVertical: 10,
              }}
              activeColor={isDark ? "#0F0F0F" : "#e6e6e6"}
              containerStyle={{
                marginTop: 10,
                backgroundColor: isDark ? "#000" : "#FFF",
                borderRadius: 14,
              }}
              itemTextStyle={{
                color: isDark ? "white" : "black",
              }}
              itemContainerStyle={{
                borderBottomWidth: 1,
                borderBottomColor: isDark ? "#292929" : "#E6E6E6",
              }}
              placeholderStyle={{ color: "gray", fontSize: 15 }}
              selectedTextStyle={{ color: isDark ? "#fff" : "#000" }}
              inputSearchStyle={{
                height: 40,
                fontSize: 16,
                borderRadius: 10,
                color: isDark ? "#fff" : "#000",
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
                    style={{ marginLeft: 8, color: isDark ? "white" : "black" }}
                  >
                    {item.label}
                  </Text>
                </View>
              )}
              placeholder="Select Condition"
            />
          </View>

          <View className="space-y-2 mb-10">
            <Text
              fontSize="text-md"
              fontWeight="font-bold"
            >
              Product Description
            </Text>
            <Text className={`${isDark ? "text-white/70" : "text-black/70"}`}>
              Tell us more about your product: Any info that the buyer might
              need to know
            </Text>
            <TextInput
              placeholder="Type something..."
              value={productDescription}
              onChangeText={setProductDescription}
              placeholderTextColor={isDark ? "#ffffff80" : "#00000080"}
              multiline
              className={`rounded-[12px] border h-32 p-3 ${isDark
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
              Usage Description
            </Text>
            <Text className={`${isDark ? "text-white/70" : "text-black/70"}`}>
              Educate the buyer on how to use your product
            </Text>
            <TextInput
              placeholder="Type something..."
              value={usageDescription}
              onChangeText={setUsageDescription}
              placeholderTextColor={isDark ? "#ffffff80" : "#00000080"}
              multiline
              className={`rounded-[12px] border h-32 p-3 ${isDark
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
              Product Location
              <Text style={{ color: '#E50914' }}>{" "}*</Text>
            </Text>
            <Text className={`${isDark ? "text-white/70" : "text-black/70"}`}>
              Mention the product's location
            </Text>

            <TouchableOpacity
              className={`h-[50px] rounded-[12px] w-full ${isDark
                ? "bg-[#000] border-[#292929]"
                : "bg-white border-[#e6e6e6]"
                } border px-2`}
              onPress={handleOpenBottomSheet}
            >
              <View className="flex flex-row h-full w-full items-center justify-between">
                <View className="flex flex-row items-center space-x-2 ">
                  <MapPinIcon
                    color={isDark ? "white" : "black"}
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
                        className={`${isDark ? "text-white/70" : "text-black/70"
                          }`}
                      >
                        Select a location
                      </Text>
                    )}
                  </View>
                </View>
                {selectedLocationName && (
                  <PencilSquareIcon
                    color={isDark ? "white" : "black"}
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
              <Text style={{ color: '#E50914' }}>{" "}*</Text>
            </Text>
            <Text className={`${isDark ? "text-white/70" : "text-black/70"}`}>
              Add complete address where the product is located
            </Text>
            <TextInput
              placeholder="Enter address..."
              value={address}
              onChangeText={setAddress}
              placeholderTextColor={isDark ? "#ffffff80" : "#00000080"}
              multiline
              className={`rounded-[12px] border h-32 p-3 ${isDark
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
              Price Per Day
              <Text style={{ color: '#E50914' }}>{" "}*</Text>
            </Text>
            <Text className={`${isDark ? "text-white/70" : "text-black/70"}`}>
              Set a fair rent for the product to get maximum offers
            </Text>
            <View
              className={`flex-row items-center rounded-[12px] border px-3 ${isDark
                ? "border-[#292929] text-white"
                : "border-[#e6e6e6] text-black"
                }`}
            >
              {productCountry === "India" && (
                <MaterialIcons
                  name="currency-rupee"
                  color={"#635BE8"}
                  size={20}
                />
              )}
              {(productCountry === "USA" || productCountry === 'United States') && (
                <MaterialIcons
                  name="attach-money"
                  color={"#635BE8"}
                  size={20}
                />
              )}
              {productCountry === "UK" && (
                <MaterialIcons
                  name="currency-pound"
                  color={"#635BE8"}
                  size={20}
                />
              )}
              <TextInput
                placeholder={`"₹1200"`}
                keyboardType="numeric"
                value={pricePerDay}
                onChangeText={setPricePerDay}
                placeholderTextColor={isDark ? "#ffffff80" : "#00000080"}
                className={`flex-1 h-12 p-3 ${isDark ? "text-white" : "text-black"
                  }`}
              />
            </View>
          </View>

          <View className="space-y-2 mb-10">
            <Text
              fontSize="text-md"
              fontWeight="font-bold"
            >
              Security Deposit
              <Text style={{ color: '#E50914' }}>{" "}*</Text>
            </Text>
            <Text className={`${isDark ? "text-white/70" : "text-black/70"}`}>
              Set a fair security deposit to rent your product
            </Text>
            <View
              className={`flex-row items-center rounded-[12px] border px-3 ${isDark
                ? "border-[#292929] text-white"
                : "border-[#e6e6e6] text-black"
                }`}
            >
              {productCountry === "India" && (
                <MaterialIcons
                  name="currency-rupee"
                  color={"#635BE8"}
                  size={20}
                />
              )}
              {(productCountry === "USA" || productCountry === 'United States') && (
                <MaterialIcons
                  name="attach-money"
                  color={"#635BE8"}
                  size={20}
                />
              )}
              {productCountry === "UK" && (
                <MaterialIcons
                  name="currency-pound"
                  color={"#635BE8"}
                  size={20}
                />
              )}
              <TextInput
                placeholder={`"₹2500"`}
                placeholderTextColor={isDark ? "#ffffff80" : "#00000080"}
                keyboardType="numeric"
                value={securityDeposit}
                onChangeText={setSecurityDeposit}
                className={`flex-1 h-12 p-3 ${isDark ? "text-white" : "text-black"
                  }`}
              />
            </View>
          </View>

          <View className="space-y-2 mb-10">
            <Text
              fontSize="text-md"
              fontWeight="font-bold"
            >
              Concerned person of contact
              <Text style={{ color: '#E50914' }}>{" "}*</Text>
            </Text>
            <Text className={`${isDark ? "text-white/70" : "text-black/70"}`}>
              Mention who the person of contact would be in case of any
              questions or queries from the buyer
            </Text>

            <View className="flex-row items-center justify-between">
              {/* Owner Option */}
              <TouchableOpacity
                onPress={() => {
                  setContactPerson("Owner");
                  setOtherName("");
                  setOtherPhoneNumber("");
                }}
                className={`rounded-[12px] h-12 border w-[49%] p-3 flex-row items-center justify-between ${contactPerson === "Owner"
                  ? "border-[#635BE8]"
                  : isDark
                    ? "border-[#292929] text-white"
                    : "border-[#e6e6e6] text-black"
                  }`}
              >
                <Text fontSize="text-sm">Owner</Text>
                {contactPerson === "Owner" && (
                  <CheckIcon
                    size={18}
                    color="#635BE8"
                  />
                )}
              </TouchableOpacity>

              {/* Other Option */}
              <TouchableOpacity
                onPress={() => setContactPerson("Other")}
                className={`rounded-[12px] h-12 border w-[49%] p-3 flex-row items-center justify-between ${contactPerson === "Other"
                  ? "border-[#635BE8]"
                  : isDark
                    ? "border-[#292929] text-white"
                    : "border-[#e6e6e6] text-black"
                  }`}
              >
                <Text fontSize="text-sm">Other</Text>
                {contactPerson === "Other" && (
                  <CheckIcon
                    size={18}
                    color="#635BE8"
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
                    placeholderTextColor={isDark ? "#ffffff80" : "#00000080"}
                    className={`rounded-[12px] h-12 border p-3 ${isDark
                      ? "border-[#292929] text-white"
                      : "border-[#e6e6e6] text-black"
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
                  <View className="flex-row flex-1 gap-x-2 ">
                    <View
                      className={` rounded-[12px] flex-[0.5] border h-12  flex-row items-center justify-center ${isDark
                        ? "border-[#292929] text-white"
                        : "border-[#e6e6e6] text-black"
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
                          color={isDark ? "#ffffff" : "#000"}
                          className="mt-1"
                        />
                      </View>
                    </View>

                    <View
                      // className="flex-row items-center flex-1"
                      className={`flex-row items-center rounded-[12px] flex-1 border px-3 h-12  ${isDark
                        ? "border-[#292929] text-white"
                        : "border-[#e6e6e6] text-black"
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
                            isDark ? "#ffffff80" : "#00000080"
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
                <Progress.CircleSnail
                  color={"white"}
                  size={22}
                />
              ) : (
                <Text
                  fontWeight="font-bold"
                  className={`${allFieldsFilled ? "text-white" : "text-gray-500"
                    }`}
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
        <StyledBottomView className="w-full px-5 py-2 flex flex-col justify-start flex-1">
          <View className="h-full">
            <View
              className={`flex-row pl-3 min-h-11 rounded-[12px] border ${isDark
                ? "border-[#292929] bg-[#0F0F0F]"
                : "border-[#e6e6e6] bg-white"
                }`}
            >
              <MagnifyingGlassIcon
                color={isDark ? "#FFFFFFB2" : "#000000B2"}
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
                    backgroundColor: isDark ? "#0F0F0F" : "#fff",
                    borderRadius: 12,
                    paddingHorizontal: 8,
                    zIndex: 10,
                    color: isDark ? "#fff" : "#000",
                    fontSize: 16,
                  },
                  row: {
                    backgroundColor: isDark ? "#0F0F0F" : "#FFF",
                  },
                  description: {
                    color: isDark ? "#fff" : "#000",
                  },
                  separator: { backgroundColor: "#292929" },
                }}
                textInputProps={{
                  placeholderTextColor: isDark ? "#FFFFFFB2" : "#000000B2",
                }}
              />
            </View>

            <TouchableOpacity
              className={`h-[48px] rounded-[12px] w-full border-b ${isDark ? "border-[#292929]" : "border-[#e6e6e6]"
                } px-2 mt-4`}
              onPress={handleCurrentLocation}
            >
              <View className="flex flex-row h-full w-full items-center justify-between">
                <View className="flex flex-row items-center space-x-4">
                  <ViewfinderCircleIcon
                    color="#635be8"
                    size={24}
                  />
                  <Text
                    fontWeight="font-bold"
                    className="text-brand-blue"
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
                <ScrollView>
                  {nearbyPlaces.map((item) => (
                    <TouchableOpacity
                      key={item.place_id}
                      onPress={() => handleSelectNearbyPlace(item)}
                      className={`pl-3 py-5 flex-row items-center space-x-3 border-b ${isDark ? "border-[#292929]" : "border-[#e6e6e6]"
                        }`}
                    >
                      <MapPinIcon
                        color={isDark ? "white" : "black"}
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
