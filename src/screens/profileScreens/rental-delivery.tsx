import { fetchDeliveryExample, patchShop, shopQueryKey, useAreas, useShop } from "@/backend/shop";
import { Button, FieldFrame, Skeleton, SubpageHeader, Text, TextField } from "@/components/core";
import { ConfirmSheet } from "@/components/core/confirm-sheet";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { Stepper } from "@/components/core/stepper";
import { AppSwitch } from "@/components/core/switch";
import { ShopLoadError, ShopLoading } from "@/components/shop/states";
import { useGlobalContext } from "@/context/global-context";
import { apiError, fieldErrors } from "@/lib/api-error";
import { deliveryDraft, useDeliveryDraft } from "@/lib/delivery-draft";
import { MIN_TOUCH_TARGET, SCREEN_GUTTER, radius, space } from "@/lib/design-tokens";
import {
  AREAS_KM_MAX,
  Area,
  DeliveryDraft,
  Shop,
  areaChanges,
  checkDelivery,
  cleanDecimal,
  deliveryDraftFrom,
  deliveryPatch,
  kmText,
  offWithin,
  prefillFees,
  previewAreas,
  rupees,
  savedMessage,
  stepKm,
  toggleExcluded,
  unsavedSummary,
} from "@/lib/shop";
import { useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";
import { useTypedNavigation } from "@/lib/types";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import darkModeMapStyle from "assets/mapJSON/darkModeMapStyle.json";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { TouchableOpacity, View } from "react-native";
import { ChevronRightIcon } from "react-native-heroicons/mini";
import { CheckIcon, ComputerDesktopIcon, MinusIcon, PlusIcon, XMarkIcon } from "react-native-heroicons/outline";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import MapView, { Circle, Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "react-query";

/**
 * A value once it has stopped changing for a moment: one call per pause, not per key or tap. Primitives only: an object
 * made fresh each render never settles, it re-renders every `ms` for ever.
 */
function useSettled<T extends string | number>(value: T, ms: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return settled;
}

const MAP_HEIGHT = 180;
/** Degrees of latitude in a km, near enough for framing a circle. */
const KM_PER_DEGREE = 111;

/** The shop's pin and the distance drawn around it. No marks for areas that are off (plan D5). */
function DistanceMap({ coordinates, km }: { coordinates: { lat: number; long: number }; km: number }) {
  const { color, isDark } = useTheme();
  const shown = Math.max(km, 0.5);
  // The circle's width plus a margin, so its edge is in the frame.
  const delta = (shown * 2 * 1.25) / KM_PER_DEGREE;
  const center = { latitude: coordinates.lat, longitude: coordinates.long };
  return (
    <View
      style={{ height: MAP_HEIGHT, overflow: "hidden", borderRadius: radius.group }}
      accessible
      accessibilityLabel={`Map: your shop, and a circle ${kmText(shown)} around it`}
    >
      <MapView
        provider={PROVIDER_GOOGLE}
        style={{ flex: 1 }}
        region={{ ...center, latitudeDelta: delta, longitudeDelta: delta }}
        customMapStyle={isDark ? darkModeMapStyle : []}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
      >
        <Circle
          center={center}
          radius={shown * 1000}
          strokeWidth={2}
          strokeColor={color.brand}
          fillColor={color.brandWash}
        />
        <Marker coordinate={center} pinColor={color.brand} />
      </MapView>
    </View>
  );
}

/** One area on the Delivery screen: name and PIN, ✓ while delivered to, ✕ once turned off. */
function AreaChip({ area, off, onPress }: { area: Area; off: boolean; onPress: () => void }) {
  const { color } = useTheme();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`${area.name}, ${area.pin}, ${off ? "off" : "on"}`}
      accessibilityHint={off ? "Turns delivery to this area back on" : "Turns delivery to this area off"}
      activeOpacity={0.7}
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: space.xs,
        minHeight: MIN_TOUCH_TARGET,
        paddingHorizontal: space.sm,
        paddingVertical: space.xs,
        borderRadius: radius.button,
        borderWidth: 1,
        borderColor: off ? color.inputLine : color.brandPanelLine,
        backgroundColor: off ? color.surface : color.brandPanel,
      }}
    >
      {off ? <XMarkIcon size={16} color={color.textBody} /> : <CheckIcon size={16} color={color.brandText} />}
      <View>
        <Text fontSize="text-sm" fontWeight="font-bold" tone={off ? "body" : "default"}>
          {area.name}
        </Text>
        <Text fontSize="text-xs" tone="body">
          {off ? `${area.pin} · Off` : area.pin}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function DeliveryEditor({ shop }: { shop: Shop }) {
  const navigation = useTypedNavigation();
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { userDetails } = useGlobalContext();

  const [saving, setSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  // "Suggested. Change if you like." under fees the switch filled in (D7), until saved or discarded.
  const [suggested, setSuggested] = useState(false);
  const discardSheet = useRef<BottomSheetModal>(null);

  const saved = useMemo(() => deliveryDraftFrom(shop), [shop]);
  const form = useDeliveryDraft() ?? saved;
  const edit = (patch: Partial<DeliveryDraft>) => {
    deliveryDraft.set({ ...(deliveryDraft.get() ?? saved), ...patch });
    setServerErrors({});
    setFormError(null);
  };

  const errors = checkDelivery(form);
  const valid = Object.keys(errors).length === 0;
  const km = Number(form.maxKm) || 0;

  // The areas follow the distance once the − / + taps pause.
  const settledKm = useSettled(km, 400);
  const hasPin = Boolean(shop.coordinates);
  const areasQuery = useAreas(settledKm, form.delivers && hasPin);
  const areasFailure = apiError(areasQuery.error);
  const noAddress = !hasPin || areasFailure?.code === "shop_address_missing";
  // A server older than ENG-284 has no areas: the card is left out, the rest works as before.
  const noAreas = areasFailure?.status === 404;
  const areas = areasQuery.data?.areas ?? [];

  const summary = unsavedSummary(saved, form, areas);
  const dirty = summary !== null;

  // The farthest trip comes from the server so its rounding is the quote's.
  const settledNumbers = useSettled(`${form.base}|${form.perKm}|${form.maxKm}`, 500);
  const [exBase, exPerKm, exMaxKm] = settledNumbers.split("|");
  const settledValid =
    Object.keys(checkDelivery({ delivers: true, base: exBase, perKm: exPerKm, maxKm: exMaxKm })).length === 0;
  const example = useQuery(
    ["delivery-example", exBase, exPerKm, exMaxKm],
    () => fetchDeliveryExample({ base: exBase, perKm: exPerKm, maxKm: exMaxKm, km: Number(exMaxKm) }),
    { enabled: form.delivers && settledValid, keepPreviousData: true, retry: false }
  );

  // Back with unsaved changes asks first (the `beforeRemove` pattern from AddressDetails). Pushing All areas is not a
  // removal, so it never asks.
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const pendingAction = useRef<any>(null);
  useEffect(
    () =>
      navigation.addListener("beforeRemove", (event) => {
        if (!dirtyRef.current) return;
        event.preventDefault();
        pendingAction.current = event.data.action;
        discardSheet.current?.present();
      }),
    [navigation]
  );
  // The iOS edge swipe is not interceptable by `beforeRemove` on the native stack, so it is off while there is something
  // to lose.
  useEffect(() => {
    navigation.setOptions({ gestureEnabled: !dirty });
  }, [navigation, dirty]);

  const discard = () => {
    deliveryDraft.reset();
    setSuggested(false);
    setShowErrors(false);
    setServerErrors({});
    setFormError(null);
  };

  const discardAndLeave = () => {
    discardSheet.current?.dismiss();
    dirtyRef.current = false;
    discard();
    if (pendingAction.current) navigation.dispatch(pendingAction.current);
  };

  const setFee = (field: "base" | "perKm", value: string) => edit({ [field]: cleanDecimal(value, 2) });

  const setDelivers = (on: boolean) => {
    if (on) {
      const next = prefillFees(form);
      edit(next.form);
      setSuggested(next.suggested);
    } else {
      edit({ delivers: false });
    }
  };

  const save = async () => {
    if (!valid) {
      setShowErrors(true);
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const turnedOff = form.delivers ? areaChanges(saved.excluded, form.excluded, areas).off : [];
      const next = await patchShop(deliveryPatch(form));
      queryClient.setQueryData(shopQueryKey(userDetails?.username), next);
      discard();
      toast.success(savedMessage(turnedOff));
    } catch (error) {
      const failure = apiError(error);
      const fields = fieldErrors(failure);
      setServerErrors(fields);
      const shownOnField = ["delivery_base_fee", "delivery_per_km", "delivery_max_km"].some((f) => fields[f]);
      if (!shownOnField) {
        setFormError(
          fields.excluded_pincodes ?? failure?.message ?? "Couldn't save. Check your connection."
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const shown = (field: "base" | "perKm" | "maxKm", server: string) =>
    (showErrors ? errors[field] : undefined) ?? serverErrors[server];

  const card = {
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: radius.card,
    backgroundColor: color.surface,
    padding: space.md,
    gap: space.sm,
  } as const;

  const closer = stepKm(km, -1);
  const farther = stepKm(km, 1);
  // Kept at the front while being edited: a saved area turned back on stays where it was.
  const preview = previewAreas(areas, [...new Set([...saved.excluded, ...form.excluded])]);
  const offCount = offWithin(areas, form.excluded).length;
  const inside = areas.filter((a) => a.inside);
  const everyOff = inside.length > 0 && inside.every((a) => form.excluded.includes(a.pin));
  const farthest =
    example.data && valid && !example.isPreviousData
      ? example.data.status === "ok" && example.data.fee
        ? { fee: rupees(example.data.fee), sum: example.data.sum }
        : null
      : null;

  return (
    <>
      <FieldFrame>
        <KeyboardAwareScrollView
          keyboardShouldPersistTaps="handled"
          enableOnAndroid
          extraScrollHeight={space.md}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: SCREEN_GUTTER,
            paddingTop: space.md,
            paddingBottom: space.xl,
            gap: space.md,
          }}
        >
          <Text role="screenTitle" accessibilityRole="header">
            Where you deliver
          </Text>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: space.md,
              padding: space.md,
              borderRadius: radius.card,
              borderWidth: 1,
              borderColor: color.brandPanelLine,
              backgroundColor: color.brandPanel,
            }}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Text fontSize="text-md" fontWeight="font-bold">
                We deliver
              </Text>
              <Text fontSize="text-sm" tone="body">
                {form.delivers
                  ? "Customers can ask for delivery. Self pickup stays on either way."
                  : "Off. Customers see Self pickup on all your products."}
              </Text>
            </View>
            <AppSwitch
              accessibilityLabel="We deliver"
              value={form.delivers}
              onValueChange={setDelivers}
              trackColor={{ true: color.brand, false: color.inputLine }}
              thumbColor="#FFFFFF"
            />
          </View>

          {form.delivers ? (
            <>
              <View style={card}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
                  <Text fontSize="text-md" fontWeight="font-bold" accessibilityRole="header" style={{ flex: 1 }}>
                    How far you go
                  </Text>
                  <Stepper
                    label="Closer"
                    disabled={closer === null}
                    onPress={() => closer !== null && edit({ maxKm: String(closer) })}
                  >
                    <MinusIcon size={20} color={color.text} />
                  </Stepper>
                  <Text
                    fontSize="text-md"
                    fontWeight="font-bold"
                    accessibilityLiveRegion="polite"
                    style={{ minWidth: 56, textAlign: "center" }}
                  >
                    {km > 0 ? kmText(form.maxKm) : "—"}
                  </Text>
                  <Stepper
                    label={`Farther, ${kmText(km)}`}
                    disabled={farther === null}
                    onPress={() => farther !== null && edit({ maxKm: String(farther) })}
                  >
                    <PlusIcon size={20} color={color.text} />
                  </Stepper>
                </View>
                {shown("maxKm", "delivery_max_km") ? (
                  <Text tone="danger" fontSize="text-sm" accessibilityLiveRegion="polite">
                    {shown("maxKm", "delivery_max_km")}
                  </Text>
                ) : null}
                {km > AREAS_KM_MAX ? (
                  <Text fontSize="text-sm" tone="body">
                    Areas are shown up to {AREAS_KM_MAX} km.
                  </Text>
                ) : null}

                {shop.coordinates ? (
                  <>
                    <DistanceMap coordinates={shop.coordinates} km={km} />
                    <Text fontSize="text-xs" tone="dim">
                      Purple: where you deliver.
                    </Text>
                  </>
                ) : null}

                {farthest ? (
                  <Text fontSize="text-sm" accessibilityLiveRegion="polite">
                    Farthest trip: <Text fontSize="text-sm" fontWeight="font-bold">{farthest.fee}</Text> for the
                    customer{farthest.sum ? ` (${farthest.sum})` : ""}
                  </Text>
                ) : null}
                <Text fontSize="text-sm" tone="body">
                  Measured in a straight line, not by road. If the road is much longer, like across a creek, turn that
                  area off below. Go farther and new areas are turned on for you.
                </Text>
              </View>

              {noAddress ? (
                <View style={card}>
                  <Text fontSize="text-md" fontWeight="font-bold" accessibilityRole="header">
                    Add your shop address first
                  </Text>
                  <Text fontSize="text-sm" tone="body">
                    Delivery distance is measured from your shop.
                  </Text>
                  <Button onPress={() => navigation.navigate("ShopAddress")}>Add shop address</Button>
                </View>
              ) : noAreas ? null : (
                <View style={card}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text fontSize="text-md" fontWeight="font-bold" accessibilityRole="header">
                      Areas you deliver to
                    </Text>
                    {offCount > 0 ? (
                      <Text fontSize="text-sm" fontWeight="font-bold" tone="danger">
                        {offCount} off
                      </Text>
                    ) : null}
                  </View>
                  <Text fontSize="text-sm" tone="body">
                    Tap an area to turn it off. Customers there can still pick up from your shop.
                  </Text>

                  {areasQuery.isLoading || (areasQuery.isIdle && !areasQuery.data) ? (
                    <View
                      style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}
                      accessible
                      accessibilityRole="progressbar"
                      accessibilityLabel="Loading your areas"
                      accessibilityState={{ busy: true }}
                    >
                      {[110, 120, 96, 130, 104, 116].map((width, i) => (
                        <Skeleton key={i} width={width} height={MIN_TOUCH_TARGET} borderRadius={radius.button} />
                      ))}
                    </View>
                  ) : areasQuery.isError && !areasQuery.data ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
                      <Text fontSize="text-sm" tone="danger" style={{ flex: 1 }}>
                        Couldn't load your areas.
                      </Text>
                      <Button variant="ghost" size="compact" onPress={() => void areasQuery.refetch()}>
                        Try again
                      </Button>
                    </View>
                  ) : (
                    <>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
                        {preview.map((area) => (
                          <AreaChip
                            key={area.pin}
                            area={area}
                            off={form.excluded.includes(area.pin)}
                            onPress={() => edit({ excluded: toggleExcluded(form.excluded, area.pin) })}
                          />
                        ))}
                      </View>
                      {areas.length > preview.length ? (
                        <TouchableOpacity
                          accessibilityRole="button"
                          activeOpacity={0.6}
                          onPress={() => navigation.navigate("DeliveryAreas")}
                          style={{ flexDirection: "row", alignItems: "center", minHeight: MIN_TOUCH_TARGET }}
                        >
                          <Text fontSize="text-sm" fontWeight="font-bold" tone="brand" style={{ flex: 1 }}>
                            See all {areas.length} areas, nearest first
                          </Text>
                          <ChevronRightIcon size={20} color={color.brandText} />
                        </TouchableOpacity>
                      ) : null}
                      {everyOff ? (
                        <View
                          accessibilityLiveRegion="polite"
                          style={{
                            gap: space.xs,
                            padding: space.md,
                            borderRadius: radius.group,
                            backgroundColor: color.warningWash,
                          }}
                        >
                          <Text fontSize="text-md" fontWeight="font-bold" tone="warning">
                            Every area is off
                          </Text>
                          <Text fontSize="text-sm">Nobody can get delivery. Customers can still pick up.</Text>
                          <TouchableOpacity
                            accessibilityRole="button"
                            activeOpacity={0.6}
                            onPress={() => setDelivers(false)}
                            style={{ minHeight: MIN_TOUCH_TARGET, justifyContent: "center" }}
                          >
                            <Text fontSize="text-sm" fontWeight="font-bold" tone="brand">
                              Turn delivery off instead
                            </Text>
                          </TouchableOpacity>
                        </View>
                      ) : null}
                    </>
                  )}
                </View>
              )}

              <View style={card}>
                <Text fontSize="text-md" fontWeight="font-bold" accessibilityRole="header">
                  Delivery fee
                </Text>
                {suggested ? (
                  <Text fontSize="text-sm" tone="brand">
                    Suggested. Change if you like.
                  </Text>
                ) : null}
                <TextField
                  label="Starting fee (₹)"
                  hint="Charged on every delivery"
                  required
                  keyboardType="decimal-pad"
                  value={form.base}
                  onChangeText={(v) => setFee("base", v)}
                  error={shown("base", "delivery_base_fee")}
                  placeholder="e.g. 50"
                />
                <TextField
                  label="Each kilometre (₹)"
                  hint="Added for every kilometre away"
                  required
                  keyboardType="decimal-pad"
                  value={form.perKm}
                  onChangeText={(v) => setFee("perKm", v)}
                  error={shown("perKm", "delivery_per_km")}
                  placeholder="e.g. 15"
                />
              </View>
            </>
          ) : null}

          {shop.is_merchant ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm, paddingHorizontal: space.sm }}>
              <ComputerDesktopIcon size={18} color={color.textDim} />
              <Text fontSize="text-sm" tone="dim" style={{ flex: 1 }}>
                Distance, areas and fees are also on the dashboard.
              </Text>
            </View>
          ) : null}
        </KeyboardAwareScrollView>
      </FieldFrame>

      {/* Pinned: what isn't saved, a way to drop it, and Save (D6). Save keeps the owner here. */}
      <View
        style={{
          paddingHorizontal: SCREEN_GUTTER,
          paddingTop: space.sm,
          paddingBottom: insets.bottom + space.sm,
          gap: space.sm,
          borderTopWidth: 1,
          borderTopColor: color.line,
          backgroundColor: color.canvas,
        }}
      >
        {formError ? (
          <View
            accessibilityLiveRegion="polite"
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: space.sm,
              paddingLeft: space.md,
              borderRadius: radius.group,
              backgroundColor: color.dangerWash,
            }}
          >
            <Text tone="danger" fontSize="text-sm" style={{ flex: 1, paddingVertical: space.sm }}>
              {formError}
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.6}
              disabled={saving}
              onPress={() => void save()}
              style={{ minHeight: MIN_TOUCH_TARGET, justifyContent: "center", paddingHorizontal: space.md }}
            >
              <Text tone="danger" fontSize="text-sm" fontWeight="font-bold">
                Try again
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
        {summary ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
            <Text fontSize="text-sm" tone="body" accessibilityLiveRegion="polite" style={{ flex: 1 }}>
              Unsaved: {summary}
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Discard changes"
              activeOpacity={0.6}
              disabled={saving}
              onPress={discard}
              style={{ minHeight: MIN_TOUCH_TARGET, justifyContent: "center", paddingHorizontal: space.xs }}
            >
              <Text fontSize="text-sm" fontWeight="font-bold" tone="brand">
                Discard
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
        <Button disabled={!dirty} loading={saving} onPress={() => void save()}>
          Save changes
        </Button>
      </View>

      <ConfirmSheet
        ref={discardSheet}
        title="Discard changes?"
        body="Your delivery changes won't be saved."
        confirmLabel="Discard"
        tone="danger"
        onConfirm={discardAndLeave}
      />
    </>
  );
}

/** SH-15, the delivery editor SH-13's "Delivery" row opens: on or off, how far, the areas off, and the fee. */
export default function RentalDeliveryScreen() {
  const { userDetailsFailed, fetchUserDetails } = useGlobalContext();
  const query = useShop();
  const profileFailed = query.isIdle && userDetailsFailed;

  // The draft lives while this screen does: All areas, pushed on top, edits it too.
  useEffect(() => () => deliveryDraft.reset(), []);

  return (
    <NonScrollableContainer>
      <SubpageHeader title="Delivery" />
      {(query.isLoading || query.isIdle) && !profileFailed ? (
        <ShopLoading label="Loading your delivery settings" />
      ) : query.data ? (
        <DeliveryEditor shop={query.data} />
      ) : (
        <ShopLoadError
          error={query.error}
          onRetry={() => void (profileFailed ? fetchUserDetails() : query.refetch())}
        />
      )}
    </NonScrollableContainer>
  );
}
