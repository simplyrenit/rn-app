import { localityFor } from "@/backend/list-flow/pickup-location";
import useAddresses from "@/backend/useAddresses";
import {
  AddressPickerSheet,
  AddressPickerSheetHandle,
} from "@/components/addresses/address-picker-sheet";
import { PickupField } from "@/components/addresses/pickup-field";
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
import { PickedAddress, pickupAfterPick } from "@/lib/addresses";
import { parseQuantity, parseWorth, MAX_QUANTITY_DIGITS, WORTH_HINT } from "@/lib/list-flow/stock";
import type { LocationValue } from "@/lib/list-flow/types";
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
import { useTypedNavigation } from "@/lib/types";
import { MaterialIcons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import { Pressable, TextInput, TouchableOpacity, View } from "react-native";
import { AppSwitch } from "@/components/core/switch";
import { PlanPricing } from "@/components/post/plan-pricing";
import { DraftPlan, toPlans } from "@/lib/plans";
import CountryPicker, { DARK_THEME, Flag } from "react-native-country-picker-modal";
import { Dropdown as RNEDropdown } from "react-native-element-dropdown";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronDownIcon } from "react-native-heroicons/outline";

export type ContactPerson = "Owner" | "Other";

/**
 * Everything this form collects.
 *
 * Only the edit-listing screen uses it now (the create flow is the photo-first
 * `list-flow`), and it PATCHes them; the form hands the whole set over and
 * takes no view on where it goes.
 */
export interface AboutProductValues {
  productName: string;
  brandName: string;
  modelName: string;
  /** One of the `CONDITION_OPTIONS` values: always lower case. */
  condition: string;
  productDescription: string;
  usageDescription: string;
  /** ENG-281: how it is rented and for how much, as typed. */
  plans: DraftPlan[];
  securityDeposit: string;
  /** ENG-155: units the owner has, what the item costs to replace, and the one per-product delivery exception. */
  quantity: string;
  worth: string;
  notDelivered: boolean;
  /**
   * ENG-419: the pickup, as the listing flow holds it — the public place line
   * (`locality`), the pin, and the owner-only flat and landmark. Null while the
   * listing has no pin. Only what the owner picked: the form never reads the
   * device, so opening it elsewhere cannot move the listing.
   */
  pickup: LocationValue | null;
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
  /**
   * What the owner still has to do here (ENG-155): a moved listing's price wants
   * confirming (saving the form does it), and one with no worth needs one.
   */
  prompts?: { confirmPrice?: boolean; needsWorth?: boolean };
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


const isNonNegativeAmount = (value: string) =>
  /^\d+(\.\d{1,2})?$/.test(value) && Number(value) >= 0;

const digitsOnly = (value: string) => value.replace(/[^\d.]/g, "");

/**
 * The product form behind "Edit product details". Until ENG-10 it was shared
 * with "Tell us about your product", step 3 of the old create wizard.
 *
 * These were two 800-line copies of one screen that had drifted 439 lines
 * apart: a fix for the iOS address format, a clearing branch on the location
 * picker, a named "still needed" footer and sentence-case labels had each
 * landed on one twin only. The screens now keep their own header, submit and
 * navigation and share everything between.
 */
export function AboutProductForm({
  initialValues,
  prompts,
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
  const [plans, setPlans] = useState<DraftPlan[]>(
    initialValues?.plans ?? [{ unit: "day", price: "", min: 1 }]
  );
  const [securityDeposit, setSecurityDeposit] = useState(
    initialValues?.securityDeposit ?? ""
  );
  const [quantity, setQuantity] = useState(initialValues?.quantity ?? "1");
  const [worth, setWorth] = useState(initialValues?.worth ?? "");
  const [notDelivered, setNotDelivered] = useState(initialValues?.notDelivered ?? false);

  // Condition is a select, not a TextInput, so it tracks its own focus rather
  // than getting one for free from TextField. Same for the two currency fields
  // and the phone number, which wrap a bare TextInput to fit an adornment in.
  const [conditionFocus, setConditionFocus] = useState(false);
  const [depositFocus, setDepositFocus] = useState(false);
  const [worthFocus, setWorthFocus] = useState(false);
  const [quantityFocus, setQuantityFocus] = useState(false);
  const [phoneFocus, setPhoneFocus] = useState(false);

  const [contactPerson, setContactPerson] = useState<ContactPerson | null>(
    initialValues?.contactPerson ?? null
  );
  const [otherName, setOtherName] = useState(initialValues?.otherName ?? "");
  const [otherPhoneNumber, setOtherPhoneNumber] = useState(
    initialValues?.otherPhoneNumber ?? ""
  );

  const [pickup, setPickup] = useState<LocationValue | null>(initialValues?.pickup ?? null);
  const addressSheet = useRef<AddressPickerSheetHandle>(null);
  const { addresses, loading: addressesLoading } = useAddresses();
  // The listing's pickup is there from the start, and may turn out to be a
  // saved address: until the list is in, PickupField holds back the flat field
  // that a card would replace. A list that never arrives must not hide it for
  // good, so the wait ends, as on the listing flow's Review.
  const [addressWaitOver, setAddressWaitOver] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setAddressWaitOver(true), 4000);
    return () => clearTimeout(timer);
  }, []);
  const addressesSettled = !addressesLoading || addressWaitOver;

  const [submitting, setSubmitting] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const [country, setCountry] = useState<{
    cca2: any;
    callingCode: string;
  }>({ cca2: "IN", callingCode: "91" });

  const conditionSurface = useFieldSurfaceStyle({
    focused: conditionFocus,
    // This component renders the FieldFrame, so it cannot read it.
    frame: true,
  });

  // The listing flow's pickup, rule for rule (ENG-419): a saved address brings
  // its own flat and landmark, a spot on the map keeps only text the owner
  // typed for a one-off spot. The saved address itself is never written here.
  const onPickAddress = (picked: PickedAddress) => {
    setPickup((current) => pickupAfterPick(current, picked, addresses));
  };

  const openLocationPicker = () => {
    // The sheet, unless the owner is known to have nothing saved: then the map
    // opens directly, as on Review. "Still loading" is not "none".
    if (addressesLoading || addresses.length > 0) {
      addressSheet.current?.present();
      return;
    }
    navigation.navigate("LocationModal", {
      requestId: createLocationRequest(async (coords) => {
        // The picker's "skip" is not a request to forget the pickup.
        if (!coords) return;
        // Never the picker's street-level line: `location` is public.
        const locality = (await localityFor(coords.latitude, coords.longitude)) ?? "";
        if (!mounted.current) return;
        const spot = { lat: coords.latitude, long: coords.longitude, locality, addressLine1: "", addressLine2: "" };
        setPickup((current) => pickupAfterPick(current, spot, addresses));
      }),
    });
  };

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
    toPlans(plans) === null && "a price",
    !isNonNegativeAmount(securityDeposit) && "a security deposit",
    parseWorth(worth) === null && "what it is worth",
    parseQuantity(quantity) === null && "how many you have",
    // As at listing: a pin with no name would reach the server as an empty
    // public `location`. The flat line is the owner's to leave out.
    !pickup?.locality.trim() && "a pickup location",
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
        plans,
        securityDeposit,
        quantity,
        worth,
        notDelivered,
        pickup,
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

  // Listings are priced in rupees (the listing flow sends INR). The glyph used
  // to follow the country the map named, which only the old picker reported.
  const currencyAdornment = (
    <MaterialIcons name="currency-rupee" color={color.brandText} size={20} />
  );

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
      {prompts?.confirmPrice || prompts?.needsWorth ? (
        <View
          accessibilityLiveRegion="polite"
          style={{
            marginBottom: density.fieldGap,
            padding: space.md,
            borderRadius: radius.group,
            backgroundColor: color.warningWash,
            gap: 2,
          }}
        >
          {prompts?.confirmPrice ? (
            <Text fontSize="text-sm" tone="warning">
              <Text fontSize="text-sm" fontWeight="font-bold" tone="warning">
                Confirm your prices.{" "}
              </Text>
              Check each is what a renter pays, then update the product.
            </Text>
          ) : null}
          {prompts?.needsWorth ? (
            <Text fontSize="text-sm" tone="warning">
              <Text fontSize="text-sm" fontWeight="font-bold" tone="warning">
                Worth is missing.{" "}
              </Text>
              Add what it would cost to replace. It is needed to publish.
            </Text>
          ) : null}
        </View>
      ) : null}

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

      {/* ENG-419: the listing flow's pickup, so editing offers the saved
          addresses that listing did. The save-this-spot offer is left out
          (addressesKnown false): it saves on publish, and an edit has none;
          the sheet's "Add new address" saves one. */}
      <PickupField
        location={pickup}
        addresses={addresses}
        addressesKnown={false}
        addressesSettled={addressesSettled}
        saveAs={null}
        onChange={openLocationPicker}
        onChangeFlat={(text) => setPickup((current) => current && { ...current, fullAddress: text })}
        onSaveAs={() => {}}
      />

      <View style={{ marginBottom: density.fieldGap }}>
        <PlanPricing value={plans} onChange={setPlans} showErrors currency={currencyAdornment ?? undefined} />
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
          label="Worth"
          required
          hint={WORTH_HINT}
        />
        <FieldShell focused={worthFocus}>
          {currencyAdornment}
          <TextInput
            accessibilityLabel="Worth"
            placeholder="e.g. 45000"
            placeholderTextColor={color.placeholder}
            keyboardType="numeric"
            value={worth}
            onChangeText={(value) => setWorth(digitsOnly(value))}
            onFocus={() => setWorthFocus(true)}
            onBlur={() => setWorthFocus(false)}
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
          label="In stock"
          required
          hint="How many of this item you have to rent out"
        />
        <FieldShell focused={quantityFocus}>
          <TextInput
            accessibilityLabel="In stock"
            placeholder="1"
            placeholderTextColor={color.placeholder}
            keyboardType="number-pad"
            maxLength={MAX_QUANTITY_DIGITS}
            value={quantity}
            onChangeText={(value) => setQuantity(value.replace(/\D/g, ""))}
            onFocus={() => setQuantityFocus(true)}
            onBlur={() => setQuantityFocus(false)}
            style={{
              flex: 1,
              color: color.text,
              fontFamily: fontFamily.regular,
              fontSize: fontSize.md,
            }}
          />
        </FieldShell>
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: space.md,
          marginBottom: density.fieldGap,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text fontSize="text-md" fontWeight="font-bold">
            This product is not delivered
          </Text>
          <Text fontSize="text-xs" tone="body">
            Even if you deliver, this one is for pickup only.
          </Text>
        </View>
        <AppSwitch
          accessibilityLabel="This product is not delivered"
          value={notDelivered}
          onValueChange={setNotDelivered}
          trackColor={{ true: color.brand, false: color.inputLine }}
          thumbColor="#FFFFFF"
        />
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
    {/* Outside the scroll view, as on Review: the sheet is a portal. */}
    <AddressPickerSheet ref={addressSheet} selected={pickup ?? undefined} onPick={onPickAddress} />
    </FieldFrame>
  );
}
