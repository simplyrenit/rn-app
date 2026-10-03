import * as Location from "expo-location";
import { StatusBar } from "expo-status-bar";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  AppState,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Button,
  Text,
  useButtonLabelColor,
} from "@/components/core";
import AddressChoiceModal from "@/components/modals/AddressChoiceModalProps";
import { useGlobalContext } from "@/context/global-context";
import darkModeMapStyle from "assets/mapJSON/darkModeMapStyle.json";
import { GOOGLE_MAP_API_KEY } from "@/lib/config";
import { googleReverseGeocode } from "@/lib/geocode";
import {
  cancelLocationRequest,
  resolveLocationRequest,
} from "@/lib/location-request";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import {
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { NearbyPlace, RouteProps, useTypedNavigation } from "@/lib/types";
import axios from "axios";
import {
  MagnifyingGlassIcon,
  MapPinIcon,
  ViewfinderCircleIcon,
} from "react-native-heroicons/outline";
import { useAuthContext } from "@/context/auth-context";
import { useAuth } from "@/backend/auth";

import { Modal, View, StyleSheet } from "react-native";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { EditStepHeader } from "@/components/post/edit-step-header";
import { useRoute } from "@react-navigation/native";
import { ink, colors, radius, SCREEN_GUTTER, density } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";

const SEARCH_HEIGHT = 48;
/** The field's height inside its 1pt border, so the input fills it and centres its text. */
const SEARCH_INNER = SEARCH_HEIGHT - 2;

const LOCATION_LOG_PREFIX = "[post/location-modal]";
const LOCATION_FETCH_TIMEOUT_MS = 12000;
const DEFAULT_MAP_REGION = {
  latitude: 19,
  longitude: 72,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};
/**
 * Where the map opens with no GPS fix and no pin handed in. It used to open on
 * DEFAULT_MAP_REGION's centre, which is open sea west of Mumbai: a blue square
 * with nothing to tap. The whole country gives search and pinch somewhere to start.
 */
const INDIA_REGION = {
  latitude: 22.5,
  longitude: 79,
  latitudeDelta: 30,
  longitudeDelta: 30,
};

/**
 * What the picker hands back as the address when the geocoder has nothing or
 * fails. Exported so a caller that stores the address can tell them from a real one.
 */
export const ADDRESS_NOT_FOUND = "Address not found";
export const ADDRESS_UNAVAILABLE = "Unable to retrieve address";

/**
 * Shown above the search field when location permission is denied. The screen
 * used to render no map and no search at all in that state, so a denied user
 * could not choose a place by hand.
 */
function LocationOffBanner({ onTurnOn }: { onTurnOn: () => void }) {
  const { color } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 12,
        marginBottom: 16,
        borderRadius: radius.button,
        backgroundColor: color.brandWash,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text fontSize="text-sm" fontWeight="font-bold">
          Location is off
        </Text>
        <Text fontSize="text-xs" tone="body">
          Turn it on to jump to where you are, or search and tap the map.
        </Text>
      </View>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Turn on location"
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        onPress={onTurnOn}
      >
        <Text fontSize="text-sm" fontWeight="font-bold" tone="brand">
          Turn on
        </Text>
      </TouchableOpacity>
    </View>
  );
}

/**
 * The "Confirm location" button's loading spinner. Has to be its own
 * component rather than inline JSX: `useButtonLabelColor` only picks up the
 * theme/disabled-aware colour `Button` resolved for itself once this actually
 * renders as a descendant of that `Button`, not from `LocationModal`'s own
 * render pass higher up the tree. Was hardcoded to `ink.onBrand()`, which read
 * as white-on-white-ish once the button's own disabled fill kicked in.
 */
function ConfirmLocationSpinner() {
  const color = useButtonLabelColor();
  return <ActivityIndicator size="small" color={color} />;
}

const LocationModal = ({}) => {
  const { height: winH } = useWindowDimensions();
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
  } | null>(route.params?.initial ?? null);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const openLocationSettings = useCallback(() => {
    if (Platform.OS === "ios") {
      Linking.openURL("app-settings:");
      return;
    }

    Linking.openSettings();
  }, []);

  const getLocationErrorMessage = useCallback(() => {
    if (Platform.OS === "android") {
      return "We couldn’t fetch your current location. If you’re using an emulator, set a mock location in Android Studio and try again.";
    }

    return "We couldn’t fetch your current location. Please try again.";
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
        setAddress(ADDRESS_NOT_FOUND);
      }
    } catch (error) {
      console.error("Failed to fetch address:", error);
      setAddress(ADDRESS_UNAVAILABLE);
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

      // No alert: a denied user keeps the map and search, and the banner
      // above the search field says how to turn location on.
      if (status !== "granted") {
        setHasPermission(false);
        setLocation(null);
        setAddress(null);
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
        "We couldn’t request location access. Please try again."
      );
    }
  }, [resolveCurrentLocation]);

  // The banner's "Turn on" and "Use current location" while permission is
  // denied. Once the system will not show its prompt again, Settings is the
  // only place the permission can change.
  const turnOnLocation = useCallback(async () => {
    const { status, canAskAgain } =
      await Location.getForegroundPermissionsAsync();
    if (status !== "granted" && !canAskAgain) {
      openLocationSettings();
      return;
    }
    await requestLocationPermission();
  }, [openLocationSettings, requestLocationPermission]);

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
          const place = await googleReverseGeocode(latitude, longitude);
          setSelectedAddress(place?.address ?? ADDRESS_NOT_FOUND);
        }
      } catch (error) {
        // Android's geocoder throws without location permission, which is
        // exactly when a user is choosing a point by hand: ask Google instead
        // of showing "Unable to retrieve address" for every point they tap.
        const place = await googleReverseGeocode(latitude, longitude);
        setSelectedAddress(place?.address ?? ADDRESS_UNAVAILABLE);
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

        if (status === "granted") {
          setHasPermission(true);
          await resolveCurrentLocation();
        } else if (status === "undetermined") {
          // Ask only someone who has never been asked. iOS used to be asked on
          // every open, and alerted each time the answer was still no.
          await requestLocationPermission();
        } else {
          setHasPermission(false);
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

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState !== "active") return;

      void (async () => {
        const { status } = await Location.getForegroundPermissionsAsync();
        setHasPermission(status === "granted");
        if (status === "granted") {
          await resolveCurrentLocation();
        } else {
          // Revoked in Settings while the picker was open: the old GPS fix
          // must not stay confirmable under "No location chosen yet". A point
          // chosen by tap or search is the user's own and stays.
          setLocation(null);
          setAddress(null);
        }
      })();
    });

    return () => subscription.remove();
  }, [resolveCurrentLocation]);

  // Grow the address sheet while the keyboard is up so the Google Places
  // suggestion list isn't hidden behind it. iOS relies on the KeyboardAvoidingView
  // + this taller sheet; Android already gets a resized window (adjustResize).
  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, () =>
      setKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(hideEvent, () =>
      setKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // A pin handed in (Address details' "Change") arrives without its address.
  useEffect(() => {
    const initial = route.params?.initial;
    if (initial) {
      void fetchSelectedAddress(initial.latitude, initial.longitude);
    }
    // Once, for the pin the screen opened with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    if (coordinates) {
      // Back first: a caller that navigates from its callback (map, then
      // Address details) would otherwise have its new screen popped.
      navigation.goBack();
      resolveLocationRequest(route.params?.requestId, coordinates, addressToSend);
    }
  };

  const handleSkipLocation = useCallback(() => {
    resolveLocationRequest(route.params?.requestId, null, null);
    navigation.goBack();
  }, [navigation, route.params]);

  useEffect(
    () => () => cancelLocationRequest(route.params?.requestId),
    [route.params?.requestId]
  );

  const googlePlacesRef = useRef<any>(null);
  const mapRef = useRef<MapView>(null);

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
  };

  const handleCurrentLocation = () => {
    console.log(`${LOCATION_LOG_PREFIX} use current location pressed`);
    if (hasPermission === false) {
      void turnOnLocation();
      return;
    }
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

    return INDIA_REGION;
  }, [location, selectedLocation]);

  const canConfirmLocation = Boolean(location || selectedLocation);

  useEffect(() => {
    if (location && !selectedLocation) {
      mapRef.current?.animateToRegion(mapRegion, 1000);
    }
  }, [location, mapRegion, selectedLocation]);

  return (
    <SafeAreaView
      // The canvas token, so the header and the safe-area band match the panel
      // below the map; the class it replaces was a lighter grey in dark.
      style={{ flex: 1, backgroundColor: ink.canvas(isDarkMode) }}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style={isDarkMode ? "light" : "dark"} />
        <View className="flex-1 ">
          <EditStepHeader
            title="Choose Address"
            onBack={() => {
              cancelLocationRequest(route.params?.requestId);
              navigation.goBack();
            }}
          />

          <View className="flex-1">
            {/* Not gated on permission: a denied user still gets the map and
                the search, and chooses a place by hand. */}
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
                  // A tap on a labelled place arrives here, not in onPress.
                  onPoiClick={handleMapPress}
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
                    backgroundColor: ink.canvas(isDarkMode),
                    borderTopWidth: 2,
                    borderColor: ink.line(isDarkMode),
                    // The banner needs the extra room, or the last row of
                    // the panel is pushed out of view on a short phone.
                    height: keyboardVisible
                      ? "92%"
                      : hasPermission === false
                      ? "62%"
                      : "55%",
                  }}
                >
                  <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                    keyboardVerticalOffset={0}
                    style={{ flex: 1 }}
                  >
                    <View
                      style={{
                        paddingVertical: SCREEN_GUTTER,
                        paddingHorizontal: SCREEN_GUTTER,
                        flex: 1,
                      }}
                    >
                      <View className="rounded-t-3xl">
                        {locationError && (
                          <View
                            className={`rounded-card px-3 py-3 mb-4 ${
                              isDarkMode ? "bg-surface-dark" : "bg-surface-raised-light"
                            }`}
                          >
                            <Text
                              fontSize="text-sm"
                              className={
                                isDarkMode ? "text-muted-dark" : "text-muted-light"
                              }
                            >
                              {locationError}
                            </Text>
                          </View>
                        )}

                        {hasPermission === false && (
                          <LocationOffBanner
                            onTurnOn={() => void turnOnLocation()}
                          />
                        )}

                        <View
                          // The control edge, not the hairline (1.3:1 on the dark
                          // canvas), on the 48pt field the Chat search draws.
                          style={{
                            flexDirection: "row",
                            alignItems: "flex-start",
                            paddingLeft: 12,
                            minHeight: SEARCH_HEIGHT,
                            marginBottom: 16,
                            borderWidth: 1,
                            borderRadius: radius.button,
                            borderColor: ink.inputLine(isDarkMode),
                            backgroundColor: ink.surface(isDarkMode),
                          }}
                        >
                          <MagnifyingGlassIcon
                            color={ink.body(isDarkMode)}
                            size={24}
                            style={{ marginTop: (SEARCH_INNER - 24) / 2 }}
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
                            styles={{
                              textInput: {
                                // The library's default style adds a 5pt bottom margin
                                // and 10pt side padding under ours, which made this box
                                // 53pt tall with its text 2.5pt high.
                                marginTop: 0,
                                marginBottom: 0,
                                height: SEARCH_INNER,
                                backgroundColor: ink.surface(isDarkMode),
                                borderRadius: radius.button,
                                zIndex: 10,
                                color: ink.text(isDarkMode),
                                fontSize: 16,
                                alignContent: "center",
                              },
                              listView: { maxHeight: winH * 0.24 },
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

                        {/* One address at a time. Stacked, "Your Address" and
                            "Selected Address" pushed "Use current location"
                            below this fixed-height panel on a 360 dp phone. */}
                        {selectedLocation ? null : hasPermission === false ? (
                            <>
                              <Text fontSize="text-md" fontWeight="font-bold">
                                No location chosen yet
                              </Text>
                              <Text
                                fontSize="text-sm"
                                className={`${
                                  isDarkMode
                                    ? "text-muted-dark"
                                    : "text-muted-light"
                                }`}
                              >
                                Search or tap the map to choose a spot.
                              </Text>
                            </>
                        ) : (
                          <>
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
                          {address
                            ? address
                            : isFetchingLocation
                            ? "Fetching address..."
                            : "Search for an address or tap on the map to choose one."}
                        </Text>
                          </>
                        )}

                        {selectedLocation && (
                          <>
                            <Text
                              fontSize="text-md"
                              fontWeight="font-bold"
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
                              <ConfirmLocationSpinner />
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
                              isDarkMode ? "text-muted-dark" : "text-muted-light"
                            }`}
                          >
                            Skip for now
                          </Text>
                        </TouchableOpacity>

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
                        <FlatList
                          data={nearbyPlaces}
                          keyExtractor={(item) => item.place_id}
                          style={{ maxHeight: 450 }}
                          contentContainerStyle={{ paddingBottom: density.listFooterCompact }}
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
                </View>
              </>
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
