import {
  Button,
  FieldFrame,
  FieldLabel,
  FieldShell,
  Text,
  TextField,
  useFieldSurfaceStyle,
} from "@/components/core";
import { SegmentedChoice } from "@/components/core/segmented-choice";
import { createLocationRequest } from "@/lib/location-request";
import {
  MIN_TOUCH_TARGET,
  SCREEN_GUTTER,
  density,
  fontFamily,
  fontSize,
  radius,
  space,
} from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";
import { useTypedNavigation } from "@/lib/types";
import { MaterialIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, TextInput, TouchableOpacity, View } from "react-native";
import CountryPicker, { DARK_THEME, Flag } from "react-native-country-picker-modal";
import { Dropdown as RNEDropdown } from "react-native-element-dropdown";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ChevronDownIcon,
  MapPinIcon,
  PencilSquareIcon,
} from "react-native-heroicons/outline";

/** A map pin, in the shape the backend and the product context both speak. */
export interface ProductPoint {
  lat: number;
  long: number;
}

export type ContactPerson = "Owner" | "Other";

/**
 * Everything this form collects.
 *
 * The two screens that use it persist these differently — the create flow puts
 * them in the product context and moves on, the edit screen PATCHes them — so
 * the form hands the whole set over and takes no view on where it goes.
 */
export interface AboutProductValues {
  productName: string;
  brandName: string;
  modelName: string;
  /** One of the `CONDITION_OPTIONS` values: always lower case. */
  condition: string;
  productDescription: string;
  usageDescription: string;
  pricePerDay: string;
  securityDeposit: string;
  /** Flat/building/landmark — the part a map cannot tell a renter. */
  address: string;
  /** The pin the customer chose, else the device, else the owner's saved point. */
  coordinates: ProductPoint | null;
  /** Reverse-geocoded label for `coordinates`, when we managed to resolve one. */
  locationName: string | null;
  contactPerson: ContactPerson | null;
  otherName: string;
  otherPhoneNumber: string;
  /**
   * Dialling code chosen beside the phone number, without the "+".
   *
   * Neither screen sends this to the backend today (see the report for phase 8);
   * it is surfaced here so a caller can start to without reaching into the form.
   */
  callingCode: string;
}

interface Props {
  /** Pre-fill. Absent keys start empty, which is what the create flow wants. */
  initialValues?: Partial<AboutProductValues>;
  submitLabel: string;
  /**
   * Rendered to the right of the submit label. Receives the colour the label
   * resolved to, so an icon beside it cannot drift out of step with it.
   */
  submitAccessory?: (color: string) => React.ReactNode;
  /**
   * May return a promise. The form awaits it and holds the button in its
   * loading state for the duration, so a caller cannot forget to say it is
   * busy — the previous `submitting` prop was passed by one of the two screens
   * and was only harmless on the other because that submit happened to be
   * synchronous.
   */
  onSubmit: (values: AboutProductValues) => void | Promise<void>;
}

const CONDITION_OPTIONS = [
  { label: "Excellent", value: "excellent" },
  { label: "Good", value: "good" },
  { label: "Fair", value: "fair" },
];

/**
 * Currency glyph per country.
 *
 * Two vocabularies reach this map and both have to work: the location picker
 * hands back an address whose last component is a short form ("USA", "UK"),
 * while `reverseGeocodeAsync` returns the long form ("United States"). The
 * create twin only knew the short forms and so showed no currency glyph at all
 * for a US listing whose country came from the geocoder.
 *
 * An unlisted country renders no glyph, which is what both twins did before.
 */
const CURRENCY_ICON: Record<
  string,
  React.ComponentProps<typeof MaterialIcons>["name"]
> = {
  India: "currency-rupee",
  USA: "attach-money",
  "United States": "attach-money",
  UK: "currency-pound",
  "United Kingdom": "currency-pound",
};

const SUPPORTED_COUNTRIES = ["USA", "UK", "India"];

const isPositiveAmount = (value: string) =>
  /^\d+(\.\d{1,2})?$/.test(value) && Number(value) > 0;
const isNonNegativeAmount = (value: string) =>
  /^\d+(\.\d{1,2})?$/.test(value) && Number(value) >= 0;

const digitsOnly = (value: string) => value.replace(/[^\d.]/g, "");

/**
 * The product form shared by "Tell us about your product" (step 3 of the post
 * flow) and "Edit product details".
 *
 * These were two 800-line copies of one screen that had drifted 439 lines
 * apart: a fix for the iOS address format, a clearing branch on the location
 * picker, a named "still needed" footer and sentence-case labels had each
 * landed on one twin only. The screens now keep their own header, submit and
 * navigation and share everything between.
 */
export function AboutProductForm({
  initialValues,
  submitLabel,
  submitAccessory,
  onSubmit,
}: Props) {
  const navigation = useTypedNavigation();
  const { color, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [productName, setProductName] = useState(
    initialValues?.productName ?? ""
  );
  const [brandName, setBrandName] = useState(initialValues?.brandName ?? "");
  const [modelName, setModelName] = useState(initialValues?.modelName ?? "");
  const [condition, setCondition] = useState(initialValues?.condition ?? "");
  const [productDescription, setProductDescription] = useState(
    initialValues?.productDescription ?? ""
  );
  const [usageDescription, setUsageDescription] = useState(
    initialValues?.usageDescription ?? ""
  );
  const [pricePerDay, setPricePerDay] = useState(
    initialValues?.pricePerDay ?? ""
  );
  const [securityDeposit, setSecurityDeposit] = useState(
    initialValues?.securityDeposit ?? ""
  );
  const [address, setAddress] = useState(initialValues?.address ?? "");

  // Condition is a select, not a TextInput, so it tracks its own focus rather
  // than getting one for free from TextField. Same for the two currency fields
  // and the phone number, which wrap a bare TextInput to fit an adornment in.
  const [conditionFocus, setConditionFocus] = useState(false);
  const [priceFocus, setPriceFocus] = useState(false);
  const [depositFocus, setDepositFocus] = useState(false);
  const [phoneFocus, setPhoneFocus] = useState(false);

  const [contactPerson, setContactPerson] = useState<ContactPerson | null>(
    initialValues?.contactPerson ?? null
  );
  const [otherName, setOtherName] = useState(initialValues?.otherName ?? "");
  const [otherPhoneNumber, setOtherPhoneNumber] = useState(
    initialValues?.otherPhoneNumber ?? ""
  );

  /**
   * The pin, and nothing but the pin.
   *
   * This used to be three sources ranked by preference — an explicit pin, then
   * the device's own position, then the owner's saved profile point — and the
   * lower two were the bug. The edit twin let a mount-time
   * `getCurrentPositionAsync` overwrite a saved pin, so an owner opening the
   * screen in a different city and pressing Update moved their listing to
   * wherever they were standing. Demoting the device below an explicit pin
   * fixed only the route that bug was first found on: clearing the pin, or
   * opening a listing stored at 0/0, dropped straight through to the device
   * again, with the field reading empty and validation passing anyway.
   *
   * So there is one source. A listing's coordinates are what the customer
   * pinned in the picker, or the coordinates it was already saved with. The
   * form does not read the device at all, and never writes a coordinate the
   * customer cannot see in the field above the button.
   */
  const [pinnedLocation, setPinnedLocation] = useState<ProductPoint | null>(
    initialValues?.coordinates ?? null
  );
  const [locationName, setLocationName] = useState<string | null>(
    initialValues?.locationName ?? null
  );

  const [submitting, setSubmitting] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const [productCountry, setProductCountry] = useState("India");
  const [country, setCountry] = useState<{
    cca2: any;
    callingCode: string;
  }>({ cca2: "IN", callingCode: "91" });

  const conditionSurface = useFieldSurfaceStyle({
    focused: conditionFocus,
    // This component renders the FieldFrame, so it cannot read it.
    frame: true,
  });
  const currencyIcon = CURRENCY_ICON[productCountry];

  /**
   * What the location field shows.
   *
   * Never empty while a pin exists. Reverse geocoding is a network call and it
   * fails; when it does we show the coordinate itself rather than the "Pin the
   * location on a map" placeholder, because a placeholder over a real pin is
   * how the field came to disagree with the validation beside it.
   */
  const locationLabel = useMemo(() => {
    if (locationName) return locationName;
    if (!pinnedLocation) return null;
    return `${pinnedLocation.lat.toFixed(5)}, ${pinnedLocation.long.toFixed(5)}`;
  }, [locationName, pinnedLocation]);

  /**
   * Turn a coordinate into something a person can read.
   *
   * `formattedAddress` is Android-only in expo-location, so the iOS branch has
   * to compose the line itself. The edit twin had that branch commented out and
   * so showed the bare fallback join on iOS.
   */
  const describeCoordinates = useCallback(
    async (point: ProductPoint) => {
      try {
        const results = await Location.reverseGeocodeAsync({
          latitude: point.lat,
          longitude: point.long,
        });

        if (results.length === 0) {
          return;
        }

        const {
          name,
          street,
          streetNumber,
          district,
          city,
          region,
          postalCode,
          country: geocodedCountry,
        } = results[0];

        let formatted = "";

        if (Platform.OS === "ios") {
          formatted = [
            [streetNumber, street].filter(Boolean).join(" "),
            [district, city].filter(Boolean).join(", "),
            [region, postalCode].filter(Boolean).join(" "),
          ]
            .filter(Boolean)
            .join(", ");
        } else {
          formatted = results[0].formattedAddress || "";
        }

        if (!formatted) {
          formatted = [name, street, city, region, geocodedCountry]
            .filter(Boolean)
            .join(", ");
        }

        setLocationName(formatted);

        if (geocodedCountry) {
          setProductCountry(geocodedCountry);
        }
      } catch (error) {
        // A pin we cannot name is still a valid pin; leave the coordinate be.
        console.error(error);
      }
    },
    []
  );

  const handleLocationPicked = useCallback(
    (
      coords: { latitude: number; longitude: number } | null,
      pickedAddress: string | null
    ) => {
      // A null result means the customer cleared the pin. The edit twin
      // returned early here and kept showing the old one.
      if (!coords) {
        setPinnedLocation(null);
        setLocationName(null);
        return;
      }

      setPinnedLocation({ lat: coords.latitude, long: coords.longitude });
      setLocationName(pickedAddress);

      if (!pickedAddress) {
        return;
      }

      const parts = pickedAddress.split(",");
      const pickedCountry = parts[parts.length - 1].trim();

      if (!SUPPORTED_COUNTRIES.includes(pickedCountry)) {
        toast.error("Country not supported!", {
          message: "We are currently only available in India, USA and UK",
        });
        return;
      }

      setProductCountry(pickedCountry);
    },
    []
  );

  const openLocationPicker = () => {
    navigation.navigate("LocationModal", {
      requestId: createLocationRequest(handleLocationPicked),
    });
  };

  // A pin handed in without a label — the saved coordinates of a product being
  // edited — gets named once, so the field does not read "Pin the location on a
  // map" for a product that already has one.
  useEffect(() => {
    if (initialValues?.coordinates && !initialValues?.locationName) {
      describeCoordinates(initialValues.coordinates);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * What is still missing, named.
   *
   * There are eight required fields spread over three screens of scroll, and
   * the footer only said "Fill in every required field to continue" — so the
   * customer had to hunt for the one they had skipped. The edit twin never got
   * this and still disables its button silently.
   */
  const missingFields = [
    !productName.trim() && "a product name",
    !condition && "a condition",
    !productDescription.trim() && "a description",
    !isPositiveAmount(pricePerDay) && "a price per day",
    !isNonNegativeAmount(securityDeposit) && "a security deposit",
    !address.trim() && "a landmark",
    !pinnedLocation && "a location on the map",
    !(
      contactPerson === "Owner" ||
      (otherName.trim() && otherPhoneNumber.trim())
    ) && "a contact person",
  ].filter(Boolean) as string[];

  const allFieldsFilled = missingFields.length === 0;

  const missingLabel =
    missingFields.length === 0
      ? ""
      : missingFields.length === 1
      ? `Still needed: ${missingFields[0]}`
      : missingFields.length <= 3
      ? `Still needed: ${missingFields.slice(0, -1).join(", ")} and ${
          missingFields[missingFields.length - 1]
        }`
      : `Still needed: ${missingFields.length} fields, starting with ${missingFields[0]}`;

  // Mirrors the disabled treatment inside Button, so an accessory rendered
  // beside the label is tinted with the label and not against it.
  const submitLabelColor =
    allFieldsFilled && !submitting ? color.onBrand : color.textDim;

  const handleSubmit = async () => {
    if (!allFieldsFilled || submitting) return;

    setSubmitting(true);

    try {
      await onSubmit({
        productName,
        brandName,
        modelName,
        condition,
        productDescription,
        usageDescription,
        pricePerDay,
        securityDeposit,
        address: address.trim(),
        coordinates: pinnedLocation,
        locationName,
        contactPerson,
        otherName,
        otherPhoneNumber,
        callingCode: country.callingCode,
      });
    } catch (error) {
      // The screen owns the customer-facing message. This only stops a
      // rejected submit from escaping as an unhandled promise rejection,
      // which is what would happen now that the press handler is async.
      console.error("Could not submit the product form:", error);
    } finally {
      // A successful submit navigates away on both screens, so this would
      // otherwise be a setState on an unmounted component.
      if (mounted.current) {
        setSubmitting(false);
      }
    }
  };

  const currencyAdornment = currencyIcon ? (
    <MaterialIcons name={currencyIcon} color={color.brandText} size={20} />
  ) : null;

  return (
    <FieldFrame>
    <KeyboardAwareScrollView
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      // The keyboard covered whichever field a customer tapped, and the
      // primary CTA below it, on the two longest forms in the app — a
      // plain ScrollView does not scroll a focused input into view for you.
      enableOnAndroid
      extraScrollHeight={space.md}
      contentContainerStyle={{
        paddingHorizontal: SCREEN_GUTTER,
        paddingTop: space.md,
        paddingBottom: insets.bottom + space.xl,
      }}
    >
      <TextField
        label="Product name"
        required
        hint="Short and recognisable — “MacBook Air”, not a spec sheet"
        placeholder="e.g. MacBook Air"
        value={productName}
        onChangeText={setProductName}
      />

      <TextField
        label="Brand name"
        placeholder="e.g. Apple"
        value={brandName}
        onChangeText={setBrandName}
      />

      <TextField
        label="Model name/number"
        placeholder="e.g. MacBook Air 2024"
        value={modelName}
        onChangeText={setModelName}
      />

      <View style={{ marginBottom: density.fieldGap }}>
        <FieldLabel label="Condition" required />
        {/* Same surface tokens as every TextField beside it, with the
            border answering focus the way the rest of this screen's
            fields do — a select is not exempt from the one field look. */}
        <RNEDropdown
          onFocus={() => setConditionFocus(true)}
          onBlur={() => setConditionFocus(false)}
          style={{ ...conditionSurface, height: conditionSurface.minHeight }}
          activeColor={color.surfaceRaised}
          containerStyle={{
            marginTop: space.sm,
            backgroundColor: color.surface,
            borderRadius: radius.group,
            // The border colour was set without a width, so the list floated
            // over the canvas with no edge at all.
            borderWidth: 1,
            borderColor: color.inputLine,
            overflow: "hidden",
          }}
          itemTextStyle={{
            color: color.text,
            fontFamily: fontFamily.regular,
            fontSize: fontSize.md,
          }}
          itemContainerStyle={{
            borderBottomWidth: 1,
            borderBottomColor: color.line,
          }}
          placeholderStyle={{
            color: color.placeholder,
            fontFamily: fontFamily.regular,
            fontSize: fontSize.md,
          }}
          selectedTextStyle={{
            color: color.text,
            fontFamily: fontFamily.regular,
            fontSize: fontSize.md,
          }}
          inputSearchStyle={{
            height: MIN_TOUCH_TARGET,
            fontSize: fontSize.md,
            fontFamily: fontFamily.regular,
            borderRadius: radius.input,
            color: color.text,
          }}
          iconStyle={{ marginRight: space.sm }}
          iconColor={color.textBody}
          data={CONDITION_OPTIONS}
          labelField="label"
          valueField="value"
          value={condition}
          onChange={(item) => setCondition(item.value)}
          renderItem={(item) => (
            <View
              style={{
                // 12 to sit under the field's own text: that inset lives in
                // `useFieldSurfaceStyle` and the space scale has no 12 step.
                paddingHorizontal: 12,
                paddingVertical: space.md,
              }}
            >
              <Text>{item.label}</Text>
            </View>
          )}
          placeholder="Select Condition"
        />
      </View>

      <TextField
        label="Product description"
        required
        hint="What it is, what’s included, anything to watch for"
        placeholder="What it is, what condition it’s in, what’s included"
        value={productDescription}
        onChangeText={setProductDescription}
        multiline
      />

      <TextField
        label="Usage description"
        hint="Show a renter how to use it"
        placeholder="Setup, handling, anything easy to get wrong"
        value={usageDescription}
        onChangeText={setUsageDescription}
        multiline
      />

      <View style={{ marginBottom: density.fieldGap }}>
        <FieldLabel label="Product location" required />
        <TouchableOpacity
          onPress={openLocationPicker}
          accessibilityRole="button"
          accessibilityLabel={locationLabel ?? "Pin the location on a map"}
        >
          <FieldShell>
            <MapPinIcon color={color.text} size={24} />
            <View style={{ flex: 1 }}>
              {locationLabel ? (
                <Text fontSize="text-xs" numberOfLines={1} ellipsizeMode="tail">
                  {locationLabel}
                </Text>
              ) : (
                <Text fontSize="text-sm" tone="dim">
                  Pin the location on a map
                </Text>
              )}
            </View>
            {locationLabel ? (
              <PencilSquareIcon color={color.text} size={24} />
            ) : null}
          </FieldShell>
        </TouchableOpacity>
      </View>

      {/* The map pin above sets the location that drives discovery. This
          field is the detail a renter needs once they are on the street —
          labelled as such, rather than as a second, free-text "address"
          competing with the picker. */}
      <TextField
        label="Flat, building and landmark"
        required
        hint="The bit a map can’t tell them — floor, building name, the shop opposite."
        placeholder="e.g. 2nd floor, Sunrise Apartments, opposite the bakery"
        value={address}
        onChangeText={setAddress}
        multiline
      />

      <View style={{ marginBottom: density.fieldGap }}>
        <FieldLabel
          label="Price per day"
          required
          hint="What a renter pays per day"
        />
        <FieldShell focused={priceFocus}>
          {currencyAdornment}
          <TextInput
            accessibilityLabel="Price per day"
            placeholder="e.g. 1200"
            keyboardType="numeric"
            value={pricePerDay}
            onChangeText={(value) => setPricePerDay(digitsOnly(value))}
            placeholderTextColor={color.placeholder}
            onFocus={() => setPriceFocus(true)}
            onBlur={() => setPriceFocus(false)}
            style={{
              flex: 1,
              color: color.text,
              fontFamily: fontFamily.regular,
              fontSize: fontSize.md,
            }}
          />
        </FieldShell>
      </View>

      <View style={{ marginBottom: density.fieldGap }}>
        <FieldLabel
          label="Security deposit"
          required
          hint="Refunded when the item comes back"
        />
        <FieldShell focused={depositFocus}>
          {currencyAdornment}
          <TextInput
            accessibilityLabel="Security deposit"
            placeholder="e.g. 2500"
            placeholderTextColor={color.placeholder}
            keyboardType="numeric"
            value={securityDeposit}
            onChangeText={(value) => setSecurityDeposit(digitsOnly(value))}
            onFocus={() => setDepositFocus(true)}
            onBlur={() => setDepositFocus(false)}
            style={{
              flex: 1,
              color: color.text,
              fontFamily: fontFamily.regular,
              fontSize: fontSize.md,
            }}
          />
        </FieldShell>
      </View>

      <View style={{ marginBottom: density.fieldGap }}>
        <FieldLabel
          label="Who should renters contact?"
          required
          hint="Who answers questions and hands the item over"
        />

        <SegmentedChoice
          accessibilityLabel="Who should renters contact?"
          value={contactPerson}
          onChange={(next) => {
            setContactPerson(next);
            if (next === "Owner") {
              setOtherName("");
              setOtherPhoneNumber("");
            }
          }}
          options={[
            { value: "Owner", label: "Me", hint: "Use my details" },
            {
              value: "Other",
              label: "Someone else",
              hint: "Add their details",
            },
          ]}
        />

        {contactPerson === "Other" ? (
          <View>
            <View style={{ marginTop: density.fieldGap }}>
              <TextField
                label="Name"
                required
                placeholder="Enter name"
                value={otherName}
                onChangeText={setOtherName}
              />
            </View>

            <View>
              <FieldLabel label="Phone number" required />
              <View style={{ flexDirection: "row", gap: space.sm }}>
                <FieldShell
                  style={{ flex: 0.5, justifyContent: "center" }}
                >
                  {/* The library's own filter sheet, which honours DARK_THEME.
                      The create twin replaced it with a hand-rolled TextInput
                      that carried a hardcoded black border and no placeholder
                      colour, so it was invisible in dark mode. */}
                  <CountryPicker
                    {...(isDark && { theme: DARK_THEME })}
                    withFlag
                    withCallingCode
                    withFilter
                    withCallingCodeButton
                    renderFlagButton={({ onOpen }) => (
                      <Pressable
                        onPress={onOpen}
                        accessibilityRole="button"
                        accessibilityLabel="Change country dialling code"
                        // The chevron is the affordance people aim at, so it
                        // belongs inside the target rather than beside it: it
                        // used to sit outside this Pressable as a sibling, so
                        // tapping it did nothing and the only live target was
                        // 16pt of flag, well under the 44pt floor.
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: space.xs,
                          minHeight: MIN_TOUCH_TARGET,
                          minWidth: MIN_TOUCH_TARGET,
                        }}
                      >
                        <Flag countryCode={country.cca2} flagSize={16} />
                        <ChevronDownIcon size={16} color={color.text} />
                      </Pressable>
                    )}
                    countryCode={country.cca2}
                    onSelect={(selected) => {
                      setCountry({
                        cca2: selected.cca2,
                        callingCode: selected.callingCode[0],
                      });
                    }}
                  />
                </FieldShell>

                <FieldShell focused={phoneFocus} style={{ flex: 1 }}>
                  <Text>+{country.callingCode}</Text>
                  <TextInput
                    accessibilityLabel="Phone number"
                    maxLength={10}
                    placeholder="Enter phone number"
                    value={otherPhoneNumber}
                    keyboardType="number-pad"
                    onChangeText={setOtherPhoneNumber}
                    placeholderTextColor={color.placeholder}
                    onFocus={() => setPhoneFocus(true)}
                    onBlur={() => setPhoneFocus(false)}
                    style={{
                      flex: 1,
                      color: color.text,
                      fontFamily: fontFamily.regular,
                      fontSize: fontSize.md,
                    }}
                  />
                </FieldShell>
              </View>
            </View>
          </View>
        ) : null}
      </View>

      {/* One disabled treatment, and it says why it is disabled rather
          than leaving the customer to guess which field is missing. */}
      {!allFieldsFilled ? (
        <Text
          fontSize="text-sm"
          tone="dim"
          style={{ textAlign: "center", marginBottom: space.sm }}
        >
          {missingLabel}
        </Text>
      ) : null}

      <Button
        disabled={!allFieldsFilled}
        loading={submitting}
        onPress={handleSubmit}
      >
        <Text
          fontWeight="font-bold"
          fontSize="text-md"
          style={{ color: submitLabelColor }}
        >
          {submitLabel}
        </Text>
        {submitAccessory?.(submitLabelColor)}
      </Button>
    </KeyboardAwareScrollView>
    </FieldFrame>
  );
}
