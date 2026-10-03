import { localityFor } from "@/backend/list-flow/pickup-location";
import useAddresses from "@/backend/useAddresses";
import {
  Button,
  FieldError,
  FieldFrame,
  FieldLabel,
  Skeleton,
  SubpageHeader,
  Text,
  TextField,
} from "@/components/core";
import { CheckBox } from "@/components/core/checkbox";
import { ConfirmSheet } from "@/components/core/confirm-sheet";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { SegmentedChoice } from "@/components/core/segmented-choice";
import { AddressPayload, AddressType, addressTitle, takenTypes } from "@/lib/addresses";
import { MIN_TOUCH_TARGET, SCREEN_GUTTER, density, radius, space } from "@/lib/design-tokens";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

const MAP_HEIGHT = 120;
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
  const { color, isDark } = useTheme();
  const insets = useSafeAreaInsets();
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
  const namingRun = useRef(0);
  const nameSpot = useCallback(async (lat: number, long: number) => {
    // A second pin can be chosen while the first is still being named; only
    // the latest answer counts.
    const run = ++namingRun.current;
    setNaming(true);
    const named = await localityFor(lat, long);
    if (run !== namingRun.current) return;
    setLocality(named);
    setNaming(false);
  }, []);
  useEffect(() => {
    if (!locality) void nameSpot(pin.lat, pin.long);
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
    navigation.navigate("LocationModal", {
      initial: { latitude: pin.lat, longitude: pin.long },
      requestId: createLocationRequest((coords, address) => {
        // The picker's "skip" keeps the pin this address already has.
        if (!coords) return;
        setPin({ lat: coords.latitude, long: coords.longitude, address });
        void nameSpot(coords.latitude, coords.longitude);
      }),
    });
  };

  const save = async () => {
    if (!line1.trim()) {
      setLine1Error("Enter your flat, house number or building");
      scrollToField("line1");
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

  return (
    <NonScrollableContainer>
      <SubpageHeader title={editing ? "Edit address" : "Address details"} />
      <FieldFrame>
        <KeyboardAwareScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          enableOnAndroid
          extraScrollHeight={space.md}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: SCREEN_GUTTER,
            paddingTop: space.md,
            paddingBottom: space.xl,
          }}
        >
          {/* While a save or delete is in flight the form is held as it was sent. */}
          <View pointerEvents={busy ? "none" : "auto"} style={{ opacity: busy ? 0.5 : 1 }}>
            <View
              style={{
                marginBottom: density.fieldGap,
                borderWidth: 1,
                borderColor: color.line,
                borderRadius: radius.card,
                backgroundColor: color.surface,
                overflow: "hidden",
              }}
            >
              <View style={{ height: MAP_HEIGHT }}>
                {/* A picture of the pin, not a map to use: "Change" opens the real one. */}
                <View pointerEvents="none" style={{ flex: 1 }}>
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
                </View>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Change location"
                  activeOpacity={0.6}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  onPress={changeLocation}
                  style={{
                    position: "absolute",
                    right: space.sm,
                    bottom: space.sm,
                    minHeight: 36,
                    paddingHorizontal: space.md,
                    justifyContent: "center",
                    borderRadius: radius.full,
                    borderWidth: 1,
                    borderColor: color.line,
                    backgroundColor: color.surface,
                  }}
                >
                  <Text fontSize="text-sm" fontWeight="font-bold" tone="brand">
                    Change
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={{ padding: space.md, gap: 2 }}>
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
                      onPress={() => void nameSpot(pin.lat, pin.long)}
                    >
                      <Text fontSize="text-md" fontWeight="font-bold" tone="brand">
                        Try again
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
                {mapAddress ? (
                  <Text fontSize="text-sm" tone="body">
                    {mapAddress}
                  </Text>
                ) : null}
              </View>
            </View>

            <View onLayout={(e) => (fieldY.current.line1 = e.nativeEvent.layout.y)}>
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

            <TextField
              label="Landmark"
              hint="Optional"
              placeholder="e.g. Near the clubhouse"
              value={line2}
              onChangeText={setLine2}
              maxLength={255}
            />

            <View
              onLayout={(e) => (fieldY.current.type = e.nativeEvent.layout.y)}
              style={{ marginBottom: density.fieldGap }}
            >
              <FieldLabel label="Save as" />
              <SegmentedChoice<AddressType>
                accessibilityLabel="Save as"
                value={type}
                onChange={(next) => {
                  setType(next);
                  setTypeError(null);
                }}
                options={[
                  {
                    value: "home",
                    label: "Home",
                    disabled: taken.has("home"),
                    hint: taken.has("home") ? TAKEN_HINT : undefined,
                  },
                  {
                    value: "work",
                    label: "Work",
                    disabled: taken.has("work"),
                    hint: taken.has("work") ? TAKEN_HINT : undefined,
                  },
                  { value: "other", label: "Other" },
                ]}
              />
              <FieldError>{typeError}</FieldError>
            </View>

            {type === "other" ? (
              <TextField
                label="Name this address"
                hint="Optional"
                placeholder="e.g. Mom's place"
                value={label}
                onChangeText={setLabel}
                maxLength={NAME_MAX}
                autoCapitalize="words"
              />
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
                minHeight: MIN_TOUCH_TARGET,
                opacity: forcedDefault ? 0.6 : 1,
              }}
            >
              <CheckBox
                checked={isDefault}
                onPress={() => setMakeDefault((on) => !on)}
                accessibilityLabel="Make this my default address"
              />
              <View style={{ flex: 1 }}>
                <Text fontSize="text-md">Make this my default address</Text>
                {forcedDefault ? (
                  <Text fontSize="text-xs" tone="body">
                    {isFirst
                      ? "Your first address is your default."
                      : "To change your default, make another address the default."}
                  </Text>
                ) : null}
              </View>
            </View>

            {editing ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Delete address"
                activeOpacity={0.6}
                onPress={() => deleteSheet.current?.present()}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  alignSelf: "flex-start",
                  gap: space.sm,
                  minHeight: MIN_TOUCH_TARGET,
                  marginTop: space.sm,
                }}
              >
                <TrashIcon size={20} color={color.danger} strokeWidth={1.5} />
                <Text fontSize="text-md" fontWeight="font-bold" tone="danger">
                  Delete address
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </KeyboardAwareScrollView>
      </FieldFrame>

      <View
        style={{
          paddingHorizontal: SCREEN_GUTTER,
          paddingTop: space.sm,
          paddingBottom: insets.bottom + space.sm,
          borderTopWidth: 1,
          borderTopColor: color.line,
          backgroundColor: color.canvas,
        }}
      >
        {/* No locality, no save: the API requires one, and a listing made from
            this address would publish it as its public location. */}
        <Button loading={saving} disabled={naming || !locality || deleting} onPress={save}>
          {editing ? "Save changes" : "Save address"}
        </Button>
      </View>

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
