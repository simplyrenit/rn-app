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
  View,
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
import { NearbyPlace, useTypedNavigation } from "@/lib/types";
import axios from "axios";
import {
  MagnifyingGlassIcon,
  MapPinIcon,
  ViewfinderCircleIcon,
} from "react-native-heroicons/outline";
import { useAuthContext } from "@/context/auth-context";
import { SignUpError, useAuth } from "@/backend/auth";
import { ink, colors, radius } from "@/lib/design-tokens";

const StyledImage = styled(Image);
const LOCATION_FETCH_TIMEOUT_MS = 12000;
const LOCATION_LOG_PREFIX = "[auth/location]";

export default function LocationScreen() {
  const { theme } = useGlobalContext();
  const { signUpUser, loading: signUpLoading } = useAuth();
  const navigation = useTypedNavigation();

  const isDarkMode = theme === "dark";
  const { saveUser } = useAuthContext();

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

  const fetchAddress = useCallback(async (loc: Location.LocationObject) => {
    try {
      console.log(
        `${LOCATION_LOG_PREFIX} reverse geocoding current location`,
        {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        }
      );
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
        console.log(`${LOCATION_LOG_PREFIX} resolved current address`, {
          formattedAddress,
        });
        // console.log("Formatted Address:", formattedAddress);
      } else {
        setAddress("Address not found");
        console.warn(
          `${LOCATION_LOG_PREFIX} reverse geocode returned no results for current location`
        );
      }
    } catch (error) {
      console.error("Failed to fetch address:", error);
      setAddress("Unable to retrieve address");
    }
  }, []);

  const openLocationSettings = useCallback(() => {
    if (Platform.OS === "ios") {
      Linking.openURL("app-settings:");
      return;
    }

    Linking.openSettings();
  }, []);

  const buildLocationUnavailableMessage = useCallback(() => {
    if (Platform.OS === "android") {
      return "We couldn’t fetch your current location. If you’re using an emulator, set a mock location in Android Studio and try again.";
    }

    return "We couldn’t fetch your current location. Please try again.";
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
        setLocationError(
          "Location services are turned off. Please enable them and try again."
        );
        Alert.alert(
          "Turn on location services",
          "Location services are turned off on this device. Please enable them and try again."
        );
        return;
      }

      const lastKnownLocation = await Location.getLastKnownPositionAsync();
      console.log(`${LOCATION_LOG_PREFIX} last known location lookup`, {
        hasLastKnownLocation: Boolean(lastKnownLocation),
      });

      if (lastKnownLocation) {
        setLocation(lastKnownLocation);
        console.log(`${LOCATION_LOG_PREFIX} using last known location`, {
          latitude: lastKnownLocation.coords.latitude,
          longitude: lastKnownLocation.coords.longitude,
        });
        fetchAddress(lastKnownLocation);
        return;
      }

      console.log(`${LOCATION_LOG_PREFIX} requesting live current position`, {
        accuracy: "balanced",
        timeoutMs: LOCATION_FETCH_TIMEOUT_MS,
      });
      const currentLocation = (await Promise.race([
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

      setLocation(currentLocation);
      console.log(`${LOCATION_LOG_PREFIX} resolved live current position`, {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });
      fetchAddress(currentLocation);
    } catch (error) {
      console.error("Failed to get current location:", error);
      setLocation(null);
      const errorMessage = buildLocationUnavailableMessage();
      setLocationError(errorMessage);
      Alert.alert(
        "Unable to fetch location",
        errorMessage
      );
    } finally {
      setIsFetchingLocation(false);
    }
  }, [buildLocationUnavailableMessage, fetchAddress]);

  const requestLocationPermission = useCallback(async () => {
    console.log(`${LOCATION_LOG_PREFIX} requesting foreground location permission`);
    setLocationError(null);

    try {
      const permissionResponse =
        await Location.requestForegroundPermissionsAsync();
      console.log(`${LOCATION_LOG_PREFIX} permission response`, {
        status: permissionResponse.status,
        canAskAgain: permissionResponse.canAskAgain,
        granted: permissionResponse.granted,
      });

      if (permissionResponse.status !== "granted") {
        setHasPermission(false);
        setLocation(null);
        setLocationError(
          permissionResponse.canAskAgain
            ? "Location access was denied."
            : "Location access is blocked. Please enable it in settings."
        );
        Alert.alert(
          "Permission Denied",
          permissionResponse.canAskAgain
            ? "Location access is required to continue. Please allow it to continue."
            : "Location access is blocked for this app. Please enable it in your device settings.",
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
      console.error("Failed to request location permission:", error);
      setHasPermission(false);
      setLocationError(
        "We couldn’t request location access. Please try again."
      );
      Alert.alert(
        "Location error",
        "We couldn’t request location access. Please try again."
      );
    }
  }, [openLocationSettings, resolveCurrentLocation]);

  const fetchSelectedAddress = useCallback(
    async (latitude: number, longitude: number) => {
      try {
        console.log(`${LOCATION_LOG_PREFIX} reverse geocoding selected location`, {
          latitude,
          longitude,
        });
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
          console.log(`${LOCATION_LOG_PREFIX} resolved selected address`, {
            formattedAddress,
          });
          // console.log("Formatted Address:", formattedAddress);
        } else {
          setSelectedAddress("Address not found");
          console.warn(
            `${LOCATION_LOG_PREFIX} reverse geocode returned no results for selected location`
          );
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
        console.log(`${LOCATION_LOG_PREFIX} checking existing foreground permission`);
        const permissionResponse =
          await Location.getForegroundPermissionsAsync();
        console.log(`${LOCATION_LOG_PREFIX} existing permission response`, {
          status: permissionResponse.status,
          canAskAgain: permissionResponse.canAskAgain,
          granted: permissionResponse.granted,
        });

        if (permissionResponse.status !== "granted") {
          setHasPermission(false);
          return;
        }

        setHasPermission(true);
        await resolveCurrentLocation();
      } catch (error) {
        console.error("Failed to check location permission:", error);
        setHasPermission(false);
        setLocationError(
          "We couldn’t check location permission. Please try again."
        );
      }
    })();
  }, [resolveCurrentLocation]);

  const handleSubmit = useCallback(async () => {
    console.log(`${LOCATION_LOG_PREFIX} primary CTA pressed`, {
      hasPermission,
    });
    if (hasPermission) {
      await resolveCurrentLocation();
      return;
    }

    await requestLocationPermission();
  }, [hasPermission, requestLocationPermission, resolveCurrentLocation]);

  const handleMapPress = useCallback(
    (event: any) => {
      const { latitude, longitude } = event.nativeEvent.coordinate;
      console.log(`${LOCATION_LOG_PREFIX} map pressed`, {
        latitude,
        longitude,
      });
      setSelectedLocation({ latitude, longitude });
      fetchSelectedAddress(latitude, longitude);
    },
    [fetchSelectedAddress]
  );

  const fetchNearbyPlaces = async () => {
    if (!location) return;

    setLoading(true);
    console.log(`${LOCATION_LOG_PREFIX} fetching nearby places`, {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    });

    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location.coords.latitude},${location.coords.longitude}&radius=1500&type=restaurant&key=${GOOGLE_MAP_API_KEY}`;

    try {
      const response = await axios.get(url);
      setNearbyPlaces(response.data.results); // Save nearby places
      console.log(`${LOCATION_LOG_PREFIX} nearby places fetched`, {
        count: response.data.results?.length ?? 0,
      });
    } catch (error) {
      console.error("Error fetching nearby places: ", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (location) {
      fetchNearbyPlaces();
    }
  }, [location]);

  const handleSelectNearbyPlace = (place: any) => {
    console.log(`${LOCATION_LOG_PREFIX} nearby place selected`, {
      placeId: place.place_id,
      name: place.name,
      latitude: place.geometry.location.lat,
      longitude: place.geometry.location.lng,
    });
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
    const coordinatesPayload =
      selectedLocation
        ? {
            type: "Point",
            coordinates: [
              selectedLocation.longitude,
              selectedLocation.latitude,
            ] as [number, number],
          }
        : location?.coords
        ? {
            type: "Point",
            coordinates: [
              location.coords.longitude,
              location.coords.latitude,
            ] as [number, number],
          }
        : undefined;

    if (!coordinatesPayload) {
      console.warn(`${LOCATION_LOG_PREFIX} confirm location blocked`, {
        reason: "missing_coordinates",
      });
      Alert.alert(
        "Location required",
        "Please select your location to complete onboarding."
      );
      return;
    }

    await saveUser({
      coordinates: coordinatesPayload,
    });
    console.log(`${LOCATION_LOG_PREFIX} submitting onboarding with location`, {
      coordinatesPayload,
      selectedAddress,
    });

    try {
      const response = await signUpUser({
        coordinates: coordinatesPayload,
      });
      if (response) {
        console.log(
          `${LOCATION_LOG_PREFIX} signup completed successfully with location`
        );
        navigation.navigate("MainTabs");
      }
    } catch (error: any) {
      const signUpError = error as SignUpError;
      if (signUpError.code === "otp_verification_required") {
        Alert.alert(
          "Verification required",
          "Please verify your email OTP before completing signup.",
          [{ text: "Go to verification", onPress: () => navigation.navigate("Email") }]
        );
        return;
      }

      Alert.alert(
        "Signup failed",
        signUpError.message || "Unable to complete signup right now."
      );
    }
  };

  const handleSkipLocation = useCallback(async () => {
    console.log(`${LOCATION_LOG_PREFIX} skipping location during onboarding`);
    try {
      const response = await signUpUser();
      if (response) {
        console.log(
          `${LOCATION_LOG_PREFIX} signup completed successfully without location`
        );
        navigation.navigate("MainTabs");
      }
    } catch (error: any) {
      const signUpError = error as SignUpError;
      if (signUpError.code === "otp_verification_required") {
        Alert.alert(
          "Verification required",
          "Please verify your email OTP before completing signup.",
          [{ text: "Go to verification", onPress: () => navigation.navigate("Email") }]
        );
        return;
      }

      Alert.alert(
        "Signup failed",
        signUpError.message || "Unable to complete signup right now."
      );
    }
  }, [navigation, signUpUser]);

  const bottomSheetRef = useRef<BottomSheet>(null);
  const googlePlacesRef = useRef<any>(null);
  const mapRef = useRef<MapView>(null);

  // const snapPoints = useMemo(() => ["40%", "60%", "100%"], []);
  const initialSnapPoints = useMemo(() => ["50%", "60%", "90%"], []);
  const [snapPoints, setSnapPoints] = useState(initialSnapPoints);

  const handlePlaceSelected = (data: any, details: any) => {
    const lat = details.geometry.location.lat;
    const lng = details.geometry.location.lng;
    console.log(`${LOCATION_LOG_PREFIX} place autocomplete selected`, {
      description: data?.description,
      latitude: lat,
      longitude: lng,
    });
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

  const handleCurrentLocation = async () => {
    console.log(`${LOCATION_LOG_PREFIX} use current location pressed`);
    setSelectedAddress(null);
    setSelectedLocation(null);
    await resolveCurrentLocation();
  };

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
      className={`flex-1 ${isDarkMode ? "bg-canvas-dark" : "bg-surface-light"}`}
    >
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      <View className="flex-1 ">
        <View className="px-gutter">
          <HeaderIndicator percentage={85} />
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
                  <Text tone="body"
                    fontSize="text-lg"
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

          {hasPermission && location ? (
            <>
              <View className="flex-1 ">
                <MapView
                  ref={mapRef}
                  provider={
                    // Platform.OS === "android" ? PROVIDER_GOOGLE : undefined
                    PROVIDER_GOOGLE
                  }
                  style={{ flex: 1 }}
                  initialRegion={{
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                    latitudeDelta: 0.0922,
                    longitudeDelta: 0.0421,
                  }}
                  customMapStyle={isDarkMode ? darkModeMapStyle : []}
                  onPress={handleMapPress}
                >
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
                        borderRadius: radius.group,
                        backgroundColor: colors.dark.brand,
                        borderColor: ink.canvas(isDarkMode),
                        borderWidth: 5,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <View
                        style={{
                          height: 15,
                          width: 15,
                          borderRadius: radius.full,
                          backgroundColor: colors.dark.brand,
                        }}
                      />
                    </View>
                  </Marker>

                  {selectedLocation && (
                    <Marker
                      coordinate={selectedLocation}
                      title="Selected location"
                    />
                  )}
                </MapView>
              </View>

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
                  backgroundColor: ink.canvas(isDarkMode),
                }}
                handleIndicatorStyle={{ backgroundColor: ink.line(true) }}
                handleStyle={{
                  borderTopWidth: 2,
                  borderLeftWidth: 2,
                  borderRightWidth: 2,
                  borderTopColor: ink.line(isDarkMode),
                  borderLeftColor: ink.line(isDarkMode),
                  borderRightColor: ink.line(isDarkMode),
                  borderTopRightRadius: 12,
                  borderTopLeftRadius: 12,
                  flex: 1,
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
                      <Text
                        fontSize="text-md"
                        fontWeight="font-bold"
                      >
                        Your Address:
                      </Text>
                      <Text
                        fontSize="text-sm"
                        className={`${
                          isDarkMode ? "text-muted-dark" : "text-muted-light"
                        }`}
                      >
                        {address ? address : "Fetching address..."}
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
                                ? "text-muted-dark"
                                : "text-muted-light"
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
                          onPress={() => {
                            handleConfirmLocation(
                              location,
                              selectedAddress,
                              selectedLocation
                            );
                          }}
                          className="flex-row justify-center"
                        >
                          {signUpLoading ? (
                            <ActivityIndicator
                              size="small"
                              color="#FFFFFF"
                            />
                          ) : (
                            "Confirm location"
                          )}
                        </Button>
                      </View>

                      {/* <GooglePlacesAutocomplete
                        ref={googlePlacesRef}
                        placeholder="Search for a place"
                        query={{ key: GOOGLE_MAP_API_KEY }}
                        fetchDetails={true}
                        onPress={handlePlaceSelected}
                        onFail={(error) => console.log(error)}
                        onNotFound={() => console.log("no results")}
                        enablePoweredByContainer={false}
                        disableScroll={true}
                        styles={{
                          textInput: {
                            height: 50,
                            backgroundColor: ink.surface(isDarkMode),
                            borderRadius: radius.input,
                            paddingHorizontal: 8,
                            zIndex: 10,
                            color: ink.text(isDarkMode),
                            borderWidth: 1,
                            borderColor: ink.line(isDarkMode),
                          },
                          row: {
                            backgroundColor: ink.canvas(isDarkMode),
                          },
                          description: {
                            color: ink.text(isDarkMode),
                          },
                          separator: { backgroundColor: ink.line(true) },
                        }}
                      /> */}

                      <View
                        className={`flex-row pl-3 min-h-11 rounded-card border ${
                          isDarkMode
                            ? "border-line-dark bg-surface-dark"
                            : "border-line-light bg-surface-light"
                        }`}
                        style={{ alignItems: "center" }}
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
                          onPress={handlePlaceSelected}
                          onFail={(error) => console.log(error)}
                          onNotFound={() => console.log("no results")}
                          enablePoweredByContainer={false}
                          disableScroll={true}
                          styles={{
                            textInput: {
                              height: "100%",
                              backgroundColor: ink.surface(isDarkMode),
                              borderRadius: radius.card,
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
                          isDarkMode ? "border-line-dark" : "border-line-light"
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

                      {/* <AddressChoiceModal
                        isVisible={isModalVisible}
                        onClose={() => setModalVisible(false)}
                        onConfirm={confirmAddressChoice}
                      /> */}
                    </View>

                    {loading ? (
                      <Text className="mt-3">Loading nearby places...</Text>
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
                                ? "border-line-dark"
                                : "border-line-light"
                            }`}
                          >
                            <MapPinIcon
                              color={ink.text(isDarkMode)}
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
          ) : hasPermission ? (
            <View className="w-[90%] mx-auto flex-1 items-center justify-center py-5">
              {isFetchingLocation ? (
                <>
                  <ActivityIndicator
                    size="large"
                    color={colors.dark.brand}
                  />
                  <Text
                    fontSize="text-lg"
                    className="mt-4 text-center"
                  >
                    Fetching your current location...
                  </Text>
                </>
              ) : (
                <>
                  <Text
                    fontSize="text-2xl"
                    fontWeight="font-semibold"
                    className="text-center"
                  >
                    We need your current location
                  </Text>
                  <Text tone="body"
                    fontSize="text-lg"
                    className="mt-2 text-center"
                  >
                    {locationError ||
                      "Location access is granted, but we couldn’t fetch your current location yet."}
                  </Text>
                  <Button
                    variant="primary"
                    onPress={handleSubmit}
                    className="mt-6 w-full"
                    disabled={isFetchingLocation}
                  >
                    Try again
                  </Button>
                  <Button
                    variant="outline"
                    onPress={handleSkipLocation}
                    className="mt-3 w-full"
                    disabled={signUpLoading}
                  >
                    {signUpLoading ? (
                      <ActivityIndicator
                        size="small"
                        color={ink.text(isDarkMode)}
                      />
                    ) : (
                      "Skip for now"
                    )}
                  </Button>
                </>
              )}
            </View>
          ) : (
            <View className="w-[90%] mx-auto py-5">
              {locationError ? (
                <Text tone="danger"
                  fontSize="text-sm"
                  className="mb-3 text-center"
                >
                  {locationError}
                </Text>
              ) : null}
              <Button
                variant="primary"
                onPress={handleSubmit}
                disabled={isFetchingLocation}
              >
                Provide location access
              </Button>
              <Button
                variant="outline"
                onPress={handleSkipLocation}
                className="mt-3"
                disabled={signUpLoading}
              >
                {signUpLoading ? (
                  <ActivityIndicator
                    size="small"
                    color={ink.text(isDarkMode)}
                  />
                ) : (
                  "Skip for now"
                )}
              </Button>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
