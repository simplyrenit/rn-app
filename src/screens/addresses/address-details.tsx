import { placeFor } from "@/backend/list-flow/pickup-location";
import useAddresses from "@/backend/useAddresses";
import {
  BottomBar,
  Chip,
  FieldError,
  FieldLabel,
  MapPlaceholder,
  Skeleton,
  SubpageHeader,
  Text,
  TextField,
} from "@/components/core";
import { CheckBox } from "@/components/core/checkbox";
import { ConfirmSheet } from "@/components/core/confirm-sheet";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { AddressPayload, AddressType, addressTitle, takenTypes, validPin } from "@/lib/addresses";
import { SCREEN_GUTTER, density, radius, space } from "@/lib/design-tokens";
import {
  cancelLocationRequest,
  createLocationRequest,
  resolveLocationRequest,
} from "@/lib/location-request";
import { useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";
import { RouteProps, useTypedNavigation } from "@/lib/types";
import {
  ADDRESS_NOT_FOUND,
  ADDRESS_UNAVAILABLE,
} from "@/screens/post-screens/location-modal";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useRoute } from "@react-navigation/native";
import darkModeMapStyle from "assets/mapJSON/darkModeMapStyle.json";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, TouchableOpacity, View } from "react-native";
import { TrashIcon } from "react-native-heroicons/outline";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";

// Figma 2089:31157 / 2089:31227: a 24pt column, 16 under the top bar, 24
// between blocks. A TextField brings its own 18 below it, so it takes 6 more.
const CONTENT_TOP = 16;
const BLOCK_GAP = 24;
const FIELD_EXTRA = BLOCK_GAP - density.fieldGap;
/** The location card: r12, the 120 map, then 12/16/16 around the place name. */
const MAP_HEIGHT = 120;
/** "Change", kept from the hidden old map layer: 78×32 at 12 from the top and right. */
const CHANGE_INSET = 12;
/** "Save as": chips 8 apart, a taken chip's hint 8 under its row. */
const CHIP_GAP = 8;
const HINT_HEIGHT = 16;
/** The checkbox's 44 target is 10 taller than the 24 row it sits in. */
const CHECK_OVERHANG = 10;

/**
 * Dev-only design seed (ENG-429): names the pin without the geocoder (bare
 * Google axios and `expo-location`), and draws the kit map tile for the map.
 * Only DevFixture passes it.
 */
export type AddressDetailsDesign = {
  place: { locality: string; postalCode?: string };
};
/** A few streets around the pin: enough to recognise the spot, not the city. */
const PREVIEW_DELTA = 0.005;
const NAME_MAX = 30;
const TAKEN_HINT = "Already saved";
const GONE_MESSAGE = "This address no longer exists.";

/**
 * A failed save or delete. The server's own sentence is shown when it sent
 * one ("You can save up to 20 addresses."): "Try again" would be advice that
 * cannot work.
 */
function toastFailure(what: string, error: any) {
  const reason = error?.response?.data?.non_field_errors?.[0];
  if (typeof reason === "string" && reason) toast.error(what, { message: reason });
  else toast.error(`${what}. Try again.`);
}

/**
 * A-02 (ENG-25 §8.3): add an address from a pin the map just gave, or edit a
 * saved one. Default and Delete live here, not on the list rows (D9).
 */
export default function AddressDetailsScreen() {
  const navigation = useTypedNavigation();
  const route = useRoute<RouteProps<"AddressDetails">>();
  const { address: editing, requestId } = route.params;
  const design = __DEV__
    ? (route.params as { design?: AddressDetailsDesign }).design
    : undefined;
  const { color, isDark } = useTheme();
  const { addresses, loading, isError, create, update, remove } = useAddresses();

  // One of the two always arrives: the list passes `address`, the add flow `pin`.
  const [pin, setPin] = useState(
    () =>
      route.params.pin ?? {
        lat: editing!.coordinates.lat,
        long: editing!.coordinates.long,
        address: editing!.address as string | null,
      }
  );

  // A saved address brings its locality. A fresh pin has to be named, and so
  // does a row from before the `locality` column existed, which comes back blank.
  const [locality, setLocality] = useState<string | null>(
    route.params.pin ? null : editing?.locality || null
  );
  const [naming, setNaming] = useState(!locality);

  // ENG-284 D4: the PIN code, prefilled from the geocoder and editable, because
  // geocoders get it wrong near area borders and a wrong PIN can cost delivery.
  // Sent only when it is six digits; left out, the server reads it from the text.
  const [pinCode, setPinCode] = useState(editing?.postal_code ?? "");
  const [pinError, setPinError] = useState<string | null>(null);
  // Once typed in, the customer's PIN is theirs: a moved map pin does not overwrite it.
  const pinTyped = useRef(false);

  const namingRun = useRef(0);
  const nameSpot = useCallback(async (lat: number, long: number, fillPin: boolean) => {
    // A second pin can be chosen while the first is still being named; only
    // the latest answer counts.
    const run = ++namingRun.current;
    setNaming(true);
    const named = design
      ? { locality: design.place.locality, postalCode: design.place.postalCode ?? null }
      : await placeFor(lat, long);
    if (run !== namingRun.current) return;
    setLocality(named.locality);
    // A blank PIN when the geocoder has none: the old one described the old spot.
    if (fillPin && !pinTyped.current) setPinCode(named.postalCode ?? "");
    setNaming(false);
    // The seed is fixed for the screen's life.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    // A saved address keeps its own PIN; a fresh pin takes the geocoder's.
    if (!locality) void nameSpot(pin.lat, pin.long, !pinCode);
    // Once, for the pin the screen opened with; "Change" names its own.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The picker hands back a sentinel string when the geocoder has nothing.
  // The locality stands in for it, so the server's required `address` is never
  // "Address not found".
  const mapAddress =
    pin.address && pin.address !== ADDRESS_NOT_FOUND && pin.address !== ADDRESS_UNAVAILABLE
      ? pin.address
      : null;
  const displayAddress = mapAddress ?? locality ?? "";

  const [line1, setLine1] = useState(editing?.address_line_1 ?? "");
  const [line1Error, setLine1Error] = useState<string | null>(null);
  const [line2, setLine2] = useState(editing?.address_line_2 ?? "");
  const [label, setLabel] = useState(editing?.label ?? "");

  const taken = useMemo(() => takenTypes(addresses, editing?.id), [addresses, editing?.id]);
  const [type, setType] = useState<AddressType>(
    editing?.address_type ?? (taken.has("home") ? "other" : "home")
  );
  const [typeError, setTypeError] = useState<string | null>(null);
  // The list can still be loading when this screen opens, so the preselected
  // Home may turn out to be taken once it arrives.
  useEffect(() => {
    if (type !== "other" && taken.has(type)) setType("other");
  }, [taken, type]);

  // Only a list that loaded and is empty makes this the first address. A list
  // that failed to load is unknown, not empty: treating it as empty forced the
  // new address to be the default and took the default off the owner's Home.
  const isFirst = !editing && !loading && !isError && addresses.length === 0;
  const forcedDefault = isFirst || Boolean(editing?.is_default);
  const [makeDefault, setMakeDefault] = useState(false);
  const isDefault = forcedDefault || makeDefault;

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const deleteSheet = useRef<BottomSheetModal>(null);

  // True from the tap until this screen has dealt with the answer. Leaving in
  // between is how an extra screen got popped: the request (and the refetch it
  // waits on) finished after this route was gone, and its `goBack()` then took
  // the screen underneath — Saved addresses from Profile, Review from the picker.
  const inFlight = useRef(false);
  // Blocks the header back and the Android back button (nav.tsx routes it
  // through goBack) for that window.
  useEffect(
    () =>
      navigation.addListener("beforeRemove", (event) => {
        if (inFlight.current) event.preventDefault();
      }),
    [navigation]
  );
  // The iOS edge swipe is not interceptable by `beforeRemove` on the native
  // stack, so it is switched off for the same window.
  useEffect(() => {
    navigation.setOptions({ gestureEnabled: !(saving || deleting) });
  }, [navigation, saving, deleting]);
  /** Our own way out, once the answer is in. */
  const leave = () => {
    inFlight.current = false;
    navigation.goBack();
  };

  const scrollRef = useRef<KeyboardAwareScrollView>(null);
  const fieldY = useRef<{ line1?: number; type?: number }>({});
  const scrollToField = (field: "line1" | "type") => {
    const y = fieldY.current[field];
    if (y !== undefined) scrollRef.current?.scrollToPosition(0, Math.max(0, y - space.md), true);
  };

  useEffect(() => () => cancelLocationRequest(requestId), [requestId]);

  const changeLocation = () => {
    // A design seed never opens the live picker (location permission).
    if (design) return;
    navigation.navigate("LocationModal", {
      initial: { latitude: pin.lat, longitude: pin.long },
      requestId: createLocationRequest((coords, address) => {
        // The picker's "skip" keeps the pin this address already has.
        if (!coords) return;
        setPin({ lat: coords.latitude, long: coords.longitude, address });
        void nameSpot(coords.latitude, coords.longitude, true);
      }),
    });
  };

  const save = async () => {
    if (!line1.trim()) {
      setLine1Error("Enter your flat, house number or building");
      scrollToField("line1");
      return;
    }
    const pinToSend = validPin(pinCode);
    if (pinCode.trim() && !pinToSend) {
      setPinError("Enter a 6-digit PIN code");
      return;
    }
    if (!locality) return;

    Keyboard.dismiss();
    setTypeError(null);
    inFlight.current = true;
    setSaving(true);
    const payload: AddressPayload = {
      // The column is 255 characters, and a long geocoder line was a 400 that
      // no retry could fix.
      address: displayAddress.slice(0, 255),
      address_line_1: line1.trim(),
      address_line_2: line2.trim(),
      locality,
      address_type: type,
      label: type === "other" ? label.trim() : "",
      coordinates: { lat: pin.lat, long: pin.long },
      ...(pinToSend ? { postal_code: pinToSend } : {}),
    };

    try {
      const saved = editing
        ? await update({
            id: editing.id,
            ...payload,
            // Only ever `true`: the server rejects `false` on the current
            // default, and unticking is not how a default is changed.
            ...(isDefault && !editing.is_default ? { is_default: true } : {}),
          })
        : await create({ ...payload, is_default: isDefault });
      // Back first, as the map does: whoever is waiting on the request may
      // navigate or close a sheet from its callback.
      leave();
      if (requestId) {
        resolveLocationRequest(
          requestId,
          { latitude: pin.lat, longitude: pin.long },
          saved.address,
          saved
        );
      } else {
        toast.success("Address saved");
      }
    } catch (error: any) {
      const status = error?.response?.status;
      const typeMessage = error?.response?.data?.address_type?.[0];
      // Only an edit can find its address gone. A 404 on create means the
      // server has no such route, and telling the owner their address "no
      // longer exists" would be wrong.
      if (status === 404 && editing) {
        // Deleted somewhere else: there is nothing left here to retry.
        toast.error(GONE_MESSAGE);
        leave();
        return;
      }
      inFlight.current = false;
      setSaving(false);
      if (status === 400 && typeMessage) {
        setTypeError(typeMessage);
        scrollToField("type");
      } else {
        toastFailure("Couldn't save the address", error);
      }
    }
  };

  const confirmDelete = async () => {
    if (!editing) return;
    inFlight.current = true;
    setDeleting(true);
    try {
      await remove(editing.id);
      deleteSheet.current?.dismiss();
      leave();
      toast.success("Address deleted");
    } catch (error: any) {
      // The sheet would cover the toast.
      deleteSheet.current?.dismiss();
      if (error?.response?.status === 404) {
        // Already deleted somewhere else.
        toast.error(GONE_MESSAGE);
        leave();
        return;
      }
      inFlight.current = false;
      setDeleting(false);
      toastFailure("Couldn't delete the address", error);
    }
  };

  // Deleting the default promotes the most recently added one left (D11).
  const others = editing ? addresses.filter((a) => a.id !== editing.id) : [];
  const nextDefault =
    editing?.is_default && others.length
      ? others.reduce((newest, a) => (a.id > newest.id ? a : newest))
      : null;

  const busy = saving || deleting;

  const typeOptions: { value: AddressType; label: string }[] = [
    { value: "home", label: "Home" },
    { value: "work", label: "Work" },
    { value: "other", label: "Other" },
  ];
  const isTakenType = (value: AddressType) => value !== "other" && taken.has(value);
  const anyTaken = typeOptions.some((option) => isTakenType(option.value));

  return (
    // The container pads by the iOS keyboard (Android resizes), so the kit bar
    // below the scroll view rides on the keys.
    <NonScrollableContainer>
      <SubpageHeader title={editing ? "Edit address" : "Address details"} />
      <KeyboardAwareScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={space.md}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: SCREEN_GUTTER,
          paddingTop: CONTENT_TOP,
          paddingBottom: BLOCK_GAP,
        }}
      >
        {/* While a save or delete is in flight the form is held as it was sent. */}
        <View pointerEvents={busy ? "none" : "auto"} style={{ opacity: busy ? 0.5 : 1 }}>
          <View
            style={{
              marginBottom: BLOCK_GAP,
              borderWidth: 1,
              borderColor: color.line,
              borderRadius: radius.input,
              backgroundColor: color.surface,
              overflow: "hidden",
            }}
          >
            <View style={{ height: MAP_HEIGHT }}>
              {/* A picture of the pin, not a map to use: "Change" opens the real one. */}
              <View pointerEvents="none" style={{ flex: 1 }}>
                {design ? (
                  <MapPlaceholder style={{ flex: 1 }} />
                ) : (
                  <MapView
                    provider={PROVIDER_GOOGLE}
                    style={{ flex: 1 }}
                    region={{
                      latitude: pin.lat,
                      longitude: pin.long,
                      latitudeDelta: PREVIEW_DELTA,
                      longitudeDelta: PREVIEW_DELTA,
                    }}
                    customMapStyle={isDark ? darkModeMapStyle : []}
                    scrollEnabled={false}
                    zoomEnabled={false}
                    rotateEnabled={false}
                    pitchEnabled={false}
                    toolbarEnabled={false}
                  >
                    <Marker
                      coordinate={{ latitude: pin.lat, longitude: pin.long }}
                      pinColor={color.brand}
                    />
                  </MapView>
                )}
              </View>
              {/* The frames hid the old map layer and "Change" with it, but it is
                  the only way to re-pick the pin, so it stays where that layer
                  drew it. */}
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Change location"
                activeOpacity={0.6}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                onPress={changeLocation}
                style={{
                  position: "absolute",
                  top: CHANGE_INSET,
                  right: CHANGE_INSET,
                  paddingVertical: 6,
                  paddingHorizontal: 12,
                  borderRadius: radius.full,
                  backgroundColor: color.surface,
                }}
              >
                <Text fontSize="text-sm" fontWeight="font-semibold" tone="brand">
                  Change
                </Text>
              </TouchableOpacity>
            </View>

            <View
              style={{
                paddingTop: 12,
                paddingHorizontal: 16,
                paddingBottom: 16,
                gap: 2,
              }}
            >
              {naming ? (
                <Skeleton width="55%" height={18} borderRadius={4} style={{ marginVertical: 3 }} />
              ) : locality ? (
                <Text fontSize="text-md" fontWeight="font-bold">
                  {locality}
                </Text>
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
                  <Text fontSize="text-md" tone="body" style={{ flexShrink: 1 }}>
                    We couldn't name this spot.
                  </Text>
                  <TouchableOpacity
                    accessibilityRole="button"
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    onPress={() => void nameSpot(pin.lat, pin.long, !pinCode)}
                  >
                    <Text fontSize="text-md" fontWeight="font-bold" tone="brand">
                      Try again
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
              {mapAddress && mapAddress !== locality ? (
                <Text fontSize="text-sm" tone="body">
                  {mapAddress}
                </Text>
              ) : null}
            </View>
          </View>

          <View
            onLayout={(e) => (fieldY.current.line1 = e.nativeEvent.layout.y)}
            style={{ marginBottom: FIELD_EXTRA }}
          >
            <TextField
              label="Flat, house no. or building"
              placeholder="e.g. Flat 1203, Tower B"
              value={line1}
              onChangeText={(text) => {
                setLine1(text);
                setLine1Error(null);
              }}
              error={line1Error ?? undefined}
              maxLength={255}
              autoCapitalize="words"
              textContentType="streetAddressLine1"
            />
          </View>

          <View style={{ marginBottom: FIELD_EXTRA }}>
            <TextField
              label="Landmark"
              hint="Optional"
              placeholder="e.g. Near the clubhouse"
              value={line2}
              onChangeText={setLine2}
              maxLength={255}
            />
          </View>

          <View style={{ marginBottom: FIELD_EXTRA }}>
            <TextField
              label="PIN code"
              hint="Shops use it to see if they deliver here"
              placeholder="e.g. 400053"
              value={pinCode}
              onChangeText={(text) => {
                pinTyped.current = true;
                setPinCode(text.replace(/[^0-9]/g, ""));
                setPinError(null);
              }}
              error={pinError ?? undefined}
              maxLength={6}
              keyboardType="number-pad"
              textContentType="postalCode"
              autoComplete="postal-code"
            />
          </View>

          <View
            onLayout={(e) => (fieldY.current.type = e.nativeEvent.layout.y)}
            style={{ marginBottom: BLOCK_GAP }}
          >
            <FieldLabel label="Save as" />
            <View
              accessibilityRole="radiogroup"
              accessibilityLabel="Save as"
              style={{
                flexDirection: "row",
                gap: CHIP_GAP,
                // Room for a taken chip's "Already saved" under the row.
                paddingBottom: anyTaken ? CHIP_GAP + HINT_HEIGHT : 0,
              }}
            >
              {typeOptions.map((option) => {
                const isTaken = isTakenType(option.value);
                return (
                  <View key={option.value}>
                    {/* The kit Chip has no disabled state: a taken type is drawn
                        as Default, can't be pressed, and says why under it. */}
                    <View
                      pointerEvents={isTaken ? "none" : "auto"}
                      accessible={isTaken}
                      accessibilityState={isTaken ? { disabled: true } : undefined}
                      accessibilityLabel={isTaken ? `${option.label}, ${TAKEN_HINT}` : undefined}
                    >
                      <Chip
                        label={option.label}
                        selected={type === option.value}
                        onPress={() => {
                          setType(option.value);
                          setTypeError(null);
                        }}
                      />
                    </View>
                    {isTaken ? (
                      <Text
                        fontSize="text-xs"
                        tone="body"
                        numberOfLines={1}
                        style={{
                          position: "absolute",
                          top: 40 + CHIP_GAP,
                          left: 0,
                          width: 120,
                        }}
                      >
                        {TAKEN_HINT}
                      </Text>
                    ) : null}
                  </View>
                );
              })}
            </View>
            <FieldError>{typeError}</FieldError>
          </View>

          {type === "other" ? (
            <View style={{ marginBottom: FIELD_EXTRA }}>
              <TextField
                label="Name this address"
                hint="Optional"
                placeholder="e.g. Mom's place"
                value={label}
                onChangeText={setLabel}
                maxLength={NAME_MAX}
                autoCapitalize="words"
              />
            </View>
          ) : null}

          <View
            // A forced default is shown ticked and cannot be unticked: the
            // first address is the default, and the current default only
            // stops being one when another address takes over.
            pointerEvents={forcedDefault ? "none" : "auto"}
            // Forced, the row is one element that says why it will not
            // toggle; otherwise the checkbox inside speaks for itself.
            accessible={forcedDefault}
            accessibilityRole={forcedDefault ? "checkbox" : undefined}
            accessibilityState={forcedDefault ? { disabled: true, checked: true } : undefined}
            accessibilityLabel={
              forcedDefault
                ? `Make this my default address. ${
                    isFirst
                      ? "Your first address is your default."
                      : "To change your default, make another address the default."
                  }`
                : undefined
            }
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: editing ? BLOCK_GAP : 0,
              // Forced, the frame draws the box and both lines at 60%.
              opacity: forcedDefault ? 0.6 : 1,
            }}
          >
            <View style={{ marginVertical: -CHECK_OVERHANG }}>
              <CheckBox
                checked={isDefault}
                onPress={() => setMakeDefault((on) => !on)}
                accessibilityLabel="Make this my default address"
              />
            </View>
            <View style={{ flex: 1, gap: 2, marginLeft: 2 }}>
              <Text fontSize="text-md">Make this my default address</Text>
              {forcedDefault ? (
                <Text fontSize="text-xs">
                  {isFirst
                    ? "Your first address is your default."
                    : "To change your default, make another address the default."}
                </Text>
              ) : null}
            </View>
          </View>

          {editing ? (
            // The fix pass's destructive link: dangerStrong text and trash,
            // never a filled button (b2-13).
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Delete address"
              activeOpacity={0.6}
              hitSlop={{ top: 10, bottom: 10, left: 0, right: 0 }}
              onPress={() => deleteSheet.current?.present()}
              style={{
                flexDirection: "row",
                alignItems: "center",
                alignSelf: "flex-start",
                gap: space.sm,
              }}
            >
              <TrashIcon size={20} color={color.dangerStrong} strokeWidth={1.5} />
              <Text fontSize="text-md" fontWeight="font-bold" style={{ color: color.dangerStrong }}>
                Delete address
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </KeyboardAwareScrollView>

      {/* No locality, no save: the API requires one, and a listing made from
          this address would publish it as its public location. */}
      <BottomBar
        primary={{
          label: editing ? "Save changes" : "Save address",
          onPress: save,
          loading: saving,
          disabled: naming || !locality || deleting,
        }}
      />

      {editing ? (
        <ConfirmSheet
          ref={deleteSheet}
          title="Delete this address?"
          body={
            `${addressTitle(editing)} will be removed. Your existing listings keep their pickup location.` +
            (nextDefault ? ` Your default will move to ${addressTitle(nextDefault)}.` : "")
          }
          confirmLabel="Delete address"
          tone="danger"
          loading={deleting}
          onConfirm={confirmDelete}
        />
      ) : null}
    </NonScrollableContainer>
  );
}
