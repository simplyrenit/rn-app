import { defaultPickupLocation, localityFor } from "@/backend/list-flow/pickup-location";
import { ruleForParent, useDepositRules } from "@/backend/list-flow/deposit-rules";
import useAddresses from "@/backend/useAddresses";
import {
  AddressPickerSheet,
  AddressPickerSheetHandle,
} from "@/components/addresses/address-picker-sheet";
import { PickerField, PickupField } from "@/components/addresses/pickup-field";
import { Notice } from "@/components/booking/parts";
import {
  BottomBar,
  Button,
  FieldLabel,
  FieldShell,
  SectionHeader,
  StepProgress,
  Text,
  TextField,
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
import { PickedAddress, canSaveOffered, flatForPickedSpot } from "@/lib/addresses";
import { CategoryIcon, categoryDisplayName } from "@/lib/category-icons";
import {
  SCREEN_GUTTER,
  density,
  fontFamily,
  fontSize,
  radius,
  space,
} from "@/lib/design-tokens";
import { formatCurrency, formatNumber } from "@/lib/format";
import { DEFAULT_DEPOSIT_RULE, computeDepositDefault } from "@/lib/list-flow/deposit";
import { DraftPlan, defaultUnit, derivedRate, toPlans } from "@/lib/plans";
import { PlanPricing } from "@/components/post/plan-pricing";
import {
  Requirement,
  canRunAgain,
  missingRequirements,
  prefilledCount,
  stillNeededLabel,
  uploadedPhotos,
} from "@/lib/list-flow/draft";
import { currentSpecs, specsLoading } from "@/lib/list-flow/specs";
import { MAX_QUANTITY_DIGITS, WORTH_HINT, parseWorth } from "@/lib/list-flow/stock";
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
import type { ListFlowDesign } from "@/dev/list-flow-seed";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useRoute } from "@react-navigation/native";
import { Image } from "expo-image";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, TextInput, TouchableOpacity, View } from "react-native";
import { AppSwitch } from "@/components/core/switch";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import Animated from "react-native-reanimated";
import { PlusIcon } from "react-native-heroicons/mini";

// Dev builds only: a design fixture's draft in place of the live one (ENG-435 plan §2a).
const seed: typeof import("@/dev/list-flow-seed") | null = __DEV__ ? require("@/dev/list-flow-seed") : null;

type TextFieldName = "title" | "brand_name" | "model_name" | "description" | "usage_description";
type SectionKey = Requirement["key"];

/** The photo strip's thumbs (2083:14692: 72, r12). */
const THUMB = 72;
/**
 * The Review frame's rhythm (2083:14692): 32 between sections, 24 between the detail fields, 12 from a label to its
 * picker or card. The kit TextField and PickupField already end in the form's 18pt field gap, so the gaps after them
 * are the difference.
 */
const SECTION_GAP = 32;
const DETAIL_GAP = 24;
const LABEL_GAP = 12;
/** A form label to its input, and an input to its helper line (kit Form field). */
const FIELD_GAP = 8;
/**
 * How long the pickup prefill waits for the saved addresses. They need the
 * profile to have loaded first; if either never arrives, the older sources
 * (last listing, GPS) must still get their turn.
 */
const ADDRESS_WAIT_MS = 4000;

/**
 * A digits-only input on the shared field surface: a ₹ amount by default,
 * or a bare count (`prefix={null}`). The frame sets the ₹ against the figure
 * ("₹350", 2083:14692), so the shell's 8pt gap is taken out.
 */
function AmountInput({
  value,
  onChangeText,
  inputRef,
  accessibilityLabel,
  placeholder,
  prefix = "₹",
  maxLength,
}: {
  value: string;
  onChangeText: (v: string) => void;
  inputRef?: React.RefObject<TextInput>;
  accessibilityLabel: string;
  placeholder?: string;
  prefix?: string | null;
  maxLength?: number;
}) {
  const { color } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <FieldShell focused={focused} style={{ gap: 0 }}>
      {prefix ? (
        <Text fontSize="text-md" lineHeight={24}>
          {prefix}
        </Text>
      ) : null}
      <TextInput
        ref={inputRef}
        accessibilityLabel={accessibilityLabel}
        keyboardType="number-pad"
        maxLength={maxLength}
        value={value}
        placeholder={placeholder}
        placeholderTextColor={color.placeholder}
        onChangeText={(v) => onChangeText(v.replace(/[^\d]/g, ""))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        // The core Text's cap, so the ₹ prefix and the figure scale together.
        maxFontSizeMultiplier={1.4}
        style={{ flex: 1, color: color.text, fontFamily: fontFamily.regular, fontSize: fontSize.md }}
      />
    </FieldShell>
  );
}

/** "Also set for you": a 12/16 label over its 14/20 value (2083:14692). */
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Text role="fieldHint">{label}</Text>
      <Text fontSize="text-sm" lineHeight={20}>
        {value}
      </Text>
    </View>
  );
}

/** A labelled amount, with its helper under the input as the kit Form field draws it. */
function AmountField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <View>
      <FieldLabel label={label} />
      {children}
      {hint ? (
        <Text role="fieldHint" style={{ marginTop: FIELD_GAP }}>
          {hint}
        </Text>
      ) : null}
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
  // Only DevFixture passes `design`: the frame's draft, with every action a no-op, and every write, navigation into
  // the flow and location prompt below returning early (plan §0).
  const design = __DEV__ ? (route.params as { design?: ListFlowDesign } | undefined)?.design : undefined;
  const { color } = useTheme();
  const appear = useAppear();
  const { categories } = useGlobalContext();
  const real = useListDraft();
  const seeded = useMemo(() => (design && seed ? seed.seededFlow(design) : null), [design]);
  const flow = seeded ?? real;
  const { draft, run } = flow;
  const { data: rules } = useDepositRules();

  const scrollRef = useRef<KeyboardAwareScrollView>(null);
  const depositRef = useRef<TextInput>(null);
  const categorySheet = useRef<BottomSheetModal>(null);
  const specSheet = useRef<BottomSheetModal>(null);
  const [openSpec, setOpenSpec] = useState<Spec | null>(null);
  // Under a seed that names a parent, the category sheet opens on its child list.
  const seedSheet = design?.sheet;
  const initialParent = useMemo(
    () =>
      seedSheet && typeof seedSheet === "object" && "category" in seedSheet
        ? categories.find((c) => c.title === seedSheet.category) ?? null
        : null,
    [seedSheet, categories]
  );
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
    // A seed never prefills: the default address, GPS and the reverse geocoder are all outside the fixture.
    if (design || !addressesSettled) return;
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

  // §8.8: the "save this address" intent can outlive what made it valid. A
  // resumed draft may find its Home taken (one added from Profile in
  // between), or the pickup may now be a saved address. It is dropped once
  // the list says so.
  const pickup = draft?.fields.location.value;
  const saveAs = draft?.saveAddressAs;
  const staleSaveIntent = Boolean(
    saveAs &&
      pickup &&
      !addressesLoading &&
      !addressesFailed &&
      !canSaveOffered(addresses, { address_type: saveAs, coordinates: pickup })
  );
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
      current.round_to === rule.round_to &&
      (current.worth_share ?? null) === (rule.worth_share ?? null)
    ) {
      return;
    }
    flow.dispatch({ type: "setDepositRule", rule });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parent, rules]);

  // A seed's sheet opens on mount, so the fixture shows it with no tap. After a frame: the modal's ref is set by then.
  const seedSpecKey = seedSheet && typeof seedSheet === "object" && "spec" in seedSheet ? seedSheet.spec : null;
  useEffect(() => {
    if (!seedSheet || !draft) return;
    const timer = setTimeout(() => {
      if (seedSpecKey) {
        const spec = currentSpecs(draft).find((s) => s.key === seedSpecKey);
        if (!spec) return;
        setOpenSpec(spec);
        specSheet.current?.present();
      } else if (seedSheet === "category" || (typeof seedSheet === "object" && "category" in seedSheet)) {
        categorySheet.current?.present();
      }
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedSheet]);

  // A seed's sheet is a root modal and stays over the next fixture's screen, which is pushed on top of this one.
  useEffect(() => {
    if (!seedSheet) return;
    return navigation.addListener("blur", () => {
      categorySheet.current?.dismiss();
      specSheet.current?.dismiss();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedSheet]);

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

  const onPlans = (value: DraftPlan[]) => {
    edit("plans", value);
    const valid = toPlans(value) !== null;
    if (valid && !priceWasValid.current) flow.track("price_entered");
    priceWasValid.current = valid;
  };

  const onDeposit = (value: string) => {
    if (!draft.depositTouched) flow.track("deposit_changed");
    edit("security_deposit", value);
  };

  const onWorth = (value: string) => edit("worth", value);

  // No analytics event: the events endpoint takes the names it knows, and none of
  // them is about worth.
  const onConfirmWorth = () => {
    if (design) return;
    flow.dispatch({ type: "confirmWorth" });
  };

  const onCondition = (value: Condition) => {
    flow.track("condition_confirmed", {
      value,
      matched_ai: draft.conditionProposal !== null && value === draft.conditionProposal,
    });
    flow.dispatch({ type: "confirmCondition", value });
  };

  const onCategory = (value: CategoryValue) => {
    if (design) return;
    categorySheet.current?.dismiss();
    // A different category clears the specs in the reducer (the sheet said
    // so); this asks for the new one's.
    edit("category", value);
    flow.ensureSpecs();
  };

  const onPressSpec = (spec: Spec) => {
    if (design) return;
    setOpenSpec(spec);
    specSheet.current?.present();
  };

  const onSaveSpec = (value: SpecValue | null) => {
    if (design) return;
    specSheet.current?.dismiss();
    if (openSpec) flow.dispatch({ type: "setSpec", key: openSpec.key, value });
  };

  const fillForCategory = () => {
    if (design) return;
    const hint = draft.fields.category.value;
    if (!hint) return;
    // Titles only: the extraction service's hint shape predates category ids.
    flow.startExtraction({ categoryHint: { parent: hint.parent, title: hint.title } });
  };

  // What the address sheet hands back: a saved address with its own flat and
  // landmark, or a one-off spot with none. `flatForPickedSpot` is the one rule
  // for the flat line, here and for the map opened directly. Editing the field
  // afterwards changes this listing only, never the saved address.
  const onPickAddress = (picked: PickedAddress) => {
    edit("location", {
      locality: picked.locality,
      fullAddress: flatForPickedSpot(flow.draft?.fields.location.value, picked, addresses),
      lat: picked.lat,
      long: picked.long,
    });
  };

  const openLocationPicker = () => {
    // Under a seed neither the sheet nor the map (and its location prompt) opens.
    if (design) return;
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
          fullAddress: flatForPickedSpot(
            flow.draft?.fields.location.value,
            { lat: coords.latitude, long: coords.longitude },
            addresses
          ),
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
    if (design) return;
    setShowMissing(true);
    const first = missing[0];
    const y = first ? sectionY.current[first.key] : undefined;
    if (y !== undefined) scrollRef.current?.scrollToPosition(0, Math.max(0, y - space.md), true);
  };

  const onLayoutSection = (key: SectionKey | "deposit") => (e: { nativeEvent: { layout: { y: number } } }) => {
    sectionY.current[key] = e.nativeEvent.layout.y;
  };

  // ---- Derived display ------------------------------------------------------------

  const rate = derivedRate(toPlans(f.plans.value));
  // Until the owner touches the price check the category picks the first
  // plan: furniture is rented by the month (ENG-281).
  const parentSlug = categories.find((c) => c.title === f.category.value?.parent)?.slug;
  const shownPlans = f.plans.value ?? [{ unit: defaultUnit(parentSlug), price: "", min: 1 }];
  const rule = draft.depositRule ?? DEFAULT_DEPOSIT_RULE;
  const deposit = f.security_deposit.value;
  // The default came from the worth share when the rate rule alone gives less (ENG-349).
  const depositFromWorth =
    computeDepositDefault(rate, rule, parseWorth(f.worth.value)) !==
    computeDepositDefault(rate, { ...rule, worth_share: null });
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
  const showFillRest =
    aiMissedItem &&
    run.status === "done" &&
    f.category.source === "user" &&
    Boolean(f.category.value) &&
    canRunAgain(draft) &&
    !streaming &&
    uploadedPhotos(draft).length > 0;

  // No required mark on any field: the frames draw none (2083:14692); the Preview gate and "Still needed" say
  // what is missing.
  const textField = (
    field: TextFieldName,
    label: string,
    noun: string,
    placeholder: string,
    options: { multiline?: boolean } = {}
  ) => {
    const state = f[field];
    return (
      <AiValueFade value={state.value} active={state.source === "ai"}>
        <TextField
          label={labelWithSource(label, state.source)}
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
        style={{ marginBottom: SECTION_GAP, gap: LABEL_GAP }}
      >
        <Text role="fieldLabel">{labelWithSource("Category", f.category.source)}</Text>
        {/* The label, not the value: the app attaching the id to the model's
            category is not a new value, and must not wash the field again. */}
        <AiValueFade value={categoryLabel} active={f.category.source === "ai"}>
          <PickerField
            icon={
              <CategoryIcon
                name={f.category.value?.parent ?? ""}
                size={20}
                color={f.category.value ? color.text : color.textDim}
              />
            }
            value={categoryLabel}
            placeholder="Choose a category"
            onPress={() => {
              if (design) return;
              categorySheet.current?.present();
            }}
            accessibilityLabel={categoryLabel ? `Category, ${categoryLabel}` : "Choose a category"}
          />
        </AiValueFade>
        {showFillRest ? (
          <Button variant="outline" size="compact" onPress={fillForCategory}>
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
          style={{ marginBottom: SECTION_GAP }}
        />
      </Animated.View>
    </>
  );

  const depositText = draft.depositTouched
    ? `Deposit ${formatCurrency(deposit)} · `
    : depositFromWorth
    ? `Deposit ${formatCurrency(deposit)} · ${formatNumber(rule.worth_share ?? 0)}% of what it's worth · `
    : `Deposit ${formatCurrency(deposit)} · ${formatNumber(rule.multiplier)} × your price a day · `;

  return (
    <NonScrollableContainer>
      <FlowHeader />
      <KeyboardAwareScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={space.md}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: SCREEN_GUTTER,
          paddingTop: 8,
          paddingBottom: SECTION_GAP,
        }}
      >
        {/* The kit Stepper scrolls with the form (2083:14692), under the 56 top bar. */}
        <View style={{ marginBottom: SECTION_GAP }}>
          <StepProgress step={3} total={4} showLabel={false} />
        </View>

        {/* Gaps are margins, not `gap`: the live region below is empty most of the time and must add no space. */}
        <View style={{ marginBottom: SECTION_GAP }}>
          {/* One Text per line: Android sets a hard "\n" line 3pt closer than its 28 line height (measured, 2094:24997). */}
          <View accessible accessibilityRole="header" accessibilityLabel="Two quick checks, then submit.">
            <Text role="screenTitle">Two quick checks,</Text>
            <Text role="screenTitle">then submit.</Text>
          </View>
          <Text tone="body" fontSize="text-sm" lineHeight={20} style={{ marginTop: 8 }}>
            We filled in what we were sure about and left the rest blank. Set a price and confirm
            the condition, and glance over anything marked AI.
          </Text>
          {/* A failed or rate-limited run says so in the kit Notice (2095:24558, 2095:24717). No frame draws the
              streaming line, so it stays a plain line. Nothing is reserved for either, so the form below moves
              when one appears (plan §5a #3). */}
          <View accessibilityLiveRegion="polite">
            {note ? (
              <View style={{ marginTop: 8 }}>
                <Notice tone="warning">{note}</Notice>
              </View>
            ) : streaming ? (
              <Text fontSize="text-sm" lineHeight={20} tone="brand" style={{ marginTop: 8 }}>
                Still reading your photos
              </Text>
            ) : null}
          </View>
        </View>

        {/* Photos strip */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SECTION_GAP }}>
          <View style={{ flexDirection: "row", gap: space.sm }}>
            {photos.map((photo) => (
              <Image
                key={photo.id}
                source={{ uri: photo.remoteUrl ?? photo.localUri }}
                style={{ width: THUMB, height: THUMB, borderRadius: radius.button, backgroundColor: color.skeleton }}
                contentFit="cover"
              />
            ))}
            <TouchableOpacity
              onPress={() => {
                if (design) return;
                navigation.navigate("ListAddPhotos");
              }}
              accessibilityRole="button"
              accessibilityLabel="Add more photos"
              style={{
                height: THUMB,
                paddingHorizontal: 16,
                borderRadius: radius.button,
                borderWidth: 1,
                borderStyle: "dashed",
                borderColor: color.line,
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
              }}
            >
              <PlusIcon size={18} color={color.textDim} />
              <Text fontSize="text-sm" lineHeight={20} tone="dim">
                add more any time
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {categoryFirst ? categorySection : null}

        {/* Check 1 · how it is rented, and the prices (ENG-281) */}
        <View onLayout={onLayoutSection("rate")} style={{ marginBottom: SECTION_GAP, gap: LABEL_GAP }}>
          <PulseOnce>
            <PlanPricing
              label="Check 1 · how you rent it"
              value={shownPlans}
              onChange={onPlans}
              dailyHint="Think about what you'd pay to borrow it for a day."
              showErrors={showMissing}
            />
          </PulseOnce>
          {rate !== null && deposit ? (
            <Animated.View entering={appear.entering} exiting={appear.exiting}>
              <Text fontSize="text-sm" lineHeight={20} tone="body">
                {depositText}
                <Text
                  fontSize="text-sm"
                  lineHeight={20}
                  fontWeight="font-semibold"
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
          style={{ marginBottom: SECTION_GAP, gap: LABEL_GAP }}
        >
          <SectionHeader title="Check 2 · condition" gutter={false} flush />
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
          <Text role="fieldHint">Pick what's true — it protects you if there's ever a dispute.</Text>
        </Animated.View>

        {categoryFirst ? null : categorySection}

        {/* The kit TextField ends in its 18pt field gap; each wrapper makes up the frame's 24 (32 after the last). */}
        <View onLayout={onLayoutSection("title")} style={{ marginBottom: DETAIL_GAP - density.fieldGap }}>
          {textField("title", "Title", "title", "e.g. Sony PS5 with 2 controllers")}
        </View>
        <View style={{ marginBottom: DETAIL_GAP - density.fieldGap }}>
          {textField("brand_name", "Brand", "brand", "e.g. Sony")}
        </View>
        <View style={{ marginBottom: DETAIL_GAP - density.fieldGap }}>
          {textField("model_name", "Model", "model", "e.g. CFI-1216A")}
        </View>
        <View onLayout={onLayoutSection("description")} style={{ marginBottom: DETAIL_GAP - density.fieldGap }}>
          {textField("description", "Description", "description", "What it is and what's included", {
            multiline: true,
          })}
        </View>
        <View style={{ marginBottom: SECTION_GAP - density.fieldGap }}>
          <TextField
            label="Usage tips · optional"
            placeholder="e.g. Update the console before the first game"
            value={f.usage_description.value ?? ""}
            onChangeText={(v) => edit("usage_description", v)}
            multiline
          />
        </View>

        {/* Pickup (it ends in the form's field gap too) */}
        <View onLayout={onLayoutSection("location")} style={{ marginBottom: SECTION_GAP - density.fieldGap }}>
          <PickupField
            location={f.location.value}
            addresses={addresses}
            addressesKnown={!addressesLoading && !addressesFailed}
            addressesSettled={addressesSettled}
            saveAs={draft.saveAddressAs ?? null}
            onChange={openLocationPicker}
            onChangeFlat={(v) =>
              f.location.value && edit("location", { ...f.location.value, fullAddress: v })
            }
            onSaveAs={(value) => flow.dispatch({ type: "setSaveAddressAs", value })}
          />
        </View>

        {/* Worth and stock (ENG-155). Worth is needed to publish: it decides whether
            you must check the customer's ID at the handover. A figure suggested from the photos is already in
            the box, and counts once it is confirmed or changed. Nothing here says
            where the figure came from. */}
        <View onLayout={onLayoutSection("worth")} style={{ marginBottom: SECTION_GAP, gap: LABEL_GAP }}>
          <AmountField label="Worth" hint={WORTH_HINT}>
            <AmountInput
              accessibilityLabel="Worth"
              value={f.worth.value ?? ""}
              onChangeText={onWorth}
              placeholder="e.g. 45000"
            />
          </AmountField>
          {f.worth.source === "ai" && f.worth.value ? (
            <Animated.View
              entering={appear.entering}
              exiting={appear.exiting}
              style={{ flexDirection: "row", alignItems: "center", gap: 16 }}
            >
              <Text fontSize="text-sm" lineHeight={20} tone="body" style={{ flex: 1 }}>
                Is this about right? Change it, or confirm it.
              </Text>
              <Button variant="outline" size="compact" onPress={onConfirmWorth} accessibilityLabel="Confirm worth">
                Confirm
              </Button>
            </Animated.View>
          ) : null}
        </View>

        <View onLayout={onLayoutSection("quantity")} style={{ marginBottom: SECTION_GAP }}>
          <AmountField label="In stock" hint="How many of this item you have to rent out">
            <AmountInput
              accessibilityLabel="In stock"
              prefix={null}
              maxLength={MAX_QUANTITY_DIGITS}
              value={f.quantity.value ?? ""}
              onChangeText={(v) => edit("quantity", v)}
              placeholder="1"
            />
          </AmountField>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            marginBottom: SECTION_GAP,
          }}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <Text fontSize="text-md" lineHeight={24} fontWeight="font-semibold">
              This product is not delivered
            </Text>
            <Text role="fieldHint">Even if you deliver, this one is for pickup only.</Text>
          </View>
          <AppSwitch
            accessibilityLabel="This product is not delivered"
            value={Boolean(draft.notDelivered)}
            onValueChange={(value) => flow.dispatch({ type: "setNotDelivered", value })}
            trackColor={{ true: color.brand, false: color.line }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Also set for you */}
        <View onLayout={onLayoutSection("deposit")} style={{ gap: 16 }}>
          <Text role="groupHeader">Also set for you</Text>
          <AmountField label="Deposit">
            <AmountInput
              inputRef={depositRef}
              accessibilityLabel="Deposit"
              value={deposit ?? ""}
              onChangeText={onDeposit}
              placeholder={String(rule.floor)}
            />
          </AmountField>
          <InfoRow label="Availability" value="Available now · block dates after you submit" />
          <InfoRow label="Contact" value="You · from your profile" />
        </View>
      </KeyboardAwareScrollView>

      {/* The kit Bottom bar's children mode: its hairline and insets, with the "Still needed" line over the
          button, and the button wrapped so a tap on it while it is disabled still goes somewhere. */}
      <BottomBar>
        {!ready && showMissing ? (
          <Text fontSize="text-sm" tone="dim" accessibilityLiveRegion="polite" style={{ textAlign: "center" }}>
            {stillNeededLabel(missing)}
          </Text>
        ) : null}
        {ready ? (
          <Button
            onPress={() => {
              if (design) return;
              navigation.navigate("ListPreview");
            }}
          >
            Preview listing
          </Button>
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
      </BottomBar>

      <CategorySheet
        ref={categorySheet}
        categories={categories}
        onSelect={onCategory}
        note={specs.length > 0 ? "Changing the category clears the specs." : null}
        initialParent={initialParent}
      />
      <SpecSheet
        ref={specSheet}
        spec={openSpec}
        onSave={onSaveSpec}
        onCancel={() => {
          if (design) return;
          specSheet.current?.dismiss();
        }}
      />
      <AddressPickerSheet
        ref={addressSheet}
        selected={f.location.value ?? undefined}
        onPick={onPickAddress}
      />
    </NonScrollableContainer>
  );
}
