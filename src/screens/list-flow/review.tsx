import { defaultPickupLocation, localityFor } from "@/backend/list-flow/pickup-location";
import { ruleForParent, useDepositRules } from "@/backend/list-flow/deposit-rules";
import useAddresses from "@/backend/useAddresses";
import {
  AddressPickerSheet,
  AddressPickerSheetHandle,
} from "@/components/addresses/address-picker-sheet";
import {
  Button,
  FieldFrame,
  FieldLabel,
  FieldShell,
  Text,
  TextField,
  usePressFeedback,
} from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { SegmentedChoice } from "@/components/core/segmented-choice";
import { CategorySheet } from "@/components/list-flow/category-sheet";
import {
  CONDITION_HINT,
  CONDITION_LABEL,
  evidenceHint,
  labelWithSource,
} from "@/components/list-flow/copy";
import { FlowHeader } from "@/components/list-flow/flow-header";
import { SpecSheet, SpecsCard } from "@/components/list-flow/specs-card";
import { AiValueFade, PulseOnce, useAppear } from "@/components/list-flow/motion";
import { useGlobalContext } from "@/context/global-context";
import { useListDraft } from "@/context/list-draft-context";
import { AddressType, PickedAddress, fullAddressForNewPin } from "@/lib/addresses";
import { CategoryIcon, categoryDisplayName } from "@/lib/category-icons";
import {
  SCREEN_GUTTER,
  density,
  fontFamily,
  fontSize,
  radius,
  space,
} from "@/lib/design-tokens";
import { formatNumber } from "@/lib/format";
import { DEFAULT_DEPOSIT_RULE, parseRate } from "@/lib/list-flow/deposit";
import {
  Requirement,
  canRunAgain,
  missingRequirements,
  prefilledCount,
  stillNeededLabel,
  uploadedPhotos,
} from "@/lib/list-flow/draft";
import { currentSpecs, specsLoading } from "@/lib/list-flow/specs";
import {
  CONDITIONS,
  CategoryValue,
  Condition,
  FieldName,
  ListingDraft,
  Spec,
  SpecValue,
} from "@/lib/list-flow/types";
import { createLocationRequest } from "@/lib/location-request";
import { useTheme } from "@/lib/theme";
import { RouteProps, useTypedNavigation } from "@/lib/types";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useRoute } from "@react-navigation/native";
import { Image } from "expo-image";
import React, { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, TextInput, TouchableOpacity, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import Animated from "react-native-reanimated";
import { ChevronRightIcon } from "react-native-heroicons/mini";
import { CheckIcon, MapPinIcon, PlusIcon } from "react-native-heroicons/outline";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type TextFieldName = "title" | "brand_name" | "model_name" | "description" | "usage_description";
type SectionKey = Requirement["key"];

const THUMB = 56;
/**
 * How long the pickup prefill waits for the saved addresses. They need the
 * profile to have loaded first; if either never arrives, the older sources
 * (last listing, GPS) must still get their turn.
 */
const ADDRESS_WAIT_MS = 4000;
const SAVE_AS: { value: AddressType; label: string }[] = [
  { value: "home", label: "Home" },
  { value: "work", label: "Work" },
  { value: "other", label: "Other" },
];

/** An "Rs" amount input on the shared field surface. */
function AmountInput({
  value,
  onChangeText,
  inputRef,
  accessibilityLabel,
  placeholder,
}: {
  value: string;
  onChangeText: (v: string) => void;
  inputRef?: React.RefObject<TextInput>;
  accessibilityLabel: string;
  placeholder?: string;
}) {
  const { color } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <FieldShell focused={focused}>
      <Text fontSize="text-md" fontWeight="font-bold" tone="body">
        Rs
      </Text>
      <TextInput
        ref={inputRef}
        accessibilityLabel={accessibilityLabel}
        keyboardType="number-pad"
        value={value}
        placeholder={placeholder}
        placeholderTextColor={color.placeholder}
        onChangeText={(v) => onChangeText(v.replace(/[^\d]/g, ""))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{ flex: 1, color: color.text, fontFamily: fontFamily.regular, fontSize: fontSize.md }}
      />
    </FieldShell>
  );
}

/** A tappable row on the field surface: category and pickup location. */
function PickerRow({
  icon,
  value,
  placeholder,
  onPress,
  accessibilityLabel,
}: {
  icon: React.ReactNode;
  value: string | null;
  placeholder: string;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  const { color } = useTheme();
  const feedback = usePressFeedback();
  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={onPress}
      onPressIn={feedback.onPressIn}
      onPressOut={feedback.onPressOut}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={feedback.pressStyle}
    >
      <FieldShell>
        {icon}
        <Text fontSize="text-md" tone={value ? "default" : "dim"} numberOfLines={1} style={{ flex: 1 }}>
          {value ?? placeholder}
        </Text>
        <ChevronRightIcon size={20} color={color.textDim} />
      </FieldShell>
    </TouchableOpacity>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const { color } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        gap: space.md,
        paddingVertical: space.sm,
        borderTopWidth: 1,
        borderTopColor: color.line,
      }}
    >
      <Text fontSize="text-sm" fontWeight="font-bold">
        {label}
      </Text>
      <Text fontSize="text-sm" tone="body" style={{ flex: 1, textAlign: "right" }}>
        {value}
      </Text>
    </View>
  );
}

/**
 * L-14 Review, IMPLEMENTATION.md §8.4.
 *
 * Every field keeps its space whether it is filled or not, so values the
 * stream delivers after the owner arrives fade in where they belong instead
 * of pushing the form around under a finger (§8.4).
 */
export default function ListReviewScreen() {
  const navigation = useTypedNavigation();
  const route = useRoute<RouteProps<"ListReview">>();
  const manual = Boolean(route.params?.manual);
  const { color } = useTheme();
  const appear = useAppear();
  const insets = useSafeAreaInsets();
  const { categories } = useGlobalContext();
  const flow = useListDraft();
  const { draft, run } = flow;
  const { data: rules } = useDepositRules();

  const scrollRef = useRef<KeyboardAwareScrollView>(null);
  const depositRef = useRef<TextInput>(null);
  const categorySheet = useRef<BottomSheetModal>(null);
  const specSheet = useRef<BottomSheetModal>(null);
  const [openSpec, setOpenSpec] = useState<Spec | null>(null);
  const addressSheet = useRef<AddressPickerSheetHandle>(null);
  const {
    addresses,
    loading: addressesLoading,
    isError: addressesFailed,
  } = useAddresses();
  const sectionY = useRef<Partial<Record<SectionKey | "deposit", number>>>({});
  const editedOnce = useRef(new Set<FieldName>());
  const [showMissing, setShowMissing] = useState(false);
  const priceWasValid = useRef(false);

  // Whether the model failed to identify the item (§8.3): it said so, or it
  // reported the category blank. A failed or rate-limited run says nothing
  // about the item, and a resumed draft has no run to ask.
  const aiMissedItem =
    !manual &&
    Boolean(draft) &&
    draft?.reviewNote === null &&
    (Boolean(draft?.warnings.some((w) => w.type === "not_an_item")) ||
      run.checklist.some((row) => row.field === "category" && row.status === "blank"));

  // Category moves to the top only if that was already known on arrival.
  // Moving it later, while the owner is part-way down the form, would be
  // exactly the layout jump §8.4 rules out.
  const [categoryFirst] = useState(
    () => aiMissedItem && run.status !== "running" && !draft?.fields.category.value
  );

  useEffect(() => {
    if (!draft) return;
    flow.track("review_opened", { prefilled_count: prefilledCount(draft) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // §8.5: fill the pickup location from the best source we have, once. The
  // default saved address comes first, so this waits for the address query to
  // settle. A failed query settles too, and simply has no default to offer.
  const [addressWaitOver, setAddressWaitOver] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setAddressWaitOver(true), ADDRESS_WAIT_MS);
    return () => clearTimeout(timer);
  }, []);
  const addressesSettled = !addressesLoading || addressWaitOver;
  // Which passes have run: `early` is the one the wait gave up on, without the
  // addresses; `loaded` is the one that had them.
  const prefillPass = useRef({ early: false, loaded: false });
  const onScreen = useRef(true);
  useEffect(
    () => () => {
      onScreen.current = false;
    },
    []
  );
  useEffect(() => {
    if (!addressesSettled) return;
    const pass = addressesLoading ? "early" : "loaded";
    if (prefillPass.current.loaded || prefillPass.current[pass]) return;
    const afterEarly = prefillPass.current.early;
    prefillPass.current[pass] = true;
    const saved = addresses.find((a) => a.is_default) ?? null;
    // Addresses that arrive after the wait get a second pass, but only to
    // bring the default in: the older sources have had their turn.
    if (afterEarly && !saved) return;
    if (!draft || draft.fields.location.source !== "empty") return;
    void defaultPickupLocation(saved).then((location) => {
      // `prefillLocation` only fills a field nobody has set, so a late default
      // never replaces a location that is already there.
      if (onScreen.current && location) flow.dispatch({ type: "prefillLocation", value: location });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addressesSettled, addressesLoading]);

  // §8.8, D14: the "save this address" intent belongs to an owner with no
  // saved address. A resumed draft can carry it past that point (an address
  // added from Profile in between), so it is dropped once the list says so.
  const staleSaveIntent =
    !addressesLoading && addresses.length > 0 && Boolean(draft?.saveAddressAs);
  useEffect(() => {
    if (staleSaveIntent) flow.dispatch({ type: "setSaveAddressAs", value: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staleSaveIntent]);

  // Specs for a category that arrived before this screen could ask — a
  // resumed draft, or a taxonomy that loaded after the stream named the
  // category. A no-op when they are already here or on the way.
  useEffect(() => {
    flow.ensureSpecs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories]);

  // The deposit default follows the chosen category's rule.
  const parent = draft?.fields.category.value?.parent;
  useEffect(() => {
    if (!draft || !rules) return;
    const rule = ruleForParent(rules, parent);
    const current = draft.depositRule;
    if (
      current &&
      current.multiplier === rule.multiplier &&
      current.floor === rule.floor &&
      current.round_to === rule.round_to
    ) {
      return;
    }
    flow.dispatch({ type: "setDepositRule", rule });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parent, rules]);

  if (!draft) return <NonScrollableContainer>{null}</NonScrollableContainer>;
  const f = draft.fields;

  // ---- Edits and their events -------------------------------------------------

  const noteFirstEdit = (field: FieldName, d: ListingDraft) => {
    if (editedOnce.current.has(field)) return;
    editedOnce.current.add(field);
    flow.track("field_edited", { field, source_before: d.fields[field].source });
  };

  const edit = (field: Exclude<FieldName, "condition">, value: unknown) => {
    noteFirstEdit(field, draft);
    flow.dispatch({ type: "editField", field, value });
  };

  const onRate = (value: string) => {
    edit("rate", value);
    const valid = parseRate(value) !== null;
    if (valid && !priceWasValid.current) flow.track("price_entered");
    priceWasValid.current = valid;
  };

  const onDeposit = (value: string) => {
    if (!draft.depositTouched) flow.track("deposit_changed");
    edit("security_deposit", value);
  };

  const onCondition = (value: Condition) => {
    flow.track("condition_confirmed", {
      value,
      matched_ai: draft.conditionProposal !== null && value === draft.conditionProposal,
    });
    flow.dispatch({ type: "confirmCondition", value });
  };

  const onCategory = (value: CategoryValue) => {
    categorySheet.current?.dismiss();
    // A different category clears the specs in the reducer (the sheet said
    // so); this asks for the new one's.
    edit("category", value);
    flow.ensureSpecs();
  };

  const onPressSpec = (spec: Spec) => {
    setOpenSpec(spec);
    specSheet.current?.present();
  };

  const onSaveSpec = (value: SpecValue | null) => {
    specSheet.current?.dismiss();
    if (openSpec) flow.dispatch({ type: "setSpec", key: openSpec.key, value });
  };

  const fillForCategory = () => {
    const hint = draft.fields.category.value;
    if (!hint) return;
    // Titles only: the extraction service's hint shape predates category ids.
    flow.startExtraction({ categoryHint: { parent: hint.parent, title: hint.title } });
  };

  // The flat/landmark text when the pin moves to a point that is not a saved
  // address — one rule for the sheet's "Use current location" and for the map
  // opened directly: text a saved address supplied stays behind, text the
  // owner typed comes along.
  const fullAddressForUnsavedPin = () =>
    fullAddressForNewPin(flow.draft?.fields.location.value?.fullAddress ?? "", addresses);

  // What the address sheet hands back: a saved address with its own flat and
  // landmark, or a one-off spot with none. Editing the field afterwards
  // changes this listing only, never the saved address.
  const onPickAddress = (picked: PickedAddress) => {
    edit("location", {
      locality: picked.locality,
      fullAddress: picked.saved
        ? [picked.addressLine1, picked.addressLine2].filter(Boolean).join(", ")
        : fullAddressForUnsavedPin(),
      lat: picked.lat,
      long: picked.long,
    });
  };

  const openLocationPicker = () => {
    // The map opens directly, as it always has, only for an owner known to
    // have nothing saved (D16) or whose list failed to load. While the list
    // is still loading the sheet opens and shows that; treating "not loaded
    // yet" as "none" sent owners with saved addresses to the map.
    if (addressesLoading || addresses.length > 0) {
      addressSheet.current?.present();
      return;
    }
    navigation.navigate("LocationModal", {
      requestId: createLocationRequest(async (coords) => {
        // The picker's "skip" is not a request to forget a location.
        if (!coords) return;
        // Never the picker's own address line: it is street-level, and
        // `location` is public. If the point cannot be named, the locality
        // stays empty and Preview keeps asking for a pickup location.
        const locality = (await localityFor(coords.latitude, coords.longitude)) ?? "";
        edit("location", {
          locality,
          fullAddress: fullAddressForUnsavedPin(),
          lat: coords.latitude,
          long: coords.longitude,
        });
      }),
    });
  };

  // ---- Preview gate -------------------------------------------------------------

  const missing = missingRequirements(draft);
  const ready = missing.length === 0;

  const onBlockedPreview = () => {
    setShowMissing(true);
    const first = missing[0];
    const y = first ? sectionY.current[first.key] : undefined;
    if (y !== undefined) scrollRef.current?.scrollToPosition(0, Math.max(0, y - space.md), true);
  };

  const onLayoutSection = (key: SectionKey | "deposit") => (e: { nativeEvent: { layout: { y: number } } }) => {
    sectionY.current[key] = e.nativeEvent.layout.y;
  };

  // ---- Derived display ------------------------------------------------------------

  const rate = parseRate(f.rate.value);
  const rule = draft.depositRule ?? DEFAULT_DEPOSIT_RULE;
  const deposit = f.security_deposit.value;
  const photos = draft.photos;
  const streaming = run.status === "running";
  const note =
    draft.reviewNote === "quota"
      ? "You've used today's AI fills — you can still list by hand."
      : draft.reviewNote === "failed"
      ? "We couldn't read your photos this time — fill in what's missing."
      : null;
  const categoryLabel = f.category.value
    ? `${categoryDisplayName(f.category.value.title)} · ${categoryDisplayName(f.category.value.parent)}`
    : null;
  // §8.8: offered only to an owner who is known to have no saved address
  // (D14) — not while the list is loading, and not when it failed to load.
  const showSaveOffer =
    !addressesLoading && !addressesFailed && addresses.length === 0 && Boolean(f.location.value);
  const showFillRest =
    aiMissedItem &&
    run.status === "done" &&
    f.category.source === "user" &&
    Boolean(f.category.value) &&
    canRunAgain(draft) &&
    !streaming &&
    uploadedPhotos(draft).length > 0;

  const textField = (
    field: TextFieldName,
    label: string,
    noun: string,
    placeholder: string,
    options: { multiline?: boolean; required?: boolean } = {}
  ) => {
    const state = f[field];
    return (
      <AiValueFade value={state.value} active={state.source === "ai"}>
        <TextField
          label={labelWithSource(label, state.source)}
          required={options.required}
          hint={state.value ? undefined : evidenceHint(state.evidence, noun)}
          placeholder={placeholder}
          value={state.value ?? ""}
          onChangeText={(v) => edit(field, v)}
          multiline={options.multiline}
          maxLength={field === "title" ? 60 : field === "description" ? 400 : undefined}
        />
      </AiValueFade>
    );
  };

  const specs = currentSpecs(draft);
  const categorySection = (
    <>
      <Animated.View
        layout={appear.layout}
        onLayout={onLayoutSection("category")}
        style={{ marginBottom: density.fieldGap }}
      >
        <FieldLabel label={labelWithSource("Category", f.category.source)} required />
        {/* The label, not the value: the app attaching the id to the model's
            category is not a new value, and must not wash the field again. */}
        <AiValueFade value={categoryLabel} active={f.category.source === "ai"}>
          <PickerRow
            icon={
              <CategoryIcon
                name={f.category.value?.parent ?? ""}
                size={20}
                color={f.category.value ? color.text : color.textDim}
              />
            }
            value={categoryLabel}
            placeholder="Choose a category"
            onPress={() => categorySheet.current?.present()}
            accessibilityLabel={categoryLabel ? `Category, ${categoryLabel}` : "Choose a category"}
          />
        </AiValueFade>
        {showFillRest ? (
          <Button variant="outline" size="compact" style={{ marginTop: space.sm }} onPress={fillForCategory}>
            Fill the rest for this category
          </Button>
        ) : null}
      </Animated.View>
      <Animated.View layout={appear.layout} entering={appear.entering}>
        {/* Keyed on the category, so "Add more detail" folds again for a new one. */}
        <SpecsCard
          key={draft.specs.categoryId ?? "none"}
          specs={specs}
          loading={specsLoading(draft)}
          onPressSpec={onPressSpec}
        />
      </Animated.View>
    </>
  );

  return (
    <NonScrollableContainer>
      <FlowHeader step={3} />
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
          <View style={{ marginBottom: density.section }}>
            <Text fontSize="text-xl" fontWeight="font-bold" accessibilityRole="header">
              {"Two quick checks,\nthen submit."}
            </Text>
            <Text tone="body" fontSize="text-md" style={{ marginTop: space.sm }}>
              We filled in what we were sure about and left the rest blank. Set a price and confirm
              the condition, and glance over anything marked AI.
            </Text>
            {/* One reserved line, so the form below does not jump when the
                stream ends or a note appears. */}
            <Text
              fontSize="text-sm"
              tone={note ? "warning" : "brand"}
              accessibilityLiveRegion="polite"
              style={{ marginTop: space.sm, minHeight: 21 }}
            >
              {streaming ? "Still reading your photos" : note ?? ""}
            </Text>
          </View>

          {/* Photos strip */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: density.section }}>
            <View style={{ flexDirection: "row", gap: space.sm }}>
              {photos.map((photo) => (
                <Image
                  key={photo.id}
                  source={{ uri: photo.remoteUrl ?? photo.localUri }}
                  style={{ width: THUMB, height: THUMB, borderRadius: radius.input, backgroundColor: color.skeleton }}
                  contentFit="cover"
                />
              ))}
              <TouchableOpacity
                onPress={() => navigation.navigate("ListAddPhotos")}
                accessibilityRole="button"
                accessibilityLabel="Add more photos"
                style={{
                  height: THUMB,
                  paddingHorizontal: space.md,
                  borderRadius: radius.input,
                  borderWidth: 1,
                  borderStyle: "dashed",
                  borderColor: color.inputLine,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: space.xs,
                }}
              >
                <PlusIcon size={18} color={color.textDim} />
                <Text fontSize="text-sm" tone="dim">
                  add more any time
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {categoryFirst ? categorySection : null}

          {/* Check 1 · price per day */}
          <View onLayout={onLayoutSection("rate")} style={{ marginBottom: density.fieldGap }}>
            <FieldLabel label="Check 1 · price per day" required />
            <PulseOnce>
              <AmountInput
                accessibilityLabel="Price per day"
                value={f.rate.value ?? ""}
                onChangeText={onRate}
                placeholder="0"
              />
            </PulseOnce>
            <Text fontSize="text-xs" tone="body" style={{ marginTop: space.xs }}>
              Think about what you'd pay to borrow it for a day.
            </Text>
            {rate !== null && deposit ? (
              <Animated.View entering={appear.entering} exiting={appear.exiting}>
                <Text fontSize="text-sm" tone="body" style={{ marginTop: 2 }}>
                  {draft.depositTouched
                    ? `Deposit Rs ${formatNumber(deposit)} · `
                    : `Deposit Rs ${formatNumber(deposit)} · ${formatNumber(rule.multiplier)} × your daily rate · `}
                  <Text
                    fontSize="text-sm"
                    fontWeight="font-bold"
                    tone="brand"
                    accessibilityRole="button"
                    onPress={() => {
                      const y = sectionY.current.deposit;
                      if (y !== undefined) scrollRef.current?.scrollToPosition(0, Math.max(0, y - space.md), true);
                      depositRef.current?.focus();
                    }}
                  >
                    change
                  </Text>
                </Text>
              </Animated.View>
            ) : null}
          </View>

          {/* Check 2 · condition — glides down as the deposit line appears. */}
          <Animated.View
            layout={appear.layout}
            onLayout={onLayoutSection("condition")}
            style={{ marginBottom: density.fieldGap }}
          >
            <FieldLabel label="Check 2 · condition" required />
            <PulseOnce>
              <SegmentedChoice<Condition>
                accessibilityLabel="Condition"
                value={draft.conditionConfirmed ? f.condition.value : null}
                suggested={draft.conditionProposal}
                suggestedLabel="AI's guess"
                onChange={onCondition}
                options={CONDITIONS.map((c) => ({
                  value: c,
                  label: CONDITION_LABEL[c],
                  hint: CONDITION_HINT[c],
                }))}
              />
            </PulseOnce>
            <Text fontSize="text-xs" tone="body" style={{ marginTop: space.xs }}>
              Pick what's true — it protects you if there's ever a dispute.
            </Text>
          </Animated.View>

          {categoryFirst ? null : categorySection}

          <View onLayout={onLayoutSection("title")}>
            {textField("title", "Title", "title", "e.g. Sony PS5 with 2 controllers", { required: true })}
          </View>
          {textField("brand_name", "Brand", "brand", "e.g. Sony")}
          {textField("model_name", "Model", "model", "e.g. CFI-1216A")}
          <View onLayout={onLayoutSection("description")}>
            {textField("description", "Description", "description", "What it is and what's included", {
              multiline: true,
              required: true,
            })}
          </View>

          <TextField
            label="Usage tips · optional"
            placeholder="e.g. Update the console before the first game"
            value={f.usage_description.value ?? ""}
            onChangeText={(v) => edit("usage_description", v)}
            multiline
          />

          {/* Pickup location */}
          <View onLayout={onLayoutSection("location")} style={{ marginBottom: density.fieldGap }}>
            <FieldLabel label="Pickup location" required />
            <PickerRow
              icon={<MapPinIcon size={20} color={f.location.value ? color.text : color.textDim} />}
              value={f.location.value?.locality || null}
              placeholder="Set pickup location"
              onPress={openLocationPicker}
              accessibilityLabel={
                f.location.value?.locality ? `Pickup location, ${f.location.value.locality}` : "Set pickup location"
              }
            />
          </View>
          {f.location.value ? (
            <TextField
              label="Flat, building and landmark"
              hint="Shared only once a booking is confirmed"
              placeholder="e.g. Flat 1203, Lodha Amara, near the clubhouse"
              value={f.location.value.fullAddress}
              onChangeText={(v) =>
                f.location.value && edit("location", { ...f.location.value, fullAddress: v })
              }
            />
          ) : null}

          {showSaveOffer ? (
            <View
              style={{
                marginBottom: density.fieldGap,
                padding: space.md,
                gap: space.sm,
                borderRadius: radius.group,
                backgroundColor: color.surfaceRaised,
              }}
            >
              <Text fontSize="text-sm" fontWeight="font-bold">
                Save this address for next time
              </Text>
              <View style={{ flexDirection: "row", gap: space.sm }}>
                {SAVE_AS.map((option) => {
                  const selected = draft.saveAddressAs === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={`Save as ${option.label}`}
                      activeOpacity={0.6}
                      // The chip is drawn 36 pt tall; this brings the target to 44.
                      hitSlop={{ top: 4, bottom: 4 }}
                      // Only the intent is kept: the address is created after
                      // the listing is submitted (Preview), from the location
                      // as it stands then. Tapping the chosen chip clears it.
                      onPress={() =>
                        flow.dispatch({
                          type: "setSaveAddressAs",
                          value: selected ? null : option.value,
                        })
                      }
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: space.xs,
                        minHeight: density.chip,
                        paddingHorizontal: space.md,
                        borderRadius: radius.full,
                        borderWidth: 1,
                        borderColor: selected ? color.brand : color.inputLine,
                        backgroundColor: selected ? color.brandWash : color.surface,
                      }}
                    >
                      {selected ? <CheckIcon size={16} color={color.brandText} /> : null}
                      <Text
                        fontSize="text-sm"
                        fontWeight={selected ? "font-bold" : "font-normal"}
                        tone={selected ? "brand" : "default"}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {draft.saveAddressAs ? (
                <Text fontSize="text-xs" tone="body" accessibilityLiveRegion="polite">
                  Saved to your addresses when you publish.
                </Text>
              ) : null}
            </View>
          ) : null}

          {/* Also set for you */}
          <View
            onLayout={onLayoutSection("deposit")}
            style={{
              marginBottom: density.section,
              padding: space.md,
              borderRadius: radius.group,
              backgroundColor: color.surfaceRaised,
            }}
          >
            <Text role="groupHeader" style={{ marginBottom: space.sm }}>
              Also set for you
            </Text>
            <FieldLabel label="Deposit" />
            <AmountInput
              inputRef={depositRef}
              accessibilityLabel="Deposit"
              value={deposit ?? ""}
              onChangeText={onDeposit}
              placeholder={String(rule.floor)}
            />
            <View style={{ marginTop: space.md }}>
              <InfoRow label="Availability" value="Available now · block dates after you submit" />
              <InfoRow label="Contact" value="You · from your profile" />
            </View>
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
        {!ready && showMissing ? (
          <Text
            fontSize="text-sm"
            tone="dim"
            accessibilityLiveRegion="polite"
            style={{ textAlign: "center", marginBottom: space.sm }}
          >
            {stillNeededLabel(missing)}
          </Text>
        ) : null}
        {ready ? (
          <Button onPress={() => navigation.navigate("ListPreview")}>Preview listing</Button>
        ) : (
          // A disabled button swallows taps; this catches them so a tap on it
          // still takes the owner to the first thing it is waiting for.
          <Pressable
            onPress={onBlockedPreview}
            accessibilityRole="button"
            accessibilityState={{ disabled: true }}
            accessibilityLabel="Preview listing"
            accessibilityHint={stillNeededLabel(missing)}
          >
            <View pointerEvents="none">
              <Button disabled>Preview listing</Button>
            </View>
          </Pressable>
        )}
      </View>

      <CategorySheet
        ref={categorySheet}
        categories={categories}
        onSelect={onCategory}
        note={specs.length > 0 ? "Changing the category clears the specs." : null}
      />
      <SpecSheet
        ref={specSheet}
        spec={openSpec}
        onSave={onSaveSpec}
        onCancel={() => specSheet.current?.dismiss()}
      />
      <AddressPickerSheet
        ref={addressSheet}
        selected={f.location.value ? { lat: f.location.value.lat, long: f.location.value.long } : undefined}
        onPick={onPickAddress}
      />
    </NonScrollableContainer>
  );
}
