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
  BottomBar,
  MapPlaceholder,
  SubpageHeader,
  Text,
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
import { MagnifyingGlassIcon, MapPinIcon } from "react-native-heroicons/outline";
import { ViewfinderCircleIcon } from "react-native-heroicons/mini";
import { useAuthContext } from "@/context/auth-context";
import { useAuth } from "@/backend/auth";

import { View, StyleSheet } from "react-native";
import { useRoute } from "@react-navigation/native";
import {
  fontFamily,
  fontSize,
  radius,
  SCREEN_GUTTER,
} from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";

const SEARCH_HEIGHT = 48;
/** The field's height inside its 1pt border, so the input fills it and centres its text. */
const SEARCH_INNER = SEARCH_HEIGHT - 2;

// Figma 2089:31103. The map is 300 high under the top bar; the panel starts
// 230 down, so its r24 top corners sit on the map, and holds a 24-padded
// column with 16 between rows.
const MAP_HEIGHT = 300;
const MAP_VISIBLE = 230;
/**
 * The panel does not scroll (it holds the Places and nearby-places lists), so a
 * short screen shows less map: the window minus what must fit around it, never
 * more than the frame's 230 (a 390x844 phone keeps the frame). 520 = status bar
 * 24 + header 56 + CTA+Text bar 120 + a 48 nav inset, and the panel down to one
 * nearby row (24 + search 48 + address 48 + current 48 + a 44 row, 16 gaps).
 * The location-off banner takes 108 more. 80 keeps a strip of map to tap.
 */
const MAP_ROOM_AROUND = 520;
const BANNER_ROOM = 108;
const MAP_MIN_VISIBLE = 80;
const PANEL_RADIUS = 24;
const PANEL_RULE = 2;
const PANEL_GAP = 16;
/** "Use current location" (48, ruled above and below) and a nearby place (44). */
const CURRENT_ROW = 48;
const PLACE_ROW = 44;
const ROW_INSET = 8;
const ROW_GAP = 12;
/** The selected pin (outline map pin, 40) and "You are here" (16 dot, 3 ring). */
const PIN = 40;
const HERE_DOT = 16;
const HERE_RING = 3;

/**
 * Dev-only design seed (ENG-429): a dropped pin, its address and the nearby
 * places, drawn on the kit map tile. No permission prompt, no `Location.*`, no
 * geocode and no places fetch. Only DevFixture passes it.
 */
export type LocationModalDesign = {
  pin: { latitude: number; longitude: number };
  selectedAddress: string;
  nearby: NearbyPlace[];
};

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

const LocationModal = ({}) => {
  const { height: winH } = useWindowDimensions();
  const route = useRoute<RouteProps<"LocationModal">>();
  const design = __DEV__
    ? (route.params as { design?: LocationModalDesign } | undefined)?.design
    : undefined;
  const { color } = useTheme();
  const { theme, setAuthTokens } = useGlobalContext();
  const { signUpUser, loading: signUpLoading } = useAuth();
  const navigation = useTypedNavigation();

  const isDarkMode = theme === "dark";
  const { saveUser, user } = useAuthContext();

  const [hasPermission, setHasPermission] = useState<boolean | null>(
    design ? true : null
  );
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );
  const [address, setAddress] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(design?.pin ?? route.params?.initial ?? null);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(
    design?.selectedAddress ?? null
  );
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>(
    design?.nearby ?? []
  );
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
    // A design seed is its own state: no permission check, no location fix.
    if (design) return;
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
  }, [design, requestLocationPermission, fetchAddress, resolveCurrentLocation]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState !== "active" || design) return;

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
  }, [design, resolveCurrentLocation]);

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
    if (initial && !design) {
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
    // A design seed never resolves a request.
    if (design) return;
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
    if (design) return;
    resolveLocationRequest(route.params?.requestId, null, null);
    navigation.goBack();
  }, [design, navigation, route.params]);

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
    if (design) return;
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

  const confirmBusy = signUpLoading || isFetchingLocation;
  const mapVisible = Math.max(
    MAP_MIN_VISIBLE,
    Math.min(
      MAP_VISIBLE,
      winH - MAP_ROOM_AROUND - (hasPermission === false ? BANNER_ROOM : 0)
    )
  );

  return (
    <SafeAreaView
      // The bottom edge is the kit bar's own inset, not this view's.
      edges={["top", "left", "right"]}
      style={{ flex: 1, backgroundColor: color.canvas }}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style={isDarkMode ? "light" : "dark"} />
        <SubpageHeader
          title="Choose address"
          onBack={() => {
            cancelLocationRequest(route.params?.requestId);
            navigation.goBack();
          }}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <View style={{ flex: 1 }}>
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: MAP_HEIGHT,
              }}
            >
              {design ? (
                // The frame's "NEW neutral map" with the pin and the
                // "You are here" dot where it draws them.
                <View style={{ flex: 1 }}>
                  <MapPlaceholder style={StyleSheet.absoluteFill} />
                  <View style={{ position: "absolute", left: 175, top: 100 }}>
                    <SelectedPin />
                  </View>
                  <View style={{ position: "absolute", left: 110, top: 190 }}>
                    <HereDot />
                  </View>
                </View>
              ) : (
                <MapView
                  ref={mapRef}
                  provider={PROVIDER_GOOGLE}
                  style={{ flex: 1 }}
                  initialRegion={mapRegion}
                  customMapStyle={isDarkMode ? darkModeMapStyle : []}
                  // The panel covers the map below `mapVisible`, so centre the pin, the
                  // "You are here" dot and the Google logo in the part that shows.
                  mapPadding={{ top: 0, left: 0, right: 0, bottom: Math.max(0, MAP_HEIGHT - mapVisible) }}
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
                      anchor={{ x: 0.5, y: 0.5 }}
                    >
                      <HereDot />
                    </Marker>
                  )}

                  {selectedLocation && (
                    <Marker
                      coordinate={selectedLocation}
                      title="Selected location"
                      // The pin's point, not its centre, is on the spot.
                      anchor={{ x: 0.5, y: 0.9 }}
                    >
                      <SelectedPin />
                    </Marker>
                  )}
                </MapView>
              )}
            </View>

            {/* Not gated on permission: a denied user still gets the map and
                the search, and chooses a place by hand. While the keyboard is
                up the panel covers the map, so the Places suggestions are not
                hidden behind the keys. */}
            <View
              style={{
                flex: 1,
                marginTop: keyboardVisible ? 0 : mapVisible,
                backgroundColor: color.canvas,
                borderTopWidth: PANEL_RULE,
                borderColor: color.line,
                borderTopLeftRadius: PANEL_RADIUS,
                borderTopRightRadius: PANEL_RADIUS,
                paddingTop: SCREEN_GUTTER,
                paddingHorizontal: SCREEN_GUTTER,
                gap: PANEL_GAP,
              }}
            >
              {locationError && (
                <View
                  style={{
                    padding: 12,
                    borderRadius: radius.card,
                    backgroundColor: color.surfaceMuted,
                  }}
                >
                  <Text fontSize="text-sm" tone="body">
                    {locationError}
                  </Text>
                </View>
              )}

              {hasPermission === false && (
                <LocationOffBanner onTurnOn={() => void turnOnLocation()} />
              )}

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  paddingHorizontal: 12,
                  minHeight: SEARCH_HEIGHT,
                  borderWidth: 1,
                  borderRadius: radius.input,
                  borderColor: color.line,
                  backgroundColor: color.canvas,
                }}
              >
                <MagnifyingGlassIcon
                  color={color.textDim}
                  size={24}
                  style={{ marginTop: (SEARCH_INNER - 24) / 2, marginRight: 8 }}
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
                      // and 10pt side padding under ours; the frame sets the
                      // text 8 after the glyph and centres it in the 48 box.
                      marginTop: 0,
                      marginBottom: 0,
                      paddingLeft: 0,
                      paddingRight: 0,
                      height: SEARCH_INNER,
                      backgroundColor: color.canvas,
                      borderRadius: radius.input,
                      zIndex: 10,
                      color: color.text,
                      fontSize: fontSize.md,
                      fontFamily: fontFamily.regular,
                      alignContent: "center",
                    },
                    listView: { maxHeight: winH * 0.24 },
                    row: { backgroundColor: color.surface },
                    description: { color: color.text },
                    separator: { backgroundColor: color.line },
                  }}
                  textInputProps={{ placeholderTextColor: color.textDim }}
                />
              </View>

              {/* One address at a time. Stacked, "Your address" and "Selected
                  address" pushed "Use current location" off a 360 dp phone. */}
              {selectedLocation ? (
                <View style={{ gap: 4 }}>
                  <Text fontSize="text-md" fontWeight="font-bold">
                    Selected address:
                  </Text>
                  <Text fontSize="text-sm" tone="body">
                    {selectedAddress
                      ? selectedAddress
                      : "Fetching selected address..."}
                  </Text>
                </View>
              ) : hasPermission === false ? (
                <View style={{ gap: 4 }}>
                  <Text fontSize="text-md" fontWeight="font-bold">
                    No location chosen yet
                  </Text>
                  <Text fontSize="text-sm" tone="body">
                    Search or tap the map to choose a spot.
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 4 }}>
                  <Text fontSize="text-md" fontWeight="font-bold">
                    Your address:
                  </Text>
                  <Text fontSize="text-sm" tone="body">
                    {address
                      ? address
                      : isFetchingLocation
                      ? "Fetching address..."
                      : "Search for an address or tap on the map to choose one."}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                accessibilityRole="button"
                onPress={handleCurrentLocation}
                style={{
                  height: CURRENT_ROW,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: ROW_GAP,
                  paddingLeft: ROW_INSET,
                  borderTopWidth: 1,
                  borderBottomWidth: 1,
                  borderColor: color.line,
                }}
              >
                <ViewfinderCircleIcon color={color.brandText} size={24} />
                {/* flexShrink, so the longer "Fetching…" label ends in an
                    ellipsis inside the row at a large font scale. */}
                <Text
                  fontSize="text-md"
                  fontWeight="font-semibold"
                  numberOfLines={1}
                  style={{ flexShrink: 1 }}
                >
                  {isFetchingLocation
                    ? "Fetching current location..."
                    : "Use current location"}
                </Text>
              </TouchableOpacity>

              {loading ? (
                <Text fontSize="text-sm" tone="body">
                  Loading nearby places...
                </Text>
              ) : (
                <FlatList
                  data={nearbyPlaces}
                  keyExtractor={(item) => item.place_id}
                  style={{ flex: 1 }}
                  contentContainerStyle={{
                    paddingBottom: SCREEN_GUTTER,
                    gap: PANEL_GAP,
                  }}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      accessibilityRole="button"
                      onPress={() => handleSelectNearbyPlace(item)}
                      style={{
                        minHeight: PLACE_ROW,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: ROW_GAP,
                        paddingLeft: ROW_INSET,
                      }}
                    >
                      <MapPinIcon
                        color={color.textBody}
                        size={20}
                        // 1.5pt at 20, in the icon's 24-unit box.
                        strokeWidth={1.8}
                      />
                      {/* Shrinks so a long place name wraps beside the pin
                          rather than pushing past the screen edge. */}
                      <Text fontSize="text-sm" style={{ flexShrink: 1 }}>
                        {item.name}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              )}
            </View>
          </View>

          {/* The kit CTA+Text bar: "Confirm location", "Skip for now" below. */}
          <BottomBar
            layout="cta-text"
            primary={{
              label: "Confirm location",
              onPress: () =>
                handleConfirmLocation(location, selectedAddress, selectedLocation),
              disabled: !canConfirmLocation || confirmBusy,
              loading: confirmBusy,
            }}
            secondary={{ label: "Skip for now", onPress: handleSkipLocation }}
          />
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </SafeAreaView>
  );
};

/** The selected spot: the outline map pin at 40 in brand, 1.5pt (Figma 2089:31105). */
function SelectedPin() {
  const { color } = useTheme();
  return <MapPinIcon size={PIN} color={color.brandText} strokeWidth={0.9} />;
}

/** "You are here": a 16 info dot ringed 3 in the surface colour (2089:31107). */
function HereDot() {
  const { color } = useTheme();
  return (
    <View
      style={{
        width: HERE_DOT,
        height: HERE_DOT,
        borderRadius: HERE_DOT / 2,
        borderWidth: HERE_RING,
        borderColor: color.surface,
        backgroundColor: color.info,
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default LocationModal;
