import { useSearch } from "@/backend/search";
import { StaticContainer, Text } from "@/components/core";
import DateRangePicker from "@/components/core/date-range-picker";
import { useGlobalContext } from "@/context/global-context";
import { ALL_PRODUCTS, GOOGLE_MAP_API_KEY } from "@/lib/config";
import axiosInstance from "@/lib/networkUtils";
import { NearbyPlace, RouteProps, useTypedNavigation } from "@/lib/types";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { useRoute } from "@react-navigation/native";
import axios from "axios";
import * as Location from "expo-location";
import { styled } from "nativewind";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { AutocompleteDropdown } from "react-native-autocomplete-dropdown";
import {
  GestureHandlerRootView,
  ScrollView,
  TextInput,
} from "react-native-gesture-handler";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import {
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  PencilSquareIcon,
  ViewfinderCircleIcon,
  XMarkIcon,
} from "react-native-heroicons/outline";
import { CalendarIcon } from "react-native-heroicons/solid";
import { heightPercentageToDP as hp } from "react-native-responsive-screen";

const StyledBottomView = styled(BottomSheetView);

interface Coordinates {
  lat: number | undefined;
  lng: number | undefined;
}

export default function SearchScreen() {
  const navigation = useTypedNavigation();
  const { theme } = useGlobalContext();
  const isDark = theme === "dark";
  const route = useRoute<RouteProps<"Search">>();
  const { what, where, coords } = route?.params ?? {};

  const [selectedItem, setSelectedItem] = useState<string | null>(what ?? null);
  const [selectedLocationName, setSelectedLocationName] = useState<string | null>(
    where ?? null
  );
  const [location, setLocation] = useState({
    latitude: 0,
    longitude: 0,
  });

  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);

  const [selectedLocation, setSelectedLocation] = useState<Coordinates | null>(
    coords
      ? {
          lat: coords.lat,
          lng: coords.lng,
        }
      : null
  );
  const [range, setRange] = useState({
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined,
  });
  const [open, setOpen] = useState(false);
  const [isFocus, setIsFocus] = useState(false);
  const [isBottomSheetVisible, setBottomSheetVisible] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [suggestionsList, setSuggestionsList] = useState<any[] | null>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const googlePlacesRef = useRef<any>(null);
  const autocompleteDropdownRef = useRef<any>(null);
  const dropdownController = useRef<any>(null);

  const formatDate = (date: Date | undefined) => {
    if (!date) return "";
    const options: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
    };
    return date.toLocaleDateString("en-US", options);
  };

  const cleanUp = () => {
    setSelectedItem(null);
    setSelectedLocation(null);
    setSelectedLocationName(null); // Reset the location name
    setRange({ startDate: undefined, endDate: undefined });
    googlePlacesRef.current?.clear();
    autocompleteDropdownRef.current?.clear();
  };

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
    setBottomSheetVisible(true);
    bottomSheetRef.current?.expand();
  };

  const handleCurrentLocation = async () => {
    setLocationError(null);
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setLocationError("Location access is denied. Search for an area or street instead.");
      return;
    }

    let location = await Location.getCurrentPositionAsync({});
    fetchAddress(location);
    setBottomSheetVisible(false);
  };

  const isSearchDisabled = /* !selectedItem || */ !selectedLocation;

  const onPress = async () => {
    try {
      setProductsLoading(true);
      const products = await searchProducts(
        selectedItem!,
        { lat: selectedLocation!.lat!, lng: selectedLocation!.lng! },
        {
          start_date: range?.startDate?.toISOString() ?? undefined,
          end_date: range?.endDate?.toISOString() ?? undefined,
        }
      );
      navigation.navigate("SearchResults", {
        selectedItem: selectedItem!,
        address: selectedLocationName!,
        coords: { lat: selectedLocation?.lat, lng: selectedLocation?.lng },
        range,
        products,
      });
    } catch (e) { } finally {
      setProductsLoading(false)
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
      setNearbyPlaces(response.data.results);
    } catch (error) {
      console.error("Error fetching nearby places: ", error);
    } finally {
      setLoading(false);
    }
  };

  const askForLocationPermission = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      console.log("Permission to access location was denied");
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

  useEffect(() => {
    setSelectedItem(what ?? null);
    setSelectedLocationName(where ?? null);
    setSelectedLocation(
      coords
        ? {
            lat: coords.lat,
            lng: coords.lng,
          }
        : null
    );
  }, [coords, what, where]);

  useEffect(() => {
    const hydrateRouteLocation = async () => {
      if (!where || coords || selectedLocation) {
        return;
      }

      try {
        const geocoded = await Location.geocodeAsync(where);
        const firstMatch = geocoded[0];

        if (!firstMatch) {
          return;
        }

        setSelectedLocation({
          lat: firstMatch.latitude,
          lng: firstMatch.longitude,
        });
      } catch (error) {
        console.error("Error geocoding route location:", error);
      }
    };

    void hydrateRouteLocation();
  }, [coords, selectedLocation, where]);

  const { searchProducts } = useSearch();

  const handleSelectNearbyPlace = (place: any) => {
    setSelectedLocationName(place.name);
    setSelectedLocation({
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng,
    });
    bottomSheetRef.current?.close();
  };

  const renderBackdrop = (props: any) => (
    <BottomSheetBackdrop
      {...props}
      disappearsOnIndex={-1}
      opacity={0.8}
    />
  );

  const getSuggestions = useCallback(async (q: string) => {
    if (typeof q !== "string" || q.length < 2) {
      setSuggestionsList([]);
      return;
    }
    setLoading(true);
    try {
      const response = await axiosInstance.get(`${ALL_PRODUCTS}?title=${q}`);
      const { products } = response.data;
      const suggestions = products.map((item: string, index: number) => ({
        id: index,
        title: item,
      }));
      setSuggestionsList(suggestions);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      setSuggestionsList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StaticContainer width={100}>
        <View className="h-full w-full pt-2">
          {/* Header */}

          <View
            className={`p-3 flex flex-row items-center border-b ${isDark ? "border-b-[#292929]" : "border-b-[#e6e6e6]"
              }`}
          >
            <View className="w-[10%]">
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <ArrowLeftIcon
                  color={isDark ? "white" : "black"}
                  size={24}
                />
              </TouchableOpacity>
            </View>
            <View className="w-[80%] h-full items-center">
              <Text
                fontSize="text-xl"
                fontWeight="font-bold"
              >
                Search anything
              </Text>
            </View>
            <View className="w-[10%]"></View>
          </View>

          {/* What? Dropdown */}
          <View
            className={`p-5 border-b ${isDark ? "border-b-[#292929]" : "border-b-[#e6e6e6]"
              }`}
          >
            <Text
              fontSize="text-md"
              fontWeight="font-bold"
              className="mb-3"
            >
              What?
            </Text>
            <View
              style={isFocus && styles.focusedShadow}
              className={`flex-row items-center rounded-[12px] w-full pl-2 border ${isFocus
                ? `${isDark
                  ? "border-[#635BE8] bg-[#0F0F0F]"
                  : "border-[#635BE8] bg-white"
                }`
                : `${isDark
                  ? "border-[#292929] bg-[#0F0F0F]"
                  : "border-[#e6e6e6] bg-white"
                }`
                }`}
            >
              <MagnifyingGlassIcon
                color={isDark ? "white" : "black"}
                size={24}
                style={{
                  marginTop: 2,
                  position: 'absolute',
                  zIndex: 12,
                  left: 8
                }}
              />
              <AutocompleteDropdown
                ref={autocompleteDropdownRef}
                dataSet={suggestionsList}
                onChangeText={(text) => {
                  getSuggestions(text);
                  setSelectedItem(text); // Set selectedItem to the input text
                }}
                // initialValue={selectedItem ?? undefined}
                inputContainerStyle={{
                  backgroundColor: isDark ? "#0F0F0F" : "#ffffff",
                  borderRadius: 10,
                  width: "98%",
                  paddingLeft: 24,
                }}
                useFilter={false}
                onFocus={() => {
                  setTimeout(() => setIsFocus(true), 100);
                }}
                onBlur={() => {
                  setTimeout(() => setIsFocus(false), 100);
                }}
                closeOnSubmit
                onSubmit={() => setIsFocus(false)}
                textInputProps={{
                  placeholder: `"Washing Machine"`,
                  autoCapitalize: "none",
                  autoComplete: "off",
                  autoCorrect: false,
                  numberOfLines: 1,
                  value: what && what === selectedItem ? what : selectedItem ?? undefined,
                  placeholderTextColor: isDark ? "#FFFFFF80" : "#00000080",
                  style: {
                    color: isDark ? "#fff" : "#000",
                    fontSize: 14,

                    width: "95%",
                  },
                }}
                suggestionsListContainerStyle={{
                  backgroundColor: isDark ? "#0F0F0F" : "#ffffff",
                  borderWidth: 1,
                  borderColor: isDark ? "#292929" : "#E6E6E6",
                  width: "100%",
                }}
                onSelectItem={(item) => {
                  if (item) {
                    setSelectedItem(item.title!);
                  }
                }}
                suggestionsListMaxHeight={250}
                containerStyle={{
                  flexGrow: 1,
                }}
                showChevron={false}
                renderItem={(item) => <Text className="p-5">{item.title}</Text>}
                closeOnBlur={true}
                ClearIconComponent={
                  <XMarkIcon
                    color={isDark ? "white" : "black"}
                    size={24}
                  />
                }
              />
            </View>
          </View>

          {/* Where? */}
          <View
            className={`p-5 border-b ${isDark ? "border-b-[#292929]" : "border-b-[#e6e6e6]"
              }`}
          >
            <Text
              fontSize="text-md"
              fontWeight="font-bold"
              className="mb-3"
            >
              Where?
            </Text>
            <TouchableOpacity
              className={`h-[48px] rounded-[12px] w-full ${isDark
                ? "bg-[#0F0F0F] border-[#292929]"
                : "bg-white border-[#e6e6e6]"
                } border px-2`}
              onPress={handleOpenBottomSheet}
            >
              <View className="flex flex-row h-full w-full items-center justify-between">
                <View className="flex flex-row items-center space-x-2 flex-1">
                  <MapPinIcon
                    color={isDark ? "white" : "black"}
                    size={24}
                  />
                  <View className="flex-1">
                    {selectedLocationName ? ( // Show selected location name if available
                      <Text fontSize="text-sm" numberOfLines={1}>
                        {selectedLocationName}
                      </Text>
                    ) : (
                      <Text style={{ color: "gray", fontSize: 15 }}>
                        {"  "}Select a location
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

          {/* When? Range Picker */}
          <View className="p-5 flex-1">
            <Text
              fontSize="text-md"
              fontWeight="font-bold"
              className="mb-3"
            >
              When?
            </Text>
            <TouchableOpacity
              onPress={() => setOpen(true)}
              className={`h-[48px] rounded-[12px] w-full ${isDark
                ? "bg-[#0F0F0F] border-[#292929]"
                : "bg-white border-[#e6e6e6]"
                } border px-2`}
            >
              <View className="flex flex-row h-full w-full items-center justify-between">
                <View className="flex flex-row items-center space-x-4">
                  <CalendarIcon
                    color={isDark ? "white" : "black"}
                    size={24}
                  />
                  {range.startDate && range.endDate ? (
                    <Text style={{ fontSize: 15 }}>
                      {formatDate(range.startDate)} -{" "}
                      {formatDate(range.endDate)}
                    </Text>
                  ) : (
                    <Text style={{ color: "gray", fontSize: 15 }}>
                      Select dates
                    </Text>
                  )}
                </View>
                {range.endDate && (
                  <PencilSquareIcon
                    color={isDark ? "white" : "black"}
                    size={24}
                  />
                )}
              </View>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View
            className={`p-5 flex flex-row items-center justify-between h-[76px] border-t ${isDark ? "border-t-[#292929]" : "border-t-[#e6e6e6]"
              }`}
          >
            <View className="w-[20%]">
              <TouchableOpacity onPress={cleanUp}>
                <Text
                  fontSize="text-sm"
                  fontWeight="font-bold"
                  className="underline"
                >
                  Clear all
                </Text>
              </TouchableOpacity>
            </View>

            <View className="">
              <TouchableOpacity
                disabled={isSearchDisabled || productsLoading}
                className={`${isSearchDisabled ? "bg-[#635be875]" : "bg-brand-blue"
                  } py-4 px-4 rounded-[12px] h-[44px] items-center justify-center items-center align-center`}
                onPress={onPress}
              >
                <View className="flex flex-row items-center">
                  {productsLoading ? <ActivityIndicator color='#fff' size={22} /> : <MagnifyingGlassIcon
                    color="white"
                    size={22}
                  />}
                  <Text
                    fontSize="text-sm"
                    fontWeight="font-bold"
                    className="text-white ml-1"
                  >
                    Search
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Bottom Sheet */}
          {isBottomSheetVisible && (
            <BottomSheet
              ref={bottomSheetRef}
              backdropComponent={renderBackdrop}
              index={1}
              snapPoints={["50%", "75%", "90%"]}
              enablePanDownToClose={true}
              backgroundStyle={{ backgroundColor: isDark ? "black" : "white" }}
              onClose={() => setBottomSheetVisible(false)}
              handleIndicatorStyle={{
                backgroundColor: isDark ? "#292929" : "#e6e6e6",
              }}
              handleStyle={{
                borderTopWidth: 2,
                borderLeftWidth: 2,
                borderRightWidth: 2,
                borderTopColor: isDark ? "#292929" : "#e6e6e6",
                borderLeftColor: isDark ? "#292929" : "#e6e6e6",
                borderRightColor: isDark ? "#292929" : "#e6e6e6",
                borderTopRightRadius: 50,
                borderTopLeftRadius: 50,
              }}
            >
              <StyledBottomView className="w-full px-5 py-2 flex flex-col justify-start flex-1">
                <View className="h-full">
                  <View
                    className={`flex-row pl-3 min-h-11 rounded-[12px] border ${isDark
                      ? "border-[#292929] bg-[#0F0F0F]"
                      : "border-[#e6e6e6] bg-white"
                      }`}
                    style={{ alignItems: 'flex-start' }}
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
                          height: '100%',
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
                        placeholderTextColor: isDark
                          ? "#FFFFFFB2"
                          : "#000000B2",
                      }}
                    />
                  </View>

                  {locationError && (
                    <Text className="mt-3 text-sm text-gray-500">
                      {locationError}
                    </Text>
                  )}

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
            </BottomSheet>
          )}
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
      </StaticContainer>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  focusedShadow: {
    shadowColor: "#635BE8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
});
