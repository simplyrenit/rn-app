import { defaultPickupLocation, localityFor } from "@/backend/list-flow/pickup-location";
import { ruleForParent, useDepositRules } from "@/backend/list-flow/deposit-rules";
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
import { AiValueFade, PulseOnce } from "@/components/list-flow/motion";
import { useGlobalContext } from "@/context/global-context";
import { useListDraft } from "@/context/list-draft-context";
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
import {
  CONDITIONS,
  CategoryValue,
  Condition,
  FieldName,
  ListingDraft,
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
import { ChevronRightIcon } from "react-native-heroicons/mini";
import { MapPinIcon, PlusIcon } from "react-native-heroicons/outline";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type TextFieldName = "title" | "brand_name" | "model_name" | "description" | "usage_description";
type SectionKey = Requirement["key"];

const THUMB = 56;

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
  const insets = useSafeAreaInsets();
  const { categories } = useGlobalContext();
  const flow = useListDraft();
  const { draft, run } = flow;
  const { data: rules } = useDepositRules();

  const scrollRef = useRef<KeyboardAwareScrollView>(null);
  const depositRef = useRef<TextInput>(null);
  const categorySheet = useRef<BottomSheetModal>(null);
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

  // §8.5: fill the pickup location from the best source we have, once.
  useEffect(() => {
    if (!draft || draft.fields.location.source !== "empty") return;
    let active = true;
    void defaultPickupLocation().then((location) => {
      if (active && location) flow.dispatch({ type: "prefillLocation", value: location });
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    edit("category", value);
  };

  const fillForCategory = () => {
    const hint = draft.fields.category.value;
    if (!hint) return;
    flow.startExtraction({ categoryHint: hint });
  };

  const openLocationPicker = () => {
    navigation.navigate("LocationModal", {
      requestId: createLocationRequest(async (coords, address) => {
        // The picker's "skip" is not a request to forget a location.
        if (!coords) return;
        const locality = (await localityFor(coords.latitude, coords.longitude)) ?? address ?? "";
        edit("location", {
          locality,
          fullAddress: flow.draft?.fields.location.value?.fullAddress ?? "",
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

  const categorySection = (
    <View onLayout={onLayoutSection("category")} style={{ marginBottom: density.fieldGap }}>
      <FieldLabel label={labelWithSource("Category", f.category.source)} required />
      <AiValueFade value={f.category.value} active={f.category.source === "ai"}>
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
    </View>
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
            ) : null}
          </View>

          {/* Check 2 · condition */}
          <View onLayout={onLayoutSection("condition")} style={{ marginBottom: density.fieldGap }}>
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
          </View>

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

      <CategorySheet ref={categorySheet} categories={categories} onSelect={onCategory} />
    </NonScrollableContainer>
  );
}
