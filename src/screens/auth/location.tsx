import * as Location from "expo-location";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  LayoutChangeEvent,
  Linking,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import Svg, { Defs, LinearGradient, Polygon, RadialGradient, Rect, Stop } from "react-native-svg";
import { HeaderIndicator } from "@/components/auth/headerIndicator";
import { BottomBar, MapPlaceholder, NonScrollableContainer, Text } from "@/components/core";
import { RingSpinner } from "@/components/core/ring-spinner";
import { useTheme } from "@/lib/theme";
import { useRoute } from "@react-navigation/native";
import darkModeMapStyle from "assets/mapJSON/darkModeMapStyle.json";
import BottomSheet, { BottomSheetFlatList } from "@gorhom/bottom-sheet";
import { GOOGLE_MAP_API_KEY } from "@/lib/config";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import { NearbyPlace, useTypedNavigation } from "@/lib/types";
import { goAfterSignIn } from "@/lib/return-to";
import axios from "axios";
import { MagnifyingGlassIcon, MapPinIcon } from "react-native-heroicons/outline";
// heroicons 2.1 renamed the mini "viewfinder-circle" glyph; this one draws the frame's viewfinder-dot.
import { ViewfinderCircleIcon } from "react-native-heroicons/mini";
import { useAuthContext } from "@/context/auth-context";
import { SignUpError, useAuth } from "@/backend/auth";
import { SCREEN_GUTTER } from "@/lib/design-tokens";

const LOCATION_FETCH_TIMEOUT_MS = 12000;
const LOCATION_LOG_PREFIX = "[auth/location]";

/** Dev-only design seed (ENG-428 plan §1/§2): only DevFixture passes it. */
type LocationDesign =
  | { state: "no-permission" | "fetching" | "failed" }
  | {
      state: "map";
      coords: { latitude: number; longitude: number };
      selected: { latitude: number; longitude: number } | null;
      address: string;
      selectedAddress: string | null;
      nearby: NearbyPlace[];
    };

/** Builds the `LocationObject` a `map` seed stands for (plan §2). */
const seedLocation = (design: LocationDesign | undefined): Location.LocationObject | null =>
  design?.state === "map"
    ? {
        coords: {
          ...design.coords,
          altitude: null,
          accuracy: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: 0,
      }
    : null;

// figma/02 2089:28140: content under the 56pt top bar starts at frame y110.
// The sheet's top sits at y338 ("snap 60%"), 228 under it.
const HEADER_BOTTOM = 110;
const SHEET_TOP = 338 - HEADER_BOTTOM;

/**
 * The "You are here" marker (28140): a 28 disc of brand-panel-line at 60% with
 * a 14 brand dot edged 2 in white. Drawn in the live `Marker` and, under a seed,
 * over the placeholder map.
 */
function YouAreHereMarker() {
  const { color } = useTheme();
  return (
    <View style={{ width: 28, height: 28, alignItems: "center", justifyContent: "center" }}>
      <View
        style={{
          ...StyleSheet.absoluteFillObject,
          borderRadius: 14,
          backgroundColor: color.brandPanelLine,
          opacity: 0.6,
        }}
      />
      <View
        style={{
          width: 14,
          height: 14,
          borderRadius: 7,
          borderWidth: 2,
          borderColor: "#FFFFFF",
          backgroundColor: color.brand,
        }}
      />
    </View>
  );
}

/** The selected-location marker (28140): a "Selected location" chip 4 above an outline map-pin 32. */
function SelectedMarker() {
  const { color } = useTheme();
  return (
    <View style={{ alignItems: "center", gap: 4 }}>
      <View style={{ backgroundColor: color.text, borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8 }}>
        <Text fontSize="text-xs" fontWeight="font-semibold" lineHeight={16} style={{ color: color.canvas }}>
          Selected location
        </Text>
      </View>
      <MapPinIcon size={32} color={color.brand} />
    </View>
  );
}

/**
 * The design system's Map Pin (Active) (1:3280), which has no code: a 36 white
 * disc padded 6 around a brand dot, with the kit's two drop shadows (0/3 blur
 * 1.5 at 25%, 0/9 blur 12 at 10%).
 */
function MapPinActive() {
  const { color } = useTheme();
  return (
    <View
      style={{
        borderRadius: 18,
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 9 },
        shadowRadius: 6,
        shadowOpacity: 0.1,
        elevation: 4,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          padding: 6,
          backgroundColor: "#FFFFFF",
          shadowColor: "#000000",
          shadowOffset: { width: 0, height: 3 },
          shadowRadius: 0.75,
          shadowOpacity: 0.25,
        }}
      >
        <View style={{ flex: 1, borderRadius: 12, backgroundColor: color.brand }} />
      </View>
    </View>
  );
}

/**
 * "Allow location" art (28033, NEW neutral map): the kit map tile 459×459,
 * centred and clipped to the screen, faded to the canvas by a radial gradient,
 * with two rings (132 and 84), a teal sweep and the active pin at its centre.
 * Every number is the frame's; the 459 height gives way on a short screen.
 */
function AllowLocationArt() {
  const { color } = useTheme();
  return (
    <View style={{ height: 459, flexShrink: 1, marginTop: 16, overflow: "hidden", alignItems: "center" }}>
      <View style={{ width: 459, height: 459 }}>
        <MapPlaceholder style={StyleSheet.absoluteFill} />
      </View>
      {/* Frame 3455: clear at the centre to the canvas at an ellipse 88.6% of
          the box across each way (its gradientTransform), centred. */}
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <RadialGradient id="fade" cx="50%" cy="50%" rx="56.4%" ry="56.4%" fx="50%" fy="50%">
            <Stop offset="0" stopColor={color.canvas} stopOpacity={0} />
            <Stop offset="1" stopColor={color.canvas} stopOpacity={1} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#fade)" />
      </Svg>
      <View
        style={{
          position: "absolute",
          top: 164,
          width: 132,
          height: 132,
          borderRadius: 66,
          borderWidth: 1,
          borderColor: "#C4C4C4",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View style={{ width: 84, height: 84, borderRadius: 42, borderWidth: 1, borderColor: "#DEDEDE" }} />
        {/* Polygon 1: a triangle rotated 135°, apex on the pin, fading from
            #12837F at 25% to nothing 75% of the way to its base. Points are in
            the ring's box, moved down 24 so the svg holds the part above it. */}
        <Svg width={160} height={160} style={{ position: "absolute", left: 0, top: -24 }}>
          <Defs>
            <LinearGradient id="sweep" gradientUnits="userSpaceOnUse" x1="62.3" y1="94.3" x2="103.2" y2="53.4">
              <Stop offset="0" stopColor="#12837F" stopOpacity={0.25} />
              <Stop offset="1" stopColor="#12837F" stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Polygon points="62.3,94.3 81,4.1 152.4,75.6" fill="url(#sweep)" />
        </Svg>
        <View style={{ position: "absolute" }}>
          <MapPinActive />
        </View>
      </View>
    </View>
  );
}

export default function LocationScreen() {
  const { color, isDark: isDarkMode } = useTheme();
  const { signUpUser, loading: signUpLoading } = useAuth();
  const navigation = useTypedNavigation();
  const route = useRoute();
  const design = __DEV__ ? (route.params as { design?: LocationDesign } | undefined)?.design : undefined;
  const mapSeed = design?.state === "map" ? design : undefined;

  const { saveUser } = useAuthContext();

  const [hasPermission, setHasPermission] = useState<boolean | null>(
    design ? design.state !== "no-permission" : null
  );
  const [location, setLocation] = useState<Location.LocationObject | null>(
    () => seedLocation(design)
  );
  const [address, setAddress] = useState<string | null>(mapSeed?.address ?? null);
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(mapSeed?.selected ?? null);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(mapSeed?.selectedAddress ?? null);
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>(mapSeed?.nearby ?? []);
  const [loading, setLoading] = useState(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(design?.state === "fetching");
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
    // A design seed is its own state: no permission check, no location fix.
    if (design) return;
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
  }, [design, resolveCurrentLocation]);

  const handleSubmit = useCallback(async () => {
    if (design) return;
    console.log(`${LOCATION_LOG_PREFIX} primary CTA pressed`, {
      hasPermission,
    });
    if (hasPermission) {
      await resolveCurrentLocation();
      return;
    }

    await requestLocationPermission();
  }, [design, hasPermission, requestLocationPermission, resolveCurrentLocation]);

  const handleMapPress = useCallback(
    (event: any) => {
      if (design) return;
      const { latitude, longitude } = event.nativeEvent.coordinate;
      console.log(`${LOCATION_LOG_PREFIX} map pressed`, {
        latitude,
        longitude,
      });
      setSelectedLocation({ latitude, longitude });
      fetchSelectedAddress(latitude, longitude);
    },
    [design, fetchSelectedAddress]
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
    // A seed brings its own places; Google Places is never asked.
    if (location && !design) {
      fetchNearbyPlaces();
    }
  }, [location]);

  const handleSelectNearbyPlace = (place: any) => {
    if (design) return;
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
    // A design seed never signs up.
    if (design) return;
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
        goAfterSignIn(navigation);
      }
    } catch (error: any) {
      const signUpError = error as SignUpError;
      if (signUpError.code === "otp_verification_required") {
        Alert.alert(
          "Verification required",
          "Please confirm your email or phone number again before completing signup. A confirmation lasts an hour.",
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
    if (design) return;
    console.log(`${LOCATION_LOG_PREFIX} skipping location during onboarding`);
    try {
      const response = await signUpUser();
      if (response) {
        console.log(
          `${LOCATION_LOG_PREFIX} signup completed successfully without location`
        );
        goAfterSignIn(navigation);
      }
    } catch (error: any) {
      const signUpError = error as SignUpError;
      if (signUpError.code === "otp_verification_required") {
        Alert.alert(
          "Verification required",
          "Please confirm your email or phone number again before completing signup. A confirmation lasts an hour.",
          [{ text: "Go to verification", onPress: () => navigation.navigate("Email") }]
        );
        return;
      }

      Alert.alert(
        "Signup failed",
        signUpError.message || "Unable to complete signup right now."
      );
    }
  }, [design, navigation, signUpUser]);

  const bottomSheetRef = useRef<BottomSheet>(null);
  const googlePlacesRef = useRef<any>(null);
  const mapRef = useRef<MapView>(null);

  // The resting snap puts the sheet's top 228 under the top bar, as 28140
  // draws it (y338, "snap 60%" of the 844 frame). gorhom measures snap points
  // in the sheet's container (the area between the top bar and the sticky
  // bar), not the frame, so it is a number from that height. Snap points must
  // rise and the rest is above 60% of the container, so the middle stop moves
  // from 60% to halfway up to the 90% the keyboard opens it to. Until the
  // container is measured, the old points stand.
  const [sheetArea, setSheetArea] = useState(0);
  const snapPoints = useMemo<(string | number)[]>(() => {
    if (!sheetArea) return ["50%", "60%", "90%"];
    const top = sheetArea * 0.9;
    const rest = Math.min(Math.max(sheetArea - SHEET_TOP, 1), top);
    return [rest, (rest + top) / 2, top];
  }, [sheetArea]);
  const onSheetAreaLayout = useCallback((event: LayoutChangeEvent) => {
    setSheetArea(Math.round(event.nativeEvent.layout.height));
  }, []);

  const handlePlaceSelected = (data: any, details: any) => {
    if (design) return;
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
    if (design) return;
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

  const skipAction = {
    label: "Skip for now",
    onPress: handleSkipLocation,
    disabled: signUpLoading,
    loading: signUpLoading,
  };

  return (
    <NonScrollableContainer>
      <HeaderIndicator percentage={85} />

      {!hasPermission ? (
        <>
          {/* 28033: title block 8 under the top bar, the art 16 below it. */}
          <View style={{ flex: 1, paddingTop: 8 }}>
            <View style={{ paddingHorizontal: SCREEN_GUTTER, gap: 4 }}>
              <Text role="screenTitle">Allow location</Text>
              <Text fontSize="text-sm" lineHeight={20} tone="body">
                This allows Renit to fetch products near you
              </Text>
            </View>
            <AllowLocationArt />
          </View>
          {/* No frame draws it: today's denied/blocked line, kept above the bar. */}
          {locationError ? (
            <Text
              fontSize="text-sm"
              lineHeight={20}
              tone="danger"
              style={{ textAlign: "center", paddingHorizontal: SCREEN_GUTTER, marginBottom: 16 }}
            >
              {locationError}
            </Text>
          ) : null}
          <BottomBar
            layout="cta-text"
            primary={{ label: "Provide location access", onPress: handleSubmit, disabled: isFetchingLocation }}
            secondary={skipAction}
          />
        </>
      ) : location ? (
        <>
          {/* The sheet's container: the area between the top bar and the
              sticky bar, measured for the resting snap point. */}
          <View style={{ flex: 1 }} onLayout={onSheetAreaLayout}>
            {mapSeed ? (
              // 28140 under a seed: the kit map tile where the live map would be,
              // placed as the frame places it (520×844 at x−65, y0), with the
              // markers at the frame's positions.
              <View style={{ flex: 1, overflow: "hidden" }}>
                <MapPlaceholder
                  style={{ position: "absolute", left: -65, top: -HEADER_BOTTOM, width: 520, height: 844 }}
                />
                <View style={{ position: "absolute", left: 150, top: 250 - HEADER_BOTTOM }}>
                  <YouAreHereMarker />
                </View>
                {selectedLocation ? (
                  <View style={{ position: "absolute", left: 200, top: 196 - HEADER_BOTTOM }}>
                    <SelectedMarker />
                  </View>
                ) : null}
              </View>
            ) : (
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
                  anchor={{ x: 0.5, y: 0.5 }}
                >
                  <YouAreHereMarker />
                </Marker>

                {selectedLocation && (
                  <Marker coordinate={selectedLocation} title="Selected location" anchor={{ x: 0.5, y: 1 }}>
                    <SelectedMarker />
                  </Marker>
                )}
              </MapView>
            )}

            {/* Bottom sheet (28140): white, r24 top, a 0/−4 blur-24 shadow at
                12%, the 36×5 grabber 8 from the top and the content 16 under it. */}
            <BottomSheet
              // The window already shrinks for the keyboard (adjustResize); gorhom's
              // default adjustPan lifted the sheet by the keyboard height again.
              android_keyboardInputMode="adjustResize"
              ref={bottomSheetRef}
              snapPoints={snapPoints}
              enablePanDownToClose={false}
              index={0}
              enableHandlePanningGesture={true}
              enableContentPanningGesture={true}
              style={{
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                shadowColor: "#000000",
                shadowOffset: { width: 0, height: -4 },
                shadowRadius: 12,
                shadowOpacity: 0.12,
                elevation: 8,
              }}
              backgroundStyle={{
                backgroundColor: color.canvas,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
              }}
              handleStyle={{ paddingTop: 8, paddingBottom: 16 }}
              handleIndicatorStyle={{ width: 36, height: 5, borderRadius: 100, backgroundColor: color.line }}
            >
              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
                style={{ flex: 1 }}
              >
                <View style={{ flex: 1, paddingHorizontal: SCREEN_GUTTER, gap: 16 }}>
                  <View style={{ gap: 12 }}>
                    <View style={{ gap: 2 }}>
                      <Text fontSize="text-xs" fontWeight="font-semibold" lineHeight={16} tone="dim">
                        Your address
                      </Text>
                      <Text fontSize="text-sm" lineHeight={20}>
                        {address ? address : "Fetching address..."}
                      </Text>
                    </View>

                    {selectedLocation && (
                      <View style={{ gap: 2 }}>
                        <Text fontSize="text-xs" fontWeight="font-semibold" lineHeight={16} tone="dim">
                          Selected address
                        </Text>
                        <Text fontSize="text-sm" lineHeight={20}>
                          {selectedAddress ? selectedAddress : "Fetching selected address..."}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View
                    style={{
                      height: 48,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      paddingHorizontal: 12,
                      borderWidth: 1,
                      borderColor: color.line,
                      borderRadius: 12,
                      backgroundColor: color.surface,
                    }}
                  >
                    <MagnifyingGlassIcon color={color.textDim} size={20} />
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
                        container: { flex: 1 },
                        textInput: {
                          height: 46,
                          marginBottom: 0,
                          paddingHorizontal: 0,
                          paddingVertical: 0,
                          backgroundColor: "transparent",
                          color: color.text,
                          fontFamily: "PlusJakartaSans-Regular",
                          fontSize: 16,
                        },
                        row: {
                          backgroundColor: color.surface,
                        },
                        description: {
                          color: color.text,
                        },
                        separator: { backgroundColor: color.line },
                      }}
                      textInputProps={{
                        placeholderTextColor: color.placeholder,
                      }}
                    />
                  </View>

                  <TouchableOpacity
                    accessibilityRole="button"
                    onPress={handleCurrentLocation}
                    hitSlop={12}
                    style={{ flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start" }}
                  >
                    <ViewfinderCircleIcon size={20} color={color.brandText} />
                    <Text fontSize="text-sm" fontWeight="font-semibold" lineHeight={20} tone="brand">
                      Use current location
                    </Text>
                  </TouchableOpacity>

                  {loading ? (
                    <Text fontSize="text-sm" lineHeight={20} tone="body">
                      Loading nearby places...
                    </Text>
                  ) : (
                    <BottomSheetFlatList
                      data={nearbyPlaces}
                      keyExtractor={(item) => item.place_id}
                      style={{ maxHeight: 450 }}
                      contentContainerStyle={{ paddingBottom: SCREEN_GUTTER }}
                      keyboardShouldPersistTaps="handled"
                      renderItem={({ item }) => (
                        // 28140 "Place": 45 high, a map-pin 20, the name 12 after it.
                        <TouchableOpacity
                          accessibilityRole="button"
                          onPress={() => handleSelectNearbyPlace(item)}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 12,
                            paddingVertical: 12,
                            borderBottomWidth: 1,
                            borderBottomColor: color.line,
                          }}
                        >
                          <MapPinIcon color={color.textDim} size={20} />
                          <Text fontSize="text-sm" lineHeight={20} style={{ flexShrink: 1 }}>
                            {item.name}
                          </Text>
                        </TouchableOpacity>
                      )}
                    />
                  )}
                </View>
              </KeyboardAvoidingView>
            </BottomSheet>
          </View>

          {/* Fix pass: "Confirm location" moves from the sheet to the sticky bar. */}
          <BottomBar
            primary={{
              label: "Confirm location",
              onPress: () => handleConfirmLocation(location, selectedAddress, selectedLocation),
              loading: signUpLoading,
            }}
          />
        </>
      ) : isFetchingLocation ? (
        // 28076: the ring 40 at frame y384 (274 under the top bar), the line 16 below.
        <View style={{ flex: 1, paddingTop: 384 - HEADER_BOTTOM, paddingHorizontal: SCREEN_GUTTER, alignItems: "center", gap: 16 }}>
          <RingSpinner size={40} spinning={!design} />
          <Text fontSize="text-sm" lineHeight={20} tone="body" style={{ textAlign: "center" }}>
            Fetching your current location...
          </Text>
        </View>
      ) : (
        <>
          {/* 28104: title and body on the gutter, CTA+Text in the bar. */}
          <View style={{ flex: 1, paddingTop: 8, paddingHorizontal: SCREEN_GUTTER, gap: 4 }}>
            <Text role="screenTitle">We need your current location</Text>
            <Text fontSize="text-sm" lineHeight={20} tone="body">
              {locationError ||
                "Location access is granted, but we couldn’t fetch your current location yet."}
            </Text>
          </View>
          <BottomBar
            layout="cta-text"
            primary={{ label: "Try again", onPress: handleSubmit, disabled: isFetchingLocation }}
            secondary={skipAction}
          />
        </>
      )}
    </NonScrollableContainer>
  );
}
