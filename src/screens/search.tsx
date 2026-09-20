import {
  BackButton,
  Button,
  FieldShell,
  StaticContainer,
  Text,
  useFieldSurfaceStyle,
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
import {
  MIN_TOUCH_TARGET,
  SCREEN_GUTTER,
  fontFamily,
  radius,
  ink,
  colors,
  space,
} from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";

const StyledBottomView = styled(BottomSheetView);

// Title suggestions used to fire one request per keystroke, which made the
// search field feel laggy on a real connection.
const SUGGESTION_DEBOUNCE_MS = 300;

interface Coordinates {
  lat: number | undefined;
  lng: number | undefined;
}

// Measured off the Figma "Search anything" frame. Each question is a 136pt block
// (24 padding, a 24pt label, a 16pt gap, a 48pt control) and the blocks are
// divided by a hairline. All three are open at once: the design has no collapsed
// state, so the step-by-step disclosure this screen used to have is gone.
const SECTION_PADDING = 24;
const SECTION_GAP = 16;
const HEADER_HEIGHT = 44;
const FIELD_HEIGHT = 48;
// One point off `radius.input`: the design draws these controls a little rounder
// than a form input, as it does the Home search field.
const FIELD_RADIUS = 12;
const FIELD_PADDING = 16;
const ICON_SIZE = 24;
// Where the keyword text starts inside the field: 16 padding, the 24pt glyph and an
// 8pt gap, less the ~13pt the dropdown library already insets its input by.
const KEYWORD_TEXT_INSET = 34;
const BAR_PADDING_V = 16;
const BAR_ICON_SIZE = 20;

export default function SearchScreen() {
  const navigation = useTypedNavigation();
  const { theme } = useGlobalContext();
  const isDark = theme === "dark";
  const { color, shadow, fieldShadow } = useTheme();
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

  const handleOpenDatePicker = () => {
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

  // What the Where and When rows report. Never blank: an empty row reads as
  // broken rather than as "not narrowed down".
  const whereSummary = selectedLocationName || "Anywhere";
  const whenSummary = hasDates
    ? `${formatDate(range.startDate)} – ${formatDate(range.endDate)}`
    : "Select dates";

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

  const fieldBox = {
    minHeight: FIELD_HEIGHT,
    // The design's 16 is measured from the outer edge, so the 1pt border is part of it.
    paddingHorizontal: FIELD_PADDING - 1,
    paddingVertical: 8,
    borderRadius: FIELD_RADIUS,
    // The design draws every control here in the hairline tone, in both themes.
    borderColor: color.line,
  };

  const divider = <View style={{ height: 1, backgroundColor: color.line }} />;

  // A Where / When row: leading glyph, the answer, and a pencil that says it can
  // be changed. The design shows the pencil whether or not the row is filled.
  const renderSelectRow = (
    label: string,
    value: string,
    icon: React.ReactNode,
    onRowPress: () => void,
    hint: string
  ) => (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      accessibilityHint={hint}
      onPress={onRowPress}
    >
      <FieldShell style={fieldBox}>
        {icon}
        <Text fontSize="text-md" numberOfLines={1} style={{ flex: 1 }}>
          {value}
        </Text>
        <PencilSquareIcon color={color.textBody} size={ICON_SIZE} />
      </FieldShell>
    </TouchableOpacity>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StaticContainer width={100}>
        <View className="flex-1 w-full pt-3">
          {/* Header: a centred title with the back arrow floated in its own 44pt box. */}
          <View
            style={{
              height: HEADER_HEIGHT,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: SCREEN_GUTTER,
            }}
          >
            <Text fontSize="text-base" fontWeight="font-bold">
              Search anything
            </Text>
            <View style={{ position: "absolute", left: SCREEN_GUTTER, top: 0 }}>
              <BackButton />
            </View>
          </View>
          {divider}

          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            // The filter controls must remain reachable when the keyboard has
            // reduced the viewport. Unhandled taps dismiss it; controls still
            // receive their first tap.
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
            contentContainerStyle={{ flexGrow: 1 }}
          >
            {/* What — the keyword. Above its siblings so the suggestions popover
                is not clipped by the rows underneath it. */}
            <View style={{ padding: SECTION_PADDING, gap: SECTION_GAP, zIndex: 20 }}>
              <Text fontSize="text-md" fontWeight="font-bold">
                What?
              </Text>
              <View
                style={[
                  keywordSurface,
                  fieldBox,
                  {
                    // Pinned: the dropdown library adds its own vertical and
                    // leading padding inside, which grew the field to ~61pt. The
                    // glyph is laid over the left edge, and the input's own
                    // leading inset is what places the text after it.
                    height: FIELD_HEIGHT,
                    paddingVertical: 0,
                    paddingHorizontal: 0,
                    flexDirection: "row",
                    alignItems: "center",
                    borderColor: isFocus ? color.focus : color.line,
                  },
                ]}
              >
                <MagnifyingGlassIcon
                  color={color.text}
                  size={ICON_SIZE}
                  style={{ position: "absolute", zIndex: 12, left: FIELD_PADDING - 1 }}
                />
                <AutocompleteDropdown
                  ref={autocompleteDropdownRef}
                  dataSet={suggestionsList}
                  onChangeText={(text) => {
                    getSuggestions(text);
                    setSelectedItem(text); // Set selectedItem to the input text
                  }}
                  // Transparent: the box above already paints the field's
                  // surface, and a second one inside it drew a box in a box.
                  inputContainerStyle={{
                    backgroundColor: "transparent",
                    borderRadius: FIELD_RADIUS,
                    width: "100%",
                    paddingLeft: KEYWORD_TEXT_INSET,
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
                    placeholder: '"Washing machine"',
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
            </View>
            {divider}

            {/* Where — the place. */}
            <View style={{ padding: SECTION_PADDING, gap: SECTION_GAP }}>
              <Text fontSize="text-md" fontWeight="font-bold">
                Where?
              </Text>
              {renderSelectRow(
                "Where",
                whereSummary,
                <MapPinIcon color={color.text} size={ICON_SIZE} />,
                handleOpenBottomSheet,
                "Opens place search"
              )}
            </View>
            {divider}

            {/* When — the dates. */}
            <View style={{ padding: SECTION_PADDING, gap: SECTION_GAP }}>
              <Text fontSize="text-md" fontWeight="font-bold">
                When?
              </Text>
              {renderSelectRow(
                "When",
                whenSummary,
                <CalendarIcon color={color.text} size={ICON_SIZE} />,
                handleOpenDatePicker,
                "Opens the date picker"
              )}
            </View>
          </ScrollView>

          {/* Footer */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              // Opaque: the scrolling content must not draw through it.
              backgroundColor: color.canvas,
              paddingHorizontal: SECTION_PADDING,
              paddingVertical: BAR_PADDING_V,
              borderTopWidth: 1,
              borderTopColor: color.line,
              // The design lifts the bar with a faint upward shadow in light only.
              ...(isDark
                ? {}
                : {
                    ...fieldShadow,
                    shadowOpacity: 0.05,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: -2 },
                    elevation: 0,
                  }),
            }}
          >
            {/* Offering to clear filters when none are set is noise. */}
            {hasAnyCriteria ? (
              <TouchableOpacity
                onPress={cleanUp}
                accessibilityRole="button"
                accessibilityLabel="Clear all filters"
                style={{ minHeight: MIN_TOUCH_TARGET, justifyContent: "center" }}
              >
                <Text
                  fontSize="text-sm"
                  fontWeight="font-bold"
                  tone="brand"
                  style={{ textDecorationLine: "underline" }}
                >
                  Clear all
                </Text>
              </TouchableOpacity>
            ) : (
              <View />
            )}

            <Button onPress={onPress}>
              <MagnifyingGlassIcon color={color.onBrand} size={BAR_ICON_SIZE} />
              <Text
                fontSize="text-sm"
                fontWeight="font-bold"
                style={{ color: color.onBrand, marginLeft: 4 }}
              >
                {hasAnyCriteria ? "Search" : "Browse all"}
              </Text>
            </Button>
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
                      style={{ marginTop: space.sm }}
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
