import {
  BottomBar,
  FieldShell,
  SheetHeader,
  SubpageHeader,
  Text,
  useFieldSurfaceStyle,
} from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import DateRangePicker from "@/components/core/date-range-picker";
import { NearbyPlaceRow } from "@/components/search/nearby-place-row";
import { BOOKING_DAYS_AHEAD } from "@/lib/booking";
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
import React, { useCallback, useEffect, useRef, useState } from "react";
import { BackHandler, Dimensions, Platform, TouchableOpacity, View } from "react-native";
import { AutocompleteDropdown } from "react-native-autocomplete-dropdown";
import {
  GestureHandlerRootView,
  ScrollView,
} from "react-native-gesture-handler";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import {
  CalendarIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  PencilSquareIcon,
  ViewfinderCircleIcon,
  XMarkIcon,
} from "react-native-heroicons/outline";
import { SCREEN_GUTTER, fontFamily, radius } from "@/lib/design-tokens";
import { sheetScrimOpacity } from "@/components/core/custom-bottom-sheet-modal";
import { useTheme } from "@/lib/theme";

// Title suggestions used to fire one request per keystroke, which made the
// search field feel laggy on a real connection.
const SUGGESTION_DEBOUNCE_MS = 300;

interface Coordinates {
  lat: number | undefined;
  lng: number | undefined;
}

/** Google's nearbysearch result carries `vicinity` too; `NearbyPlace` (shared) only types what the app read before. */
type NearbyPlaceResult = NearbyPlace & { vicinity?: string };

// Figma 2089:29597. Each question is a 136pt block (24 padding, a 16/24
// SemiBold label, a 16pt gap, a 48pt field) and the blocks are divided by a
// hairline. All three are open at once.
const SECTION_PADDING = 24;
const SECTION_GAP = 16;
const FIELD_HEIGHT = 48;
// The frame's field: 12 inside the 1pt edge, a 20pt glyph, 8 to the text.
const FIELD_PADDING = 12;
const ICON_SIZE = 20;
const ICON_GAP = 8;
// The X sits 13 from the field's right edge, as the glyph does on the left;
// the library's clear button is 26 wide around the 20pt glyph and pushed 8 in.
const CLEAR_OFFSET = -3;
// The where-sheet's own content: 8 under the title, 24 at the sides, 8 between rows.
const SHEET_PAD_TOP = 8;
const SHEET_GAP = 8;
const SHEET_ROW = 56;
const SHEET_ICON = 24;
// The where-sheet's 50/75/90% stops, of the screen: gorhom's percentages are of its container, which starts under
// the status bar, so 75% came out ~47pt short of the frame's 633 (2089:29793, 75% of 844).
const WHERE_SNAPS = [0.5, 0.75, 0.9];

type SearchDesign = { resting: true };

export default function SearchScreen() {
  const navigation = useTypedNavigation();
  const { color, isDark } = useTheme();
  const route = useRoute<RouteProps<"Search">>();
  const { what, where, coords } = route?.params ?? {};
  // Dev-only design seed (ENG-427 D7): only DevFixture passes it. What? stays unfocused, so a frame's resting state
  // (2089:29597, 29654) is on screen without the focus ring and the keyboard.
  const design = __DEV__ ? (route?.params as { design?: SearchDesign } | undefined)?.design : undefined;

  const [selectedItem, setSelectedItem] = useState<string | null>(what ?? null);
  const [selectedLocationName, setSelectedLocationName] = useState<string | null>(
    where ?? null
  );
  const [location, setLocation] = useState({
    latitude: 0,
    longitude: 0,
  });

  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlaceResult[]>([]);
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

  // Hardware Back has to close the place sheet before it leaves the screen: the
  // navigator's global handler would otherwise pop Search with the sheet still
  // open. Registered last, so it runs first (iOS never fires this event).
  useEffect(() => {
    if (!isBottomSheetVisible) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      bottomSheetRef.current?.close();
      return true;
    });
    return () => subscription.remove();
  }, [isBottomSheetVisible]);

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
      opacity={sheetScrimOpacity(isDark, true)}
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

  // One focus treatment for the whole app: the kit field's edge goes 1.5pt
  // brand and nothing else moves (the surface hook takes the extra half point
  // back out of the padding).
  const keywordSurface = useFieldSurfaceStyle({ focused: isFocus });

  const fieldBox = {
    minHeight: FIELD_HEIGHT,
    paddingHorizontal: FIELD_PADDING,
    paddingVertical: 0,
    gap: ICON_GAP,
  };

  const divider = <View style={{ height: 1, backgroundColor: color.line }} />;

  // A Where / When row: leading glyph, the answer, and a pencil that says it can
  // be changed. The design shows the pencil whether or not the row is filled;
  // an unanswered row reads in the placeholder tone.
  const renderSelectRow = (
    label: string,
    value: string,
    filled: boolean,
    Icon: typeof MapPinIcon,
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
        <Icon color={color.textDim} size={ICON_SIZE} strokeWidth={1.5} />
        <Text fontSize="text-md" tone={filled ? "default" : "dim"} numberOfLines={1} style={{ flex: 1 }}>
          {value}
        </Text>
        <PencilSquareIcon color={color.textDim} size={ICON_SIZE} strokeWidth={1.5} />
      </FieldShell>
    </TouchableOpacity>
  );

  const block = (label: string, control: React.ReactNode, raised = false) => (
    <View style={{ padding: SECTION_PADDING, gap: SECTION_GAP, zIndex: raised ? 20 : undefined }}>
      <Text fontSize="text-md" fontWeight="font-semibold">
        {label}
      </Text>
      {control}
    </View>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* No bottom edge: the Bottom bar carries the home-indicator inset itself. */}
      <NonScrollableContainer>
        <View style={{ flex: 1 }}>
          <SubpageHeader title="Search anything" />
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
            {block(
              "What?",
              <View style={[keywordSurface, { height: FIELD_HEIGHT, paddingHorizontal: 0, paddingVertical: 0 }]}>
                <AutocompleteDropdown
                  ref={autocompleteDropdownRef}
                  dataSet={suggestionsList}
                  onChangeText={(text) => {
                    getSuggestions(text);
                    setSelectedItem(text); // Set selectedItem to the input text
                  }}
                  // The bordered View above is the field; this inner row is what the
                  // library measures to place its popover, so it sits inside the edge
                  // and the popover lands the frame's 4pt under the field.
                  inputHeight={FIELD_HEIGHT - 2 * Number(keywordSurface.borderWidth ?? 1)}
                  inputContainerStyle={{
                    backgroundColor: "transparent",
                    alignItems: "center",
                    paddingHorizontal: FIELD_PADDING,
                  }}
                  LeftComponent={
                    <MagnifyingGlassIcon color={color.textDim} size={ICON_SIZE} strokeWidth={1.5} />
                  }
                  rightButtonsContainerStyle={{ right: CLEAR_OFFSET }}
                  // The library keys its X on the text typed into it, so a search reopened with its words (Edit
                  // this search) had no X; the field's own value decides, as 2089:29654 draws it.
                  showClear={Boolean(selectedItem)}
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
                    placeholder: "“Washing machine”",
                    // The screen exists for exactly one purpose, so the field it
                    // exists for takes focus on open rather than costing a tap.
                    autoFocus: !design?.resting,
                    autoCapitalize: "none",
                    autoComplete: "off",
                    autoCorrect: false,
                    numberOfLines: 1,
                    // The field is pinned at 48pt; uncapped Dynamic Type clipped it.
                    maxFontSizeMultiplier: 1.4,
                    value: what && what === selectedItem ? what : selectedItem ?? undefined,
                    placeholderTextColor: color.placeholder,
                    selectionColor: color.brand,
                    style: {
                      color: color.text,
                      fontFamily: fontFamily.regular,
                      fontSize: 16,
                      paddingHorizontal: 0,
                      marginLeft: ICON_GAP,
                    },
                  }}
                  suggestionsListContainerStyle={{
                    // The measured row sits inside the 1pt edge; the panel is the
                    // field's full 342.
                    marginHorizontal: -1,
                    width: undefined,
                    alignSelf: "stretch",
                    backgroundColor: color.surface,
                    borderWidth: 1,
                    borderColor: color.line,
                    borderRadius: radius.input,
                    paddingVertical: 4,
                    // The frame's popover shadow: #00000014 at 0/8, blur 24.
                    shadowColor: "#000000",
                    shadowOpacity: 0.08,
                    shadowRadius: 12,
                    shadowOffset: { width: 0, height: 8 },
                    elevation: 8,
                  }}
                  ItemSeparatorComponent={<View />}
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
                  containerStyle={{ flex: 1, marginVertical: 0 }}
                  showChevron={false}
                  renderItem={(item) => (
                    <Text
                      fontSize="text-md"
                      numberOfLines={1}
                      style={{ paddingVertical: 14, paddingHorizontal: 16 }}
                    >
                      {item.title}
                    </Text>
                  )}
                  closeOnBlur={true}
                  ClearIconComponent={
                    <XMarkIcon color={color.textDim} size={ICON_SIZE} strokeWidth={1.5} />
                  }
                />
              </View>,
              true
            )}
            {divider}

            {/* Where — the place. */}
            {block(
              "Where?",
              renderSelectRow("Where", whereSummary, hasLocation, MapPinIcon, handleOpenBottomSheet, "Opens place search")
            )}
            {divider}

            {/* When — the dates. */}
            {block(
              "When?",
              renderSelectRow("When", whenSummary, hasDates, CalendarIcon, handleOpenDatePicker, "Opens the date picker")
            )}
            {divider}
          </ScrollView>

          {/* Offering to clear filters when none are set is noise, so the bar is
              a lone Browse all until something is chosen. */}
          <BottomBar
            layout={hasAnyCriteria ? "secondary-primary" : "full-cta"}
            primary={{ label: hasAnyCriteria ? "Search" : "Browse all", onPress }}
            secondary={
              hasAnyCriteria
                ? { label: "Clear all", onPress: cleanUp, accessibilityLabel: "Clear all filters" }
                : undefined
            }
          />

          {/* Bottom Sheet */}
          {isBottomSheetVisible && (
            <BottomSheet
              // The window already shrinks for the keyboard (adjustResize); gorhom's
              // default adjustPan lifted the sheet by the keyboard height again.
              android_keyboardInputMode="adjustResize"
              ref={bottomSheetRef}
              backdropComponent={renderBackdrop}
              index={1}
              snapPoints={WHERE_SNAPS.map((share) => Math.round(share * Dimensions.get("screen").height))}
              enablePanDownToClose={true}
              // The kit Sheet header draws the grabber and the sheet's 24 top
              // corners, so gorhom's own handle is off.
              handleComponent={null}
              backgroundStyle={{
                backgroundColor: color.surface,
                borderTopLeftRadius: radius.sheet,
                borderTopRightRadius: radius.sheet,
              }}
              onClose={() => setBottomSheetVisible(false)}
            >
              <BottomSheetView style={{ flex: 1 }}>
                <SheetHeader title="Where?" />
                <View
                  style={{
                    flex: 1,
                    paddingTop: SHEET_PAD_TOP,
                    paddingHorizontal: SCREEN_GUTTER,
                    gap: SHEET_GAP,
                  }}
                >
                  <FieldShell
                    style={{
                      minHeight: FIELD_HEIGHT,
                      paddingHorizontal: FIELD_PADDING,
                      paddingVertical: 0,
                      alignItems: "flex-start",
                    }}
                  >
                    <MagnifyingGlassIcon
                      color={color.textDim}
                      size={ICON_SIZE}
                      strokeWidth={1.5}
                      style={{ marginTop: (FIELD_HEIGHT - 2 - ICON_SIZE) / 2 }}
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
                          textInputContainer: { backgroundColor: "transparent" },
                          textInput: {
                            height: FIELD_HEIGHT - 2,
                            marginBottom: 0,
                            paddingVertical: 0,
                            paddingHorizontal: 0,
                            backgroundColor: "transparent",
                            color: color.text,
                            fontFamily: fontFamily.regular,
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
                          selectionColor: color.brand,
                        }}
                      />
                    ) : (
                      <Text tone="body" fontSize="text-sm" style={{ flex: 1, alignSelf: "center" }}>
                        Place search is unavailable in this QA build.
                      </Text>
                    )}
                  </FieldShell>

                  {locationError && (
                    <Text tone="body" fontSize="text-sm">
                      {locationError}
                    </Text>
                  )}

                  <TouchableOpacity
                    accessibilityRole="button"
                    onPress={handleCurrentLocation}
                    style={{ minHeight: SHEET_ROW, flexDirection: "row", alignItems: "center", gap: 12 }}
                  >
                    <ViewfinderCircleIcon color={color.brandText} size={SHEET_ICON} strokeWidth={1.5} />
                    <Text fontSize="text-md" fontWeight="font-semibold" tone="brand">
                      Use current location
                    </Text>
                  </TouchableOpacity>
                  {divider}

                  {loading ? (
                    <Text fontSize="text-sm" tone="body">
                      Loading nearby places...
                    </Text>
                  ) : (
                    <ScrollView
                      keyboardShouldPersistTaps="handled"
                      contentContainerStyle={{ gap: SHEET_GAP }}
                    >
                      {nearbyPlaces.map((item) => (
                        <NearbyPlaceRow
                          key={item.place_id}
                          name={item.name}
                          vicinity={item.vicinity}
                          onPress={() => handleSelectNearbyPlace(item)}
                        />
                      ))}
                    </ScrollView>
                  )}
                </View>
              </BottomSheetView>
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
            maxDaysAhead={BOOKING_DAYS_AHEAD}
          />
        )}
      </NonScrollableContainer>
    </GestureHandlerRootView>
  );
}
