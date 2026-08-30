import {
  BackButton,
  Button,
  FieldShell,
  StaticContainer,
  Text,
  useFieldSurfaceStyle,
  usePressFeedback,
} from "@/components/core";
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
import { Platform, TouchableOpacity, View } from "react-native";
import { AutocompleteDropdown } from "react-native-autocomplete-dropdown";
import {
  GestureHandlerRootView,
  ScrollView,
  TextInput,
} from "react-native-gesture-handler";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import {
  MagnifyingGlassIcon,
  MapPinIcon,
  PencilSquareIcon,
  ViewfinderCircleIcon,
  XMarkIcon,
} from "react-native-heroicons/outline";
import { CalendarIcon } from "react-native-heroicons/solid";
import { heightPercentageToDP as hp } from "react-native-responsive-screen";
import {
  MIN_TOUCH_TARGET,
  SCREEN_GUTTER,
  fontFamily,
  radius,
  ink,
  colors,
} from "@/lib/design-tokens";
import { CATEGORIES } from "@/lib/categories";
import { categoryDisplayName, CategoryIcon } from "@/lib/category-icons";
import { useTheme } from "@/lib/theme";

const StyledBottomView = styled(BottomSheetView);

// Title suggestions used to fire one request per keystroke, which made the
// search field feel laggy on a real connection.
const SUGGESTION_DEBOUNCE_MS = 300;

interface Coordinates {
  lat: number | undefined;
  lng: number | undefined;
}

/** The three questions this screen asks, in the order it asks them. */
type SearchStep = "what" | "where" | "when";

/**
 * A step nobody is answering right now.
 *
 * The screen used to keep all three open — three headings, three full-bleed
 * rules and three 56pt controls — which spent the top two thirds of the
 * viewport on inputs that were, in the common case, already answered. Collapsed
 * it is one filled row: the question on the left, its current answer on the
 * right, so nothing is hidden, only quietened.
 */
function StepSummary({
  label,
  value,
  isSet,
  onPress,
}: {
  label: string;
  value: string;
  isSet: boolean;
  onPress: () => void;
}) {
  const { pressStyle, onPressIn, onPressOut } = usePressFeedback();

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      accessibilityHint="Opens this step so you can change it"
      activeOpacity={1}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={onPress}
      style={pressStyle}
    >
      <FieldShell style={{ minHeight: 52 }}>
        <Text role="fieldLabel" tone="body">
          {label}
        </Text>
        <Text
          fontSize="text-md"
          fontWeight="font-semibold"
          tone={isSet ? "default" : "dim"}
          numberOfLines={1}
          style={{ flex: 1, textAlign: "right" }}
        >
          {value}
        </Text>
      </FieldShell>
    </TouchableOpacity>
  );
}

/** The one step that is open: its question, then the control that answers it. */
function StepCard({
  label,
  children,
  style,
}: {
  label: string;
  children: React.ReactNode;
  style?: any;
}) {
  const { color, shadow } = useTheme();

  return (
    <View
      style={[
        {
          backgroundColor: color.surface,
          borderRadius: radius.group,
          borderWidth: 1,
          borderColor: color.line,
          padding: 14,
          gap: 10,
        },
        // The open step is the raised one. Light elevates with a shadow, dark
        // with the hairline above — both come from the theme, not a literal.
        shadow,
        style,
      ]}
    >
      <Text role="fieldLabel">{label}</Text>
      {children}
    </View>
  );
}

export default function SearchScreen() {
  const navigation = useTypedNavigation();
  const { theme } = useGlobalContext();
  const isDark = theme === "dark";
  const { color, shadow } = useTheme();
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
  // Only one question is open at a time; the keyword is the one you always
  // start with, so it is the step that is open when the screen arrives.
  const [activeStep, setActiveStep] = useState<SearchStep>("what");
  const [isBottomSheetVisible, setBottomSheetVisible] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [suggestionsList, setSuggestionsList] = useState<any[] | null>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const googlePlacesRef = useRef<any>(null);
  const autocompleteDropdownRef = useRef<any>(null);
  const dropdownController = useRef<any>(null);
  const suggestionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionRequestRef = useRef(0);
  const hasGooglePlacesApiKey = GOOGLE_MAP_API_KEY.trim().length > 0;

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
    setActiveStep("what");
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

  // Opening a step and opening the picker it exists for are one intent, so they
  // are one tap: a collapsed "Where" row goes straight to the place search.
  const handleOpenBottomSheet = () => {
    setActiveStep("where");
    setBottomSheetVisible(true);
    bottomSheetRef.current?.expand();
  };

  const handleOpenDatePicker = () => {
    setActiveStep("when");
    setOpen(true);
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

  // Browsing the whole catalogue is the most common first intent in a
  // marketplace, and it was shut off: the button stayed disabled until a
  // keyword was typed, so "Anywhere / Any dates" was never a runnable query.
  const hasKeyword = Boolean(selectedItem?.trim());
  const hasLocation = Boolean(selectedLocationName);
  const hasDates = Boolean(range?.startDate && range?.endDate);
  const hasAnyCriteria = hasKeyword || hasLocation || hasDates;

  // What each collapsed step reports. Never blank: an empty row reads as broken
  // rather than as "not narrowed down".
  const whatSummary = selectedItem?.trim() || "Anything";
  const whereSummary = selectedLocationName || "Anywhere";
  const whenSummary = hasDates
    ? `${formatDate(range.startDate)} – ${formatDate(range.endDate)}`
    : "Any dates";

  const onPress = () => {
    // SearchResults runs its own search when it opens without products, so the
    // tap navigates straight away instead of blocking on the network request.
    navigation.navigate("SearchResults", {
      selectedItem: selectedItem?.trim() ?? "",
      address: selectedLocationName ?? "",
      coords: { lat: selectedLocation?.lat, lng: selectedLocation?.lng },
      // Navigation params must survive being written to disk and read back, so
      // the range crosses as ISO strings rather than as Date instances.
      range: {
        startDate: range.startDate?.toISOString(),
        endDate: range.endDate?.toISOString(),
      },
      products: [],
    });
  };

  const getCurrentLocation = async () => {
    try {
      const { coords } = await Location.getCurrentPositionAsync();
      setLocation(coords);
    } catch (error) {
    }
  };

  const fetchNearbyPlaces = async () => {
    if (!location.latitude || !location.longitude) return;

    setLoading(true);

    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location.latitude},${location.longitude}&radius=1500&type=restaurant&key=${GOOGLE_MAP_API_KEY}`;

    try {
      const response = await axios.get(url);
      setNearbyPlaces(response.data.results);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (location.latitude && location.longitude) {
      fetchNearbyPlaces();
    }
  }, [location.latitude, location.longitude]);

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

  const fetchSuggestions = useCallback(async (q: string) => {
    const requestId = ++suggestionRequestRef.current;
    setLoading(true);
    try {
      const response = await axiosInstance.get(ALL_PRODUCTS, {
        params: { title: q },
      });
      // Ignore responses that a newer keystroke has already superseded.
      if (requestId !== suggestionRequestRef.current) return;
      const { products } = response.data;
      const suggestions = products.map((item: string, index: number) => ({
        id: index,
        title: item,
      }));
      setSuggestionsList(suggestions);
    } catch {
      if (requestId === suggestionRequestRef.current) setSuggestionsList([]);
    } finally {
      if (requestId === suggestionRequestRef.current) setLoading(false);
    }
  }, []);

  const getSuggestions = useCallback(
    (q: string) => {
      if (suggestionTimerRef.current) {
        clearTimeout(suggestionTimerRef.current);
        suggestionTimerRef.current = null;
      }

      if (typeof q !== "string" || q.trim().length < 2) {
        // Invalidate anything in flight so a late response cannot repopulate
        // the dropdown after the field was cleared.
        suggestionRequestRef.current += 1;
        setSuggestionsList([]);
        setLoading(false);
        return;
      }

      suggestionTimerRef.current = setTimeout(() => {
        void fetchSuggestions(q.trim());
      }, SUGGESTION_DEBOUNCE_MS);
    },
    [fetchSuggestions]
  );

  useEffect(
    () => () => {
      if (suggestionTimerRef.current) clearTimeout(suggestionTimerRef.current);
    },
    []
  );

  // One focus treatment for the whole app: the border changes colour and
  // nothing else. The purple glow ring this field used to grow is a web
  // pattern; iOS has never shipped one.
  const keywordSurface = useFieldSurfaceStyle({ focused: isFocus });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StaticContainer width={100}>
        <View className="flex-1 w-full pt-2">
          {/* Header */}

          <View
            className={`p-3 flex flex-row items-center border-b ${isDark ? "border-b-line-dark" : "border-b-line-light"
              }`}
          >
            <BackButton />
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text role="screenTitle">Search anything</Text>
            </View>
            {/* Balances the back button so the title stays optically centred. */}
            <View style={{ width: MIN_TOUCH_TARGET }} />
          </View>

          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            // The filter controls must remain reachable when the keyboard has
            // reduced the viewport. Unhandled taps dismiss it; controls still
            // receive their first tap.
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
            // Clear of the footer bar: the last chip row used to end flush with
            // the scroll viewport and read as sliced by the Search button.
            contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
          >
            {/* The three questions, one open at a time. */}
            <View
              style={{
                paddingHorizontal: SCREEN_GUTTER,
                paddingTop: 12,
                gap: 10,
              }}
            >
            {/* What — the keyword. */}
            {activeStep !== "what" ? (
              <StepSummary
                label="What"
                value={whatSummary}
                isSet={hasKeyword}
                onPress={() => setActiveStep("what")}
              />
            ) : (
            // Above its siblings so the suggestions popover is not clipped by
            // the collapsed rows underneath it.
            <StepCard label="What" style={{ zIndex: 20 }}>
            <View
              style={[
                keywordSurface,
                {
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 8,
                  paddingVertical: 0,
                },
              ]}
            >
              <MagnifyingGlassIcon
                color={ink.text(isDark)}
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
                // Transparent: the shell above already paints the field's
                // surface, and a second one inside it drew a box in a box.
                inputContainerStyle={{
                  backgroundColor: "transparent",
                  borderRadius: radius.input,
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
                  // Quoted, it read as a value already entered in the field.
                  placeholder: "e.g. washing machine, drone, projector",
                  // The screen exists for exactly one purpose, so the field it
                  // exists for takes focus on open rather than costing a tap.
                  autoFocus: true,
                  autoCapitalize: "none",
                  autoComplete: "off",
                  autoCorrect: false,
                  numberOfLines: 1,
                  value: what && what === selectedItem ? what : selectedItem ?? undefined,
                  placeholderTextColor: color.placeholder,
                  style: {
                    color: color.text,
                    fontFamily: fontFamily.regular,
                    fontSize: 16,
                    width: "95%",
                  },
                }}
                suggestionsListContainerStyle={{
                  backgroundColor: color.surface,
                  borderWidth: 1,
                  // A hairline is not enough to separate a floating panel from
                  // the surface behind it; the popover read as part of the page
                  // and covered the first letter of the "Where?" heading.
                  borderColor: color.inputLine,
                  borderRadius: radius.input,
                  width: "100%",
                  // Elevation from the theme, not a hand-rolled shadow: light
                  // lifts with a shadow, dark with the hairline above.
                  ...shadow,
                }}
                // The library's default "Nothing found" rendered dark grey on
                // dark grey and floated over the "Where?" heading beneath it.
                EmptyResultComponent={
                  <View style={{ padding: 16 }}>
                    <Text fontSize="text-sm" tone="body">
                      No matches yet. Try a broader word, or search the whole
                      catalogue.
                    </Text>
                  </View>
                }
                onSelectItem={(item) => {
                  if (item) {
                    setSelectedItem(item.title!);
                  }
                }}
                // The X button cleared nothing without this. The library spreads
                // textInputProps *after* its own `value`, so `selectedItem` here
                // controls the input, but its onClearPress only resets internal
                // state and never calls onChangeText. Clearing app state is
                // therefore ours to do.
                onClear={() => {
                  setSelectedItem("");
                  getSuggestions("");
                }}
                suggestionsListMaxHeight={250}
                containerStyle={{
                  flexGrow: 1,
                }}
                showChevron={false}
                renderItem={(item) => (
                  <Text fontSize="text-md" style={{ padding: 14 }}>
                    {item.title}
                  </Text>
                )}
                closeOnBlur={true}
                ClearIconComponent={
                  <XMarkIcon color={color.textBody} size={20} />
                }
              />
            </View>
            </StepCard>
            )}

            {/* Where — the place. */}
            {activeStep !== "where" ? (
              <StepSummary
                label="Where"
                value={whereSummary}
                isSet={hasLocation}
                onPress={handleOpenBottomSheet}
              />
            ) : (
            <StepCard label="Where">
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`Where: ${whereSummary}`}
                accessibilityHint="Opens place search"
                onPress={handleOpenBottomSheet}
              >
                <FieldShell>
                  <MapPinIcon color={ink.text(isDark)} size={20} />
                  <Text
                    fontSize="text-md"
                    tone={hasLocation ? "default" : "dim"}
                    numberOfLines={1}
                    style={{ flex: 1 }}
                  >
                    {whereSummary}
                  </Text>
                  {hasLocation && (
                    <PencilSquareIcon color={ink.text(isDark)} size={20} />
                  )}
                </FieldShell>
              </TouchableOpacity>
            </StepCard>
            )}

            {/* When — the dates. */}
            {activeStep !== "when" ? (
              <StepSummary
                label="When"
                value={whenSummary}
                isSet={hasDates}
                onPress={handleOpenDatePicker}
              />
            ) : (
            <StepCard label="When">
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`When: ${whenSummary}`}
                accessibilityHint="Opens the date picker"
                onPress={handleOpenDatePicker}
              >
                <FieldShell>
                  <CalendarIcon color={ink.text(isDark)} size={20} />
                  <Text
                    fontSize="text-md"
                    tone={hasDates ? "default" : "dim"}
                    numberOfLines={1}
                    style={{ flex: 1 }}
                  >
                    {whenSummary}
                  </Text>
                  {hasDates && (
                    <PencilSquareIcon color={ink.text(isDark)} size={20} />
                  )}
                </FieldShell>
              </TouchableOpacity>
            </StepCard>
            )}
            </View>

            {/* Somewhere to start when you do not yet know what to type. */}
            <View
              style={{
                paddingHorizontal: SCREEN_GUTTER,
                paddingTop: 20,
                paddingBottom: 12,
              }}
            >
              <Text
                accessibilityRole="header"
                role="sectionTitle"
                style={{ marginBottom: 12 }}
              >
                Popular categories
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {CATEGORIES.slice(0, 8).map((category) => (
                  <TouchableOpacity
                    key={category.name}
                    accessibilityRole="button"
                    accessibilityLabel={`Search ${categoryDisplayName(category.name)}`}
                    onPress={() => {
                      setSelectedItem(category.name);
                      autocompleteDropdownRef.current?.setInputText?.(
                        category.name
                      );
                      // The keyword question is answered, so hand the stack on
                      // to the next one instead of leaving the field open.
                      setActiveStep("where");
                    }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      minHeight: 36,
                      paddingHorizontal: 12,
                      borderRadius: radius.full,
                      borderWidth: 1,
                      borderColor: color.line,
                      backgroundColor: color.surface,
                    }}
                  >
                    <CategoryIcon
                      name={category.name}
                      size={16}
                      color={color.brandText}
                    />
                    <Text fontSize="text-sm">{categoryDisplayName(category.name)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Footer */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              // Opaque: a wrapped fourth row of chips was drawing through it.
              backgroundColor: color.canvas,
              // "Clear all" sat 16pt from the left while Search sat 22pt from
              // the right. One gutter on both sides.
              paddingHorizontal: SCREEN_GUTTER,
              paddingVertical: 12,
              borderTopWidth: 1,
              borderTopColor: color.line,
            }}
          >
            {/* Offering to clear filters when none are set is noise. */}
            {hasAnyCriteria ? (
              <TouchableOpacity
                onPress={cleanUp}
                accessibilityRole="button"
                accessibilityLabel="Clear all filters"
                style={{ minHeight: 44, justifyContent: "center" }}
              >
                <Text fontSize="text-md" fontWeight="font-semibold" tone="brand">
                  Clear all
                </Text>
              </TouchableOpacity>
            ) : (
              <View />
            )}

            <View style={{ minWidth: 150 }}>
              <Button onPress={onPress}>
                <MagnifyingGlassIcon color="#FFFFFF" size={18} />
                <Text
                  fontSize="text-md"
                  fontWeight="font-bold"
                  style={{ color: "#FFFFFF", marginLeft: 8 }}
                >
                  {hasAnyCriteria ? "Search" : "Browse all"}
                </Text>
              </Button>
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
              backgroundStyle={{ backgroundColor: ink.canvas(isDark) }}
              onClose={() => setBottomSheetVisible(false)}
              handleIndicatorStyle={{
                backgroundColor: ink.line(isDark),
              }}
              handleStyle={{
                borderTopWidth: 2,
                borderLeftWidth: 2,
                borderRightWidth: 2,
                borderTopColor: ink.line(isDark),
                borderLeftColor: ink.line(isDark),
                borderRightColor: ink.line(isDark),
                borderTopRightRadius: 50,
                borderTopLeftRadius: 50,
              }}
            >
              <StyledBottomView className="w-full px-gutter py-2 flex flex-col justify-start flex-1">
                <View className="h-full">
                  <View
                    className={`flex-row pl-3 min-h-11 rounded-card border ${isDark
                      ? "border-input-line-dark bg-surface-dark"
                      : "border-input-line-light bg-surface-light"
                      }`}
                    style={{ alignItems: 'flex-start' }}
                  >
                    <MagnifyingGlassIcon
                      color={ink.body(isDark)}
                      size={24}
                      style={{ marginTop: hp(1.1) }}
                    />
                    {hasGooglePlacesApiKey ? (
                      <GooglePlacesAutocomplete
                        ref={googlePlacesRef}
                        placeholder="Search area or street name"
                        query={{ key: GOOGLE_MAP_API_KEY, language: "en" }}
                        debounce={300}
                        minLength={2}
                        fetchDetails={true}
                        onPress={(data, details = null) => {
                          setSelectedLocationName(data.description);
                          setSelectedLocation({
                            lat: details?.geometry.location.lat,
                            lng: details?.geometry.location.lng,
                          });
                          bottomSheetRef.current?.close();
                        }}
                        onFail={(error) => {
                          console.warn("Google Places autocomplete failed:", error);
                          setLocationError(
                            "Unable to load place suggestions. Please try again."
                          );
                        }}
                        onNotFound={() => setLocationError("No places found.")}
                        enablePoweredByContainer={false}
                        styles={{
                          textInput: {
                            height: '100%',
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
                    ) : (
                      <Text tone="body" className="flex-1 self-center px-2 text-sm">
                        Place search is unavailable in this QA build.
                      </Text>
                    )}
                  </View>

                  {locationError && (
                    <Text tone="body" className="mt-3 text-sm">
                      {locationError}
                    </Text>
                  )}

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
