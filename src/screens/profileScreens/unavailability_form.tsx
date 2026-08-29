import { Button, Text } from "@/components/core";
import CustomBottomSheetModal from "@/components/core/custom-bottom-sheet-modal";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { useGlobalContext } from "@/context/global-context";
import { useTypedNavigation } from "@/lib/types";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import React, { useState } from "react";
import { TextInput, TouchableOpacity, View } from "react-native";
import {
  ArrowLeftIcon,
  ChevronRightIcon,
  PencilSquareIcon,
  MapPinIcon,
  MagnifyingGlassIcon,
  ViewfinderCircleIcon,
} from "react-native-heroicons/outline";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { ScrollView } from "react-native-gesture-handler";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import { GOOGLE_MAP_API_KEY } from "@/lib/config";
import { styled } from "nativewind";

import { useProductContext } from "@/context/product-context";
import { NearbyPlace } from "@/lib/types";
import axios from "axios";
import * as Location from "expo-location";
import { useCallback, useEffect } from "react";
import { Platform } from "react-native";
import { ink, colors, radius } from "@/lib/design-tokens";

interface Coordinates {
  lat: number | undefined;
  lng: number | undefined;
}

interface UnavailabilityProps {}

const StyledBottomView = styled(BottomSheetView);

const UnavailabilityFormScreen: React.FC<UnavailabilityProps> = () => {
  const router = useTypedNavigation();
  const { theme } = useGlobalContext();
  const isDarkMode = theme === "dark";
  const [address, setAddress] = useState("");

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

  const bottomSheetRef = React.useRef<BottomSheetModal>(null);
  const googlePlacesRef = React.useRef<any>(null);

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
    // setBottomSheetVisible(true);
    bottomSheetRef.current?.present();
  };

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
  }, []);

  const handleSelectNearbyPlace = (place: any) => {
    setSelectedLocationName(place.name);
    setSelectedLocation({
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng,
    });
    bottomSheetRef.current?.close();
  };

  return (
    <NonScrollableContainer>
      <View
        className="flex-row items-center justify-between px-gutter "
        style={{ paddingVertical: wp("5%") }}
      >
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back"
          onPress={() => router.goBack()}
          className="flex-1 items-start w-[10%]"
        >
          <ArrowLeftIcon size={26} color={ink.text(isDarkMode)} />
        </TouchableOpacity>
        <View className="items-center justify-center w-[80%]">
          <Text fontSize="text-xl" fontWeight="font-bold">
            Request an item
          </Text>
        </View>

        <View className="w-[10%]"></View>
      </View>

      <KeyboardAwareScrollView className="px-gutter py-5 flex-1">
        <View className="space-y-2 mb-5">
          <View className="pb-2">
            <Text fontSize="text-md" fontWeight="font-bold">
              Location
            </Text>
          </View>

          <TouchableOpacity
            className={`h-[50px] rounded-card w-full ${
              isDarkMode
                ? "bg-canvas-dark border-input-line-dark"
                : "bg-surface-light border-input-line-light"
            } border px-2`}
            onPress={handleOpenBottomSheet}
          >
            <View className="flex flex-row h-full w-full items-center justify-between">
              <View className="flex flex-row items-center space-x-2 ">
                <MapPinIcon color={ink.text(isDarkMode)} size={24} />
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
                      className={`${
                        isDarkMode ? "text-muted-dark" : "text-muted-light"
                      }`}
                    >
                      Select a location
                    </Text>
                  )}
                </View>
              </View>
              {selectedLocationName && (
                <PencilSquareIcon
                  color={ink.text(isDarkMode)}
                  size={24}
                />
              )}
            </View>
          </TouchableOpacity>
        </View>
        <View className="">
          <TextInput
            style={{
              textAlignVertical: "top",
              // borderBlockColor: isDarkMode ? "#333" : "#FFF",
              color: ink.text(isDarkMode),
              // borderColor: isDarkMode ? "#444" : "#CCC",
            }}
            className={`p-4 h-40 text-[16px] rounded-group  ${
              isDarkMode
                ? "border-[1px] border-input-line-dark"
                : "border-[1px] border-input-line-light"
            }`}
            multiline={true}
            numberOfLines={10}
            placeholder="Your address"
            placeholderTextColor={ink.dim(isDarkMode)}
            autoComplete="off"
            autoCorrect={false}
            value={address}
            onChangeText={setAddress}
          />
        </View>
      </KeyboardAwareScrollView>
      <View className="py-2 px-gutter">
        <Button
          disabled={!address.trim() || !selectedLocation}
          onPress={() => {
            router.navigate("unavailabilityFormCategories");
          }}
          className="flex-row items-center justify-center"
        >
          <View className="flex-row items-center justify-between">
            <Text
              fontWeight="font-bold"
              className={`${
                !address.trim() || !selectedLocation
                  ? isDarkMode
                    ? "text-subtle-dark"
                    : "text-subtle-light"
                  : "text-white"
              }`}
            >
              Next
            </Text>
            <View className="mt-1">
              <ChevronRightIcon
                size={16}
                color={address ? "#FFFFFF" : ink.dim(false)}
              />
            </View>
          </View>
        </Button>
      </View>
      <CustomBottomSheetModal
        snapPoints={["50%", "75%", "90%"]}
        ref={bottomSheetRef}
        isDark={isDarkMode}
      >
        <StyledBottomView className="w-full px-gutter py-2 flex flex-col justify-start flex-1">
          <View className="h-full">
            <View
              className={`flex-row pl-3 min-h-11 rounded-card border ${
                isDarkMode
                  ? "border-input-line-dark bg-surface-dark"
                  : "border-input-line-light bg-surface-light"
              }`}
              style={{ alignItems: 'center' }}
            >
              <MagnifyingGlassIcon
                color={ink.body(isDarkMode)}
                size={24}
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
                    height: '100%',
                    marginTop: -8,
                    backgroundColor: ink.surface(isDarkMode),
                    borderRadius: radius.card,
                    paddingHorizontal: 8,
                    zIndex: 10,
                    color: ink.text(isDarkMode),
                    fontSize: 16,
                  },
                  row: {
                    backgroundColor: ink.surface(isDarkMode),
                  },
                  description: {
                    color: ink.text(isDarkMode),
                  },
                  separator: { backgroundColor: ink.line(true) },
                }}
                textInputProps={{
                  placeholderTextColor: ink.body(isDarkMode),
                }}
              />
            </View>

            <TouchableOpacity
              className={`h-[48px] rounded-card w-full border-b ${
                isDarkMode ? "border-input-line-dark" : "border-input-line-light"
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
                        isDarkMode ? "border-input-line-dark" : "border-input-line-light"
                      }`}
                    >
                      <MapPinIcon
                        color={ink.text(isDarkMode)}
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
};

export default UnavailabilityFormScreen;
