import { fetchDeliveryExample, patchShop, shopQueryKey, useAreas, useShop } from "@/backend/shop";
import { BottomBar, Button, FieldFrame, Skeleton, SubpageHeader, Text, TextField } from "@/components/core";
import { ConfirmSheet } from "@/components/core/confirm-sheet";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { Notice } from "@/components/booking/parts";
import { Stepper } from "@/components/core/stepper";
import { AppSwitch } from "@/components/core/switch";
import { ShopLoadError, ShopLoading } from "@/components/shop/states";
import { useGlobalContext } from "@/context/global-context";
import { apiError, fieldErrors } from "@/lib/api-error";
import { deliveryDraft, useDeliveryDraft } from "@/lib/delivery-draft";
import { MIN_TOUCH_TARGET, SCREEN_GUTTER, density, radius, space } from "@/lib/design-tokens";
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
import { useFocusEffect, useRoute } from "@react-navigation/native";
import darkModeMapStyle from "assets/mapJSON/darkModeMapStyle.json";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { TouchableOpacity, View } from "react-native";
import {
  CheckIcon,
  ChevronRightIcon,
  ComputerDesktopIcon,
  MapPinIcon,
  MinusIcon,
  PlusIcon,
  XMarkIcon,
} from "react-native-heroicons/outline";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import MapView, { Circle, Marker, PROVIDER_GOOGLE } from "react-native-maps";
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

/**
 * Dev-only design seed (ENG-437 plan §2.4): a draft laid over the saved shop before the editor mounts, the Discard sheet
 * open, a scroll offset, and the flat map stand-in. Read only under `__DEV__`.
 */
type DeliveryDesign = {
  draft?: Partial<DeliveryDraft>;
  discard?: boolean;
  scrollY?: number;
  map?: "placeholder";
};

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
      style={{ height: MAP_HEIGHT, overflow: "hidden", borderRadius: 12 }}
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

/**
 * The map as the state frames draw it (2097:29301 "Map (placeholder)"): a flat `surfaceMuted` tile with the delivery circle
 * and the pin, for fixtures where Google tiles would never settle. Not the kit `MapPlaceholder`: the frame has no streets.
 */
function DistanceMapPlaceholder() {
  const { color } = useTheme();
  return (
    <View style={{ height: MAP_HEIGHT, overflow: "hidden", borderRadius: 12, backgroundColor: color.surfaceMuted }}>
      <View
        style={{
          position: "absolute",
          left: 79,
          top: 15,
          width: 150,
          height: 150,
          borderRadius: 75,
          borderWidth: 1.5,
          borderColor: color.brand,
          backgroundColor: color.brandPanel,
        }}
      />
      <View style={{ position: "absolute", left: 142, top: 74 }}>
        <MapPinIcon size={24} color={color.brand} />
      </View>
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
      // 2097:29301 "Area · …": 50 high (1 + 6 + 36 + 6 + 1), r12, 12 at the sides, 6 to the text.
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: radius.button,
        borderWidth: 1,
        borderColor: off ? color.line : color.brandPanelLine,
        backgroundColor: off ? color.surface : color.brandPanel,
      }}
    >
      {off ? <XMarkIcon size={16} color={color.textBody} /> : <CheckIcon size={16} color={color.brandText} />}
      <View>
        <Text fontSize="text-sm" fontWeight="font-semibold" tone={off ? "body" : "default"}>
          {area.name}
        </Text>
        <Text fontSize="text-xs" tone="dim">
          {off ? `${area.pin} · Off` : area.pin}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function DeliveryEditor({ shop, design }: { shop: Shop; design?: DeliveryDesign }) {
  const navigation = useTypedNavigation();
  const { color } = useTheme();
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
  const latestOff = useRef<string[]>([]);
  latestOff.current = [...new Set([...saved.excluded, ...form.excluded])];
  const [orderOff, setOrderOff] = useState<string[]>(() => latestOff.current);
  useFocusEffect(
    useCallback(() => {
      setOrderOff(latestOff.current);
    }, [])
  );
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
  // Under a design seed neither guard is added: the next fixture link and `fixture/off` must always get through (plan §0.4).
  const seeded = Boolean(design);
  useEffect(() => {
    if (seeded) return;
    return navigation.addListener("beforeRemove", (event) => {
      if (!dirtyRef.current) return;
      event.preventDefault();
      pendingAction.current = event.data.action;
      discardSheet.current?.present();
    });
  }, [navigation, seeded]);
  // The iOS edge swipe is not interceptable by `beforeRemove` on the native stack, so it is off while there is something
  // to lose.
  useEffect(() => {
    if (seeded) return;
    navigation.setOptions({ gestureEnabled: !dirty });
  }, [navigation, dirty, seeded]);

  // Design seed: the Discard sheet open on arrival; on blur the sheet goes and the seeded draft with it, because the next
  // fixture pushes over this screen and the unmount reset would never run.
  const showDiscard = Boolean(design?.discard);
  useEffect(() => {
    if (showDiscard) discardSheet.current?.present();
  }, [showDiscard]);
  useFocusEffect(
    useCallback(() => {
      if (!seeded) return;
      return () => {
        discardSheet.current?.dismiss();
        deliveryDraft.reset();
      };
    }, [seeded])
  );
  const scrollRef = useRef<KeyboardAwareScrollView>(null);
  const scrolledTo = useRef(false);
  const viewportHeight = useRef(0);

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

  // 2097:29301: the sections sit on the canvas (REVIEW b3-02, no cards): 8 above the head, 12 between their parts.
  const section = { paddingTop: space.sm, gap: 12 } as const;

  const closer = stepKm(km, -1);
  const farther = stepKm(km, 1);
  // Off first, in the order the screen had when it came into view (or back from All areas): a chip
  // tapped here stays under the finger instead of jumping to the front.
  // Six chips, three rows, as every Delivery frame draws them; "See all" has the rest.
  const preview = previewAreas(areas, orderOff, 6);
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
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          enableOnAndroid
          extraScrollHeight={space.md}
          showsVerticalScrollIndicator={false}
          onLayout={(event) => {
            viewportHeight.current = event.nativeEvent.layout.height;
          }}
          onContentSizeChange={(_, height) => {
            // Design seed: scroll once the content is tall enough to reach the offset (the areas arrive after mount).
            const y = design?.scrollY;
            if (!y || scrolledTo.current || !viewportHeight.current || height - viewportHeight.current < y) return;
            scrolledTo.current = true;
            scrollRef.current?.scrollToPosition(0, y, false);
          }}
          contentContainerStyle={{
            paddingHorizontal: SCREEN_GUTTER,
            paddingTop: 16,
            paddingBottom: 24,
            gap: 16,
          }}
        >
          <Text role="screenTitle" accessibilityRole="header">
            Where you deliver
          </Text>

          {/* On the canvas, no lavender card (REVIEW b3-02): 12 above and below, 16 to the switch. */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16, paddingVertical: 12 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text fontSize="text-md" fontWeight="font-semibold">
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
              <View style={section}>
                <Text fontSize="text-md" fontWeight="font-semibold" accessibilityRole="header">
                  Delivery fee
                </Text>
                {suggested ? (
                  <Text fontSize="text-sm" tone="brand">
                    Suggested. Change if you like.
                  </Text>
                ) : null}
                {/* The kit field's own 18 under it is taken back, so the section's 12 is the gap the frame draws. */}
                <View style={{ marginBottom: -density.fieldGap }}>
                  <TextField
                    label="Starting fee (₹)"
                    hint="Charged on every delivery"
                    keyboardType="decimal-pad"
                    value={form.base}
                    onChangeText={(v) => setFee("base", v)}
                    error={shown("base", "delivery_base_fee")}
                    placeholder="e.g. 50"
                  />
                </View>
                <View style={{ marginBottom: -density.fieldGap }}>
                  <TextField
                    label="Each kilometre (₹)"
                    hint="Added for every kilometre away"
                    keyboardType="decimal-pad"
                    value={form.perKm}
                    onChangeText={(v) => setFee("perKm", v)}
                    error={shown("perKm", "delivery_per_km")}
                    placeholder="e.g. 15"
                  />
                </View>
              </View>
              <View style={section}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
                  <Text fontSize="text-md" fontWeight="font-semibold" accessibilityRole="header" style={{ flex: 1 }}>
                    How far you go
                  </Text>
                  <Stepper
                    label={`Closer, now ${kmText(km)}`}
                    disabled={closer === null}
                    onPress={() => closer !== null && edit({ maxKm: String(closer) })}
                  >
                    <MinusIcon size={20} color={color.text} />
                  </Stepper>
                  <Text
                    fontSize="text-md"
                    fontWeight="font-semibold"
                    accessibilityLiveRegion="polite"
                    style={{ width: 56, textAlign: "center" }}
                  >
                    {km > 0 ? kmText(form.maxKm) : "—"}
                  </Text>
                  <Stepper
                    label={`Farther, now ${kmText(km)}`}
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
                    {design?.map === "placeholder" ? (
                      <DistanceMapPlaceholder />
                    ) : (
                      <DistanceMap coordinates={shop.coordinates} km={km} />
                    )}
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
                  {noAddress
                    ? "Measured in a straight line from your shop, not by road."
                    : "Measured in a straight line, not by road. If the road is much longer, like across a creek, turn that area off below. Go farther and new areas are turned on for you."}
                </Text>
              </View>

              {noAddress ? (
                // 2097:29434 "No shop address": the one boxed block, r12, 16 inside the 1pt edge.
                <View style={{ borderWidth: 1, borderColor: color.line, borderRadius: 12, padding: 16, gap: space.sm }}>
                  <Text fontSize="text-md" fontWeight="font-semibold" accessibilityRole="header">
                    Add your shop address first
                  </Text>
                  <Text fontSize="text-sm" tone="body">
                    Delivery distance is measured from your shop.
                  </Text>
                  <Button
                    variant="outline"
                    tone="tonal"
                    size="compact"
                    onPress={() => navigation.navigate("ShopAddress")}
                  >
                    Add shop address
                  </Button>
                </View>
              ) : noAreas ? null : (
                <View style={section}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    {/* Shrinks, so "N off" stays on screen at a large font size on a 360dp phone. */}
                    <Text fontSize="text-md" fontWeight="font-semibold" accessibilityRole="header" style={{ flexShrink: 1 }}>
                      Areas you deliver to
                    </Text>
                    {offCount > 0 ? (
                      <Text fontSize="text-sm" fontWeight="font-semibold" style={{ color: color.dangerStrong }}>
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
                        <Skeleton key={i} width={width} height={50} borderRadius={radius.button} />
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
                          <Text fontSize="text-sm" fontWeight="font-semibold" tone="brand" style={{ flex: 1 }}>
                            See all {areas.length} areas, nearest first
                          </Text>
                          <ChevronRightIcon size={20} color={color.brandText} />
                        </TouchableOpacity>
                      ) : null}
                      {everyOff ? (
                        <View accessibilityLiveRegion="polite">
                          <Notice tone="warning" title="Every area is off">
                            Nobody can get delivery. Customers can still pick up.{"\n"}
                            <Text
                              fontSize="text-sm"
                              fontWeight="font-semibold"
                              tone="brand"
                              accessibilityRole="link"
                              onPress={() => setDelivers(false)}
                            >
                              Turn delivery off instead
                            </Text>
                          </Notice>
                        </View>
                      ) : null}
                    </>
                  )}
                </View>
              )}
            </>
          ) : null}

          {shop.is_merchant ? (
            // 2097:29301 "Dashboard note": 8 in from the gutter, an 18 glyph, 8 to the text.
            <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm, paddingHorizontal: space.sm }}>
              <ComputerDesktopIcon size={18} color={color.textDim} />
              <Text fontSize="text-sm" tone="dim" style={{ flex: 1 }}>
                Distance, areas and fees are also on the dashboard.
              </Text>
            </View>
          ) : null}
        </KeyboardAwareScrollView>
      </FieldFrame>

      {/* Pinned: what isn't saved over the kit bar (D6), whose Discard link drops it. Save keeps the owner here. The strip
          carries the hairline, so the bar under it draws none. */}
      {formError || summary ? (
        <View
          style={{
            paddingHorizontal: SCREEN_GUTTER,
            paddingTop: 12,
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
            <Text fontSize="text-sm" tone="body" accessibilityLiveRegion="polite">
              Unsaved: {summary}
            </Text>
          ) : null}
        </View>
      ) : null}
      <BottomBar
        layout={summary ? "cta-text" : "full-cta"}
        primary={{ label: "Save changes", disabled: !dirty, loading: saving, onPress: () => void save() }}
        secondary={
          summary
            ? { label: "Discard", accessibilityLabel: "Discard changes", disabled: saving, onPress: discard }
            : undefined
        }
        style={formError || summary ? { borderTopWidth: 0 } : undefined}
      />

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
  const route = useRoute();
  const design = __DEV__ ? (route.params as { design?: DeliveryDesign } | undefined)?.design : undefined;

  // The draft lives while this screen does: All areas, pushed on top, edits it too.
  useEffect(() => () => deliveryDraft.reset(), []);

  // Design seed: the draft goes in before the editor mounts (its `orderOff` is read once, so Juhu sorts first), and under
  // a seed it always goes in, so a draft an earlier fixture left behind is replaced or cleared. A layout effect, not the
  // render: an earlier fixture's editor may still be mounted underneath and subscribed to the store.
  const [draftSeeded, setDraftSeeded] = useState(!design);
  const shop = query.data;
  useLayoutEffect(() => {
    if (draftSeeded || !design || !shop) return;
    deliveryDraft.set(design.draft ? { ...deliveryDraftFrom(shop), ...design.draft } : null);
    setDraftSeeded(true);
  }, [draftSeeded, design, shop]);

  return (
    <NonScrollableContainer>
      <SubpageHeader title="Delivery" />
      {((query.isLoading || query.isIdle) && !profileFailed) || (query.data && !draftSeeded) ? (
        <ShopLoading label="Loading your delivery settings" />
      ) : query.data ? (
        <DeliveryEditor shop={query.data} design={design} />
      ) : (
        <ShopLoadError
          error={query.error}
          onRetry={() => void (profileFailed ? fetchUserDetails() : query.refetch())}
        />
      )}
    </NonScrollableContainer>
  );
}
