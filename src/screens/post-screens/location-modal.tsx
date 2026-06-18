import { Image } from "expo-image";
import * as Location from "expo-location";
import { StatusBar } from "expo-status-bar";
import { styled } from "nativewind";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  TouchableOpacity,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";
import { HeaderIndicator } from "@/components/auth/headerIndicator";
import { Button, StaticContainer, Text } from "@/components/core";
import AddressChoiceModal from "@/components/modals/AddressChoiceModalProps";
import { useGlobalContext } from "@/context/global-context";
import darkModeMapStyle from "assets/mapJSON/darkModeMapStyle.json";
import BottomSheet, { BottomSheetFlatList } from "@gorhom/bottom-sheet";
import { GOOGLE_MAP_API_KEY } from "@/lib/config";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import {
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { NearbyPlace, RouteProps, useTypedNavigation } from "@/lib/types";
import axios from "axios";
import {
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  ViewfinderCircleIcon,
} from "react-native-heroicons/outline";
import { useAuthContext } from "@/context/auth-context";
import { useAuth } from "@/backend/auth";

const StyledImage = styled(Image);
import { Modal, View, StyleSheet } from "react-native";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { useRoute } from "@react-navigation/native";

const LOCATION_LOG_PREFIX = "[post/location-modal]";
const LOCATION_FETCH_TIMEOUT_MS = 12000;
const DEFAULT_MAP_REGION = {
  latitude: 19,
  longitude: 72,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

const LocationModal = ({}) => {
  const route = useRoute<RouteProps<"LocationModal">>();
  const { theme, setAuthTokens } = useGlobalContext();
  const { signUpUser, loading: signUpLoading } = useAuth();
  const navigation = useTypedNavigation();

  const isDarkMode = theme === "dark";
  const { saveUser, user } = useAuthContext();

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );
  const [address, setAddress] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const openLocationSettings = useCallback(() => {
    if (Platform.OS === "ios") {
      Linking.openURL("app-settings:");
      return;
    }

    Linking.openSettings();
  }, []);

  const getLocationErrorMessage = useCallback(() => {
    if (Platform.OS === "android") {
      return "We couldn't fetch your current location. If you're using an emulator, set a mock location in Android Studio and try again.";
    }

    return "We couldn't fetch your current location. Please try again.";
  }, []);

  const fetchAddress = useCallback(async (loc: Location.LocationObject) => {
    try {
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
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

        //   formattedAddress = [addressLine1, addressLine2, addressLine3, country]
        //     .filter(Boolean)
        //     .join("\n");
        // } else {
        formattedAddress = reverseGeocode[0].formattedAddress || "";
        // }


        if (!formattedAddress) {
          const fallbackParts = [name, street, city, region, country].filter(
            Boolean
          );
          formattedAddress = fallbackParts.join(", ");
        }

        setAddress(formattedAddress);
        // console.log("Formatted Address:", formattedAddress);
      } else {
        setAddress("Address not found");
      }
    } catch (error) {
      console.error("Failed to fetch address:", error);
      setAddress("Unable to retrieve address");
    }
  }, []);

  const resolveCurrentLocation = useCallback(async () => {
    console.log(`${LOCATION_LOG_PREFIX} resolving current location`);
    setIsFetchingLocation(true);
    setLocationError(null);

    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      console.log(`${LOCATION_LOG_PREFIX} location services status`, {
        servicesEnabled,
      });

      if (!servicesEnabled) {
        setLocation(null);
        setAddress(null);
        setLocationError(
          "Location services are turned off. Please enable them and try again."
        );
        return null;
      }

      const lastKnownLocation = await Location.getLastKnownPositionAsync();
      console.log(`${LOCATION_LOG_PREFIX} last known location lookup`, {
        hasLastKnownLocation: Boolean(lastKnownLocation),
      });

      if (lastKnownLocation) {
        setLocation(lastKnownLocation);
        void fetchAddress(lastKnownLocation);
        return lastKnownLocation;
      }

      const liveLocation = (await Promise.race([
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("Location request timed out")),
            LOCATION_FETCH_TIMEOUT_MS
          )
        ),
      ])) as Location.LocationObject;

      console.log(`${LOCATION_LOG_PREFIX} live location resolved`, {
        latitude: liveLocation.coords.latitude,
        longitude: liveLocation.coords.longitude,
      });

      setLocation(liveLocation);
      void fetchAddress(liveLocation);
      return liveLocation;
    } catch (error) {
      console.error(
        `${LOCATION_LOG_PREFIX} failed to resolve current location`,
        error
      );
      setLocation(null);
      setAddress(null);
      setLocationError(getLocationErrorMessage());
      return null;
    } finally {
      setIsFetchingLocation(false);
    }
  }, [fetchAddress, getLocationErrorMessage]);

  const requestLocationPermission = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log(`${LOCATION_LOG_PREFIX} permission request result`, { status });

      if (status !== "granted") {
        setHasPermission(false);
        setLocation(null);
        setAddress(null);
        setLocationError("Location access is required to continue.");
        Alert.alert(
          "Permission Denied",
          "Location access is required to continue. Please enable it in your device settings.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Open Settings",
              onPress: openLocationSettings,
            },
          ]
        );
        return;
      }

      setHasPermission(true);
      await resolveCurrentLocation();
    } catch (error) {
      console.error(
        `${LOCATION_LOG_PREFIX} failed to request location permission`,
        error
      );
      setHasPermission(false);
      setLocation(null);
      setAddress(null);
      setLocationError(
        "We couldn't request location access. Please try again."
      );
      Alert.alert(
        "Location error",
        "We couldn't request location access. Please try again."
      );
    }
  }, [openLocationSettings, resolveCurrentLocation]);

  const fetchSelectedAddress = useCallback(
    async (latitude: number, longitude: number) => {
      try {
        const reverseGeocode = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
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
          //   const addressLine1 = [streetNumber, street]
          //     .filter(Boolean)
          //     .join(" ");
          //   const addressLine2 = [district, city].filter(Boolean).join(", ");
          //   const addressLine3 = [region, postalCode].filter(Boolean).join(" ");

          //   formattedAddress = [
          //     addressLine1,
          //     addressLine2,
          //     addressLine3,
          //     country,
          //   ]
          //     .filter(Boolean)
          //     .join("\n");
          // } else {
          formattedAddress = reverseGeocode[0].formattedAddress || "";
          // }

          if (!formattedAddress) {
            const fallbackParts = [name, street, city, region, country].filter(
              Boolean
            );
            formattedAddress = fallbackParts.join(", ");
          }

          setSelectedAddress(formattedAddress);
          // console.log("Formatted Address:", formattedAddress);
        } else {
          setSelectedAddress("Address not found");
        }
      } catch (error) {
        console.error("Failed to fetch address:", error);
        setSelectedAddress("Unable to retrieve address");
      }
    },
    []
  );

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        console.log(`${LOCATION_LOG_PREFIX} existing permission status`, {
          status,
        });

        if (status !== "granted") {
          setHasPermission(false);
          if (Platform.OS === "ios") {
            await requestLocationPermission();
          }
        } else {
          setHasPermission(true);
          await resolveCurrentLocation();
        }
      } catch (error) {
        console.error(
          `${LOCATION_LOG_PREFIX} failed during initial location bootstrap`,
          error
        );
        setHasPermission(false);
      }
    })();
  }, [requestLocationPermission, fetchAddress, resolveCurrentLocation]);

  const handleSubmit = useCallback(() => {
    void requestLocationPermission();
  }, [requestLocationPermission]);

  const handleMapPress = useCallback(
    (event: any) => {
      const { latitude, longitude } = event.nativeEvent.coordinate;
      setSelectedLocation({ latitude, longitude });
      fetchSelectedAddress(latitude, longitude);
    },
    [fetchSelectedAddress]
  );

  const getCurrentLocation = async () => {
    try {
      await resolveCurrentLocation();
    } catch (error) {
      console.error(
        `${LOCATION_LOG_PREFIX} failed to refresh current location`,
        error
      );
    }
  };

  const fetchNearbyPlaces = async () => {
    if (!location) return;

    setLoading(true);

    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location.coords.latitude},${location.coords.longitude}&radius=1500&type=restaurant&key=${GOOGLE_MAP_API_KEY}`;

    try {
      const response = await axios.get(url);
      setNearbyPlaces(response.data.results); // Save nearby places
    } catch (error) {
      console.error("Error fetching nearby places: ", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (location) {
      void fetchNearbyPlaces();
    }
  }, [location]);

  const handleSelectNearbyPlace = (place: any) => {
    setSelectedLocation({
      latitude: place.geometry.location.lat,
      longitude: place.geometry.location.lng,
    });
    setSelectedAddress(`${place.name} ${place.vicinity}`);
    mapRef.current?.animateToRegion(
      {
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.01,
      },
      1000
    );
    Keyboard.dismiss();
    bottomSheetRef.current?.snapToIndex(0);
  };

  const handleConfirmLocation = async (
    location: Location.LocationObject | null,
    selectedAddress: string | null,
    selectedLocation: { latitude: number; longitude: number } | null
  ) => {
    let coordinates = null;
    let addressToSend = selectedLocation ? selectedAddress : address;

    if (selectedLocation) {
      coordinates = {
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
      };
    } else if (location) {
      coordinates = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    }

    if (coordinates && route.params?.onGoBack) {
      route.params.onGoBack(coordinates, addressToSend);
      navigation.goBack();
    }
  };

  const handleSkipLocation = useCallback(() => {
    if (route.params?.onGoBack) {
      route.params.onGoBack(null, null);
    }
    navigation.goBack();
  }, [navigation, route.params]);

  const bottomSheetRef = useRef<BottomSheet>(null);
  const googlePlacesRef = useRef<any>(null);
  const mapRef = useRef<MapView>(null);

  const initialSnapPoints = useMemo(() => ["40%", "60%", "90%"], []);
  const [snapPoints, setSnapPoints] = useState(initialSnapPoints);

  const handlePlaceSelected = (data: any, details: any) => {
    const lat = details.geometry.location.lat;
    const lng = details.geometry.location.lng;
    setSelectedLocation({ latitude: lat, longitude: lng });
    setSelectedAddress(details.formatted_address);
    mapRef.current?.animateToRegion(
      {
        latitude: lat,
        longitude: lng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.01,
      },
      1000
    );
    Keyboard.dismiss();
    bottomSheetRef.current?.snapToIndex(0);
  };

  const handleCurrentLocation = () => {
    console.log(`${LOCATION_LOG_PREFIX} use current location pressed`);
    setSelectedAddress(null);
    setSelectedLocation(null);
    void getCurrentLocation();
  };

  const mapRegion = useMemo(() => {
    if (selectedLocation) {
      return {
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        latitudeDelta: DEFAULT_MAP_REGION.latitudeDelta,
        longitudeDelta: DEFAULT_MAP_REGION.longitudeDelta,
      };
    }

    if (location) {
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: DEFAULT_MAP_REGION.latitudeDelta,
        longitudeDelta: DEFAULT_MAP_REGION.longitudeDelta,
      };
    }

    return DEFAULT_MAP_REGION;
  }, [location, selectedLocation]);

  const canConfirmLocation = Boolean(location || selectedLocation);

  useEffect(() => {
    if (location && !selectedLocation) {
      mapRef.current?.animateToRegion(mapRegion, 1000);
    }
  }, [location, mapRegion, selectedLocation]);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      () => {
        bottomSheetRef.current?.snapToIndex(2);
      }
    );

    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => {
        bottomSheetRef.current?.snapToIndex(0);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);
  return (
    <SafeAreaView
      className={`flex-1 ${isDarkMode ? "bg-[#0C0C0C]" : "bg-white"}`}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style={isDarkMode ? "light" : "dark"} />
        <View className="flex-1 ">
          <View className="px-4">
            {/* <HeaderIndicator percentage={85} /> */}
            <View className="flex flex-row items-center py-4">
              <TouchableOpacity
                onPress={() => {
                  navigation.goBack();
                }}
                className="w-[10%]"
              >
                <ArrowLeftIcon
                  size={wp("7.5%")}
                  color={isDarkMode ? "#FFF" : "#000"}
                />
              </TouchableOpacity>
              <View className="w-[80%] items-center justify-center">
                <Text
                  fontSize="text-xl"
                  fontWeight="font-bold"
                  className="tracking-wide"
                >
                  Choose Address
                </Text>
              </View>
            </View>
          </View>

          <View className="space-y-5 flex-1 ">
            {!hasPermission && (
              <>
                <StaticContainer>
                  <View className="flex">
                    <Text
                      fontSize="text-2xl"
                      fontWeight="font-semibold"
                    >
                      Allow location
                    </Text>
                    <Text
                      fontSize="text-lg"
                      className="text-gray-500"
                    >
                      This allows Renit to fetch products near you
                    </Text>
                  </View>

                  <StyledImage
                    source={
                      isDarkMode
                        ? require("assets/auth/allow-location-dark.png")
                        : require("assets/auth/allow-location-light.png")
                    }
                    className="w-full flex-1"
                  />
                </StaticContainer>
              </>
            )}

            {hasPermission ? (
              <>
                {/* <NonScrollableContainer> */}
                <MapView
                  ref={mapRef}
                  provider={
                    // Platform.OS === "android" ? PROVIDER_GOOGLE : undefined
                    PROVIDER_GOOGLE
                  }
                  style={{ flex: 1 }}
                  initialRegion={mapRegion}
                  customMapStyle={isDarkMode ? darkModeMapStyle : []}
                  onPress={handleMapPress}
                >
                  {location && (
                    <Marker
                      coordinate={{
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                      }}
                      title="You are here"
                    >
                      <View
                        style={{
                          height: 30,
                          width: 30,
                          borderRadius: 15,
                          backgroundColor: "#635BE8",
                          borderColor: isDarkMode ? "#000" : "#fff",
                          borderWidth: 5,
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <View
                          style={{
                            height: 15,
                            width: 15,
                            borderRadius: 7.5,
                            backgroundColor: "#635BE8",
                          }}
                        />
                      </View>
                    </Marker>
                  )}

                  {selectedLocation && (
                    <Marker
                      coordinate={selectedLocation}
                      title="Selected location"
                    />
                  )}
                </MapView>
                {/* </NonScrollableContainer> */}

                <View
                  style={{
                    paddingVertical: wp("5%"),
                    paddingHorizontal: wp("5%"),
                  }}
                  className="rounded-t-3xl"
                ></View>

                {/* Bottom sheet */}
                <BottomSheet
                  ref={bottomSheetRef}
                  snapPoints={snapPoints}
                  enablePanDownToClose={false}
                  index={0}
                  enableHandlePanningGesture={true}
                  enableContentPanningGesture={true}
                  backgroundStyle={{
                    backgroundColor: isDarkMode ? "black" : "white",
                  }}
                  handleIndicatorStyle={{ backgroundColor: "#292929" }}
                  handleStyle={{
                    borderTopWidth: 2,
                    borderLeftWidth: 2,
                    borderRightWidth: 2,
                    borderTopColor: isDarkMode ? "#292929" : "#fff",
                    borderLeftColor: isDarkMode ? "#292929" : "#fff",
                    borderRightColor: isDarkMode ? "#292929" : "#fff",
                    borderTopRightRadius: 12,
                    borderTopLeftRadius: 12,
                  }}
                >
                  <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                    keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
                    style={{ flex: 1 }}
                  >
                    <View
                      style={{
                        paddingVertical: wp("5%"),
                        paddingHorizontal: wp("5%"),
                        flex: 1,
                      }}
                    >
                      <View className="rounded-t-3xl">
                        {locationError && (
                          <View
                            className={`rounded-xl px-3 py-3 mb-4 ${
                              isDarkMode ? "bg-[#171717]" : "bg-[#F5F5F5]"
                            }`}
                          >
                            <Text
                              fontSize="text-sm"
                              className={
                                isDarkMode ? "text-[#FFFFFFB2]" : "text-[#000000B2]"
                              }
                            >
                              {locationError}
                            </Text>
                          </View>
                        )}

                        <Text
                          fontSize="text-md"
                          fontWeight="font-bold"
                        >
                          Your Address:
                        </Text>
                        <Text
                          fontSize="text-sm"
                          className={`${
                            isDarkMode ? "text-[#FFFFFFB2]" : "text-[#000000B2]"
                          }`}
                        >
                          {address
                            ? address
                            : isFetchingLocation
                            ? "Fetching address..."
                            : "Search for an address or tap on the map to choose one."}
                        </Text>

                        {selectedLocation && (
                          <>
                            <Text
                              fontSize="text-md"
                              fontWeight="font-bold"
                              className="mt-4"
                            >
                              Selected Address:
                            </Text>
                            <Text
                              fontSize="text-sm"
                              className={`${
                                isDarkMode
                                  ? "text-[#FFFFFFB2]"
                                  : "text-[#000000B2]"
                              }`}
                            >
                              {selectedAddress
                                ? selectedAddress
                                : "Fetching selected address..."}
                            </Text>
                          </>
                        )}

                        <View className="py-3 mt-2">
                          <Button
                            variant="primary"
                            disabled={
                              !canConfirmLocation ||
                              signUpLoading ||
                              isFetchingLocation
                            }
                            onPress={() => {
                              handleConfirmLocation(
                                location,
                                selectedAddress,
                                selectedLocation
                              );
                            }}
                            className="flex-row justify-center"
                          >
                            {signUpLoading || isFetchingLocation ? (
                              <ActivityIndicator
                                size="small"
                                color={"#fff"}
                              />
                            ) : (
                              "Confirm location"
                            )}
                          </Button>
                        </View>

                        <TouchableOpacity
                          className="items-center py-2"
                          onPress={handleSkipLocation}
                        >
                          <Text
                            fontSize="text-sm"
                            className={`${
                              isDarkMode ? "text-[#FFFFFFB2]" : "text-[#000000B2]"
                            }`}
                          >
                            Skip for now
                          </Text>
                        </TouchableOpacity>

                        <View
                          className={`flex-row pl-3 min-h-11 rounded-[12px] border ${
                            isDarkMode
                              ? "border-[#292929] bg-[#0F0F0F]"
                              : "border-[#e6e6e6] bg-white"
                          }`}
                          style={{ alignItems: "flex-start" }}
                        >
                          <MagnifyingGlassIcon
                            color={isDarkMode ? "#FFFFFFB2" : "#000000B2"}
                            size={24}
                            style={{ marginTop: hp(1.1) }}
                          />
                          <GooglePlacesAutocomplete
                            ref={googlePlacesRef}
                            placeholder="Search area or street name"
                            query={{ key: GOOGLE_MAP_API_KEY }}
                            fetchDetails={true}
                            onPress={handlePlaceSelected}
                            onFail={(error) => console.log(error)}
                            onNotFound={() => console.log("no results")}
                            enablePoweredByContainer={false}
                            disableScroll={true}
                            styles={{
                              textInput: {
                                height: "100%",
                                backgroundColor: isDarkMode
                                  ? "#0F0F0F"
                                  : "#fff",
                                borderRadius: 12,
                                zIndex: 10,
                                color: isDarkMode ? "#fff" : "#000",
                                fontSize: 16,
                                alignContent: "center",
                              },
                              row: {
                                backgroundColor: isDarkMode
                                  ? "#0F0F0F"
                                  : "#FFF",
                              },
                              description: {
                                color: isDarkMode ? "#fff" : "#000",
                              },
                              separator: { backgroundColor: "#292929" },
                            }}
                            textInputProps={{
                              placeholderTextColor: isDarkMode
                                ? "#FFFFFFB2"
                                : "#000000B2",
                            }}
                          />
                        </View>

                        <TouchableOpacity
                          className={`h-[48px] rounded-[12px] w-full border-b ${
                            isDarkMode ? "border-[#292929]" : "border-[#e6e6e6]"
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
                                {isFetchingLocation
                                  ? "Fetching current location..."
                                  : "Use current location"}
                              </Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      </View>

                      {loading ? (
                        <Text className="mt-3">
                          Loading nearby places...
                        </Text>
                      ) : (
                        <BottomSheetFlatList
                          data={nearbyPlaces}
                          keyExtractor={(item) => item.place_id}
                          style={{ maxHeight: 450 }}
                          contentContainerStyle={{ paddingBottom: wp("5%") }}
                          keyboardShouldPersistTaps="handled"
                          renderItem={({ item }) => (
                            <TouchableOpacity
                              onPress={() => handleSelectNearbyPlace(item)}
                              className={`pl-3 py-5 flex-row items-center space-x-3 border-b ${
                                isDarkMode
                                  ? "border-[#292929]"
                                  : "border-[#e6e6e6]"
                              }`}
                            >
                              <MapPinIcon
                                color={isDarkMode ? "white" : "black"}
                                size={20}
                              />
                              <Text fontSize="text-sm">{item.name}</Text>
                            </TouchableOpacity>
                          )}
                        />
                      )}
                    </View>
                  </KeyboardAvoidingView>
                </BottomSheet>
              </>
            ) : (
              <View className="w-[90%] mx-auto py-5">
                <Button
                  variant="primary"
                  onPress={handleSubmit}
                >
                  Provide location access
                </Button>
              </View>
            )}
          </View>
        </View>
      </GestureHandlerRootView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default LocationModal;
