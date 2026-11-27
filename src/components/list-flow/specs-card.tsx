import {
  FieldShell,
  SheetFooter,
  SheetHeader,
  Skeleton,
  StatusPill,
  Text,
  usePressFeedback,
} from "@/components/core";
import CustomBottomSheetModal from "@/components/core/custom-bottom-sheet-modal";
import { SCREEN_GUTTER, fontFamily, radius, space } from "@/lib/design-tokens";
import { selectionFeedback } from "@/lib/haptics";
import { specDisplayValue } from "@/lib/list-flow/specs";
import { Spec, SpecValue } from "@/lib/list-flow/types";
import { foldForSearch } from "@/lib/taxonomy-search";
import { useTheme } from "@/lib/theme";
import { BottomSheetModal, BottomSheetScrollView, BottomSheetTextInput } from "@gorhom/bottom-sheet";
import React, { forwardRef, useEffect, useState } from "react";
import { Keyboard, Platform, StyleProp, TextInput, TouchableOpacity, View, ViewStyle } from "react-native";
import { ChevronRightIcon } from "react-native-heroicons/mini";
import { CheckIcon, MagnifyingGlassIcon } from "react-native-heroicons/outline";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * The Review screen's Specs card and its edit sheet (ENG-34, Figma "ENG-27 v3
 * · UPLOAD FLOW"). Nothing here says where a value came from — no "AI", no
 * confidence — by the contract: a Check tag only asks the owner to look.
 */

/** The row's label column, from the frame (2083:14692: 96pt, then 8 to the value). */
const LABEL_WIDTH = 96;
/** A row is 48 inside its hairline (12 / 24 / 12), the label on 16 and the chevron 12 from the edge. */
const ROW_PADDING = { paddingTop: 12, paddingBottom: 12, paddingLeft: 16, paddingRight: 12 };
const ROW_MIN = 48;
/** The label to its card (2083:14692 "Specs": 12, where a form label's own gap is 8). */
const LABEL_GAP = 12;
/** Option rows in the spec sheet (2096:25258): 52, the label on the gutter and a 22 control 8 after it. */
const OPTION_HEIGHT = 52;
const INDICATOR = 22;
/** The spec sheet's height above the home indicator (2096:25258: 633 with its 21pt indicator strip). */
const SHEET_HEIGHT = 612;

function SpecRow({ spec, last, onPress }: { spec: Spec; last: boolean; onPress: () => void }) {
  const { color } = useTheme();
  const feedback = usePressFeedback();
  const value = specDisplayValue(spec.value);
  const check = spec.status === "check";
  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={onPress}
      onPressIn={feedback.onPressIn}
      onPressOut={feedback.onPressOut}
      accessibilityRole="button"
      accessibilityLabel={`${spec.label}, ${value ?? "not set"}${check ? ", check this" : ""}`}
      style={[
        {
          ...ROW_PADDING,
          minHeight: ROW_MIN,
          flexDirection: "row",
          alignItems: "center",
          gap: space.sm,
          borderBottomWidth: last ? 0 : 1,
          borderBottomColor: color.line,
        },
        feedback.pressStyle,
      ]}
    >
      <Text fontSize="text-sm" lineHeight={20} tone="body" style={{ width: LABEL_WIDTH }}>
        {spec.label}
      </Text>
      <Text fontSize="text-md" lineHeight={24} tone={value ? "default" : "dim"} numberOfLines={2} style={{ flex: 1 }}>
        {value ?? "Add"}
      </Text>
      {check ? <StatusPill tone="warning" label="Check" /> : null}
      <ChevronRightIcon size={20} color={color.textDim} />
    </TouchableOpacity>
  );
}

/** "Model, Year, Stabiliser and more. Optional." from the specs it hides. */
function moreDetailHint(specs: Spec[]) {
  const labels = specs.slice(0, 3).map((s) => s.label);
  return specs.length > 3 ? `${labels.join(", ")} and more. Optional.` : `${labels.join(", ")}. Optional.`;
}

/**
 * Whether the loading state should still be shown. The card sits above Title,
 * Brand, Model and Description, so when the answer lands it resizes — and a
 * failure removes it — which moves whichever of those fields the owner is
 * typing in. While the keyboard is up the skeleton stays, and the card takes
 * its real size once the keyboard goes down.
 */
function useSkeletonHeldWhileTyping(loading: boolean) {
  const [typing, setTyping] = useState(() => Keyboard.isVisible());
  const [held, setHeld] = useState(false);
  useEffect(() => {
    const shown = Keyboard.addListener("keyboardDidShow", () => setTyping(true));
    const hidden = Keyboard.addListener("keyboardDidHide", () => setTyping(false));
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);
  useEffect(() => {
    if (!typing) setHeld(false);
    else if (loading) setHeld(true);
  }, [typing, loading]);
  return loading || (held && typing);
}

export function SpecsCard({
  specs,
  loading,
  onPressSpec,
  style,
}: {
  specs: Spec[];
  loading: boolean;
  onPressSpec: (spec: Spec) => void;
  /** Placement only; a card that is not drawn takes none of it. */
  style?: StyleProp<ViewStyle>;
}) {
  const { color } = useTheme();
  const feedback = usePressFeedback();
  const [expanded, setExpanded] = useState(false);
  const skeleton = useSkeletonHeldWhileTyping(loading);
  // A sub-category with no specs, or a call that failed: no card at all.
  if (!skeleton && specs.length === 0) return null;

  const primary = specs.filter((s) => s.facet === "default");
  const more = specs.filter((s) => s.facet !== "default");
  const rows = expanded ? [...primary, ...more] : primary;
  const showMore = !expanded && more.length > 0;

  return (
    <View style={[{ gap: LABEL_GAP }, style]}>
      <Text role="fieldLabel">Specs</Text>
      <View
        style={{
          borderRadius: radius.button,
          borderWidth: 1,
          borderColor: color.line,
          backgroundColor: color.surface,
          overflow: "hidden",
        }}
        // One element while loading, so VoiceOver reads the label instead of
        // skipping a box of unlabelled skeletons; the rows' own after that.
        accessible={skeleton}
        accessibilityLabel={skeleton ? "Loading specs" : undefined}
      >
        {skeleton
          ? [0, 1, 2].map((i) => (
              <View
                key={i}
                style={{
                  ...ROW_PADDING,
                  minHeight: ROW_MIN,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: space.sm,
                  borderBottomWidth: i === 2 ? 0 : 1,
                  borderBottomColor: color.line,
                }}
              >
                <Skeleton width={LABEL_WIDTH - 24} height={14} borderRadius={radius.full} />
                <Skeleton width={96} height={16} borderRadius={radius.full} />
              </View>
            ))
          : rows.map((spec, i) => (
              <SpecRow
                key={spec.key}
                spec={spec}
                last={i === rows.length - 1 && !showMore}
                onPress={() => onPressSpec(spec)}
              />
            ))}
        {!skeleton && showMore ? (
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setExpanded(true)}
            onPressIn={feedback.onPressIn}
            onPressOut={feedback.onPressOut}
            accessibilityRole="button"
            accessibilityHint={moreDetailHint(more)}
            style={[
              { ...ROW_PADDING, minHeight: ROW_MIN, flexDirection: "row", alignItems: "center", gap: space.sm },
              feedback.pressStyle,
            ]}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Text fontSize="text-md" lineHeight={24} fontWeight="font-semibold">
                Add more detail
              </Text>
              <Text role="fieldHint">{moreDetailHint(more)}</Text>
            </View>
            <ChevronRightIcon size={20} color={color.textDim} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

function OptionRow({
  label,
  selected,
  multi,
  last,
  onPress,
}: {
  label: string;
  selected: boolean;
  multi: boolean;
  last: boolean;
  onPress: () => void;
}) {
  const { color } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole={multi ? "checkbox" : "radio"}
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      style={{
        minHeight: OPTION_HEIGHT,
        flexDirection: "row",
        alignItems: "center",
        gap: space.sm,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: color.line,
      }}
    >
      <Text fontSize="text-md" lineHeight={24} style={{ flex: 1 }}>
        {label}
      </Text>
      {/* Drawn here rather than with the kit CheckBox: that is a touchable of its own, and inside this row it
          would announce and fire twice. The 22pt r6 box is the frame's (2097:31093). */}
      <View
        style={{
          width: INDICATOR,
          height: INDICATOR,
          borderRadius: multi ? 6 : radius.full,
          borderWidth: 1.5,
          borderColor: selected ? color.brand : color.textDim,
          backgroundColor: multi && selected ? color.brand : "transparent",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {selected ? (
          multi ? (
            // 1.5625pt at 15pt is 2.5 in the glyph's 24-unit box.
            <CheckIcon size={15} color={color.onBrand} strokeWidth={2.5} />
          ) : (
            <View style={{ width: 12, height: 12, borderRadius: radius.full, backgroundColor: color.brand }} />
          )
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

function saveLabel(spec: Spec, picked: string[]) {
  if (picked.length === 0) return spec.type === "enum" ? "Choose one to save" : "Choose to save";
  const verb = spec.key === "brand" ? "Use" : "Save";
  return picked.length === 1 ? `${verb} ${picked[0]}` : `${verb} ${picked.length} choices`;
}

function SheetBody({
  spec,
  onSave,
  onCancel,
}: {
  spec: Spec;
  onSave: (value: SpecValue | null) => void;
  onCancel: () => void;
}) {
  const { color } = useTheme();
  const multi = spec.type === "multi_enum";
  const [picked, setPicked] = useState<string[]>(() =>
    spec.value === null ? [] : Array.isArray(spec.value) ? spec.value : [spec.value]
  );
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  // Brand lists run long enough to need a search (Figma P-01 v3).
  const searchable = spec.key === "brand";
  const needle = foldForSearch(query.trim());
  const options = needle ? spec.options.filter((o) => foldForSearch(o).includes(needle)) : spec.options;
  // As the taxonomy picker: the sheet's own input lifts the sheet on iOS, and
  // doubles Android's own keyboard resize.
  const SearchInput = (Platform.OS === "ios" ? BottomSheetTextInput : TextInput) as typeof TextInput;

  const toggle = (option: string) => {
    selectionFeedback();
    if (!multi) setPicked([option]);
    else setPicked((p) => (p.includes(option) ? p.filter((o) => o !== option) : [...p, option]));
  };

  const save = () => {
    // Options in the spec's own order, not the order they were tapped.
    const ordered = spec.options.filter((o) => picked.includes(o));
    onSave(multi ? ordered : ordered[0] ?? null);
  };

  return (
    <View style={{ flex: 1 }}>
      {/* The frame's close X (2096:25258) is the sheet's Cancel: it leaves the spec as it was. */}
      <SheetHeader title={spec.label} onClose={onCancel} grabber={false} />

      {/* Above the scroll, so the search stays in reach down a long brand list. */}
      {searchable ? (
        <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingBottom: 16 }}>
          <FieldShell focused={focused}>
            <MagnifyingGlassIcon size={20} color={color.textBody} strokeWidth={1.5} />
            <SearchInput
              value={query}
              onChangeText={setQuery}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={`Search ${spec.label.toLowerCase()}s`}
              placeholderTextColor={color.placeholder}
              accessibilityLabel={`Search ${spec.label.toLowerCase()}s`}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              // The core Text's cap, as the rest of the sheet.
              maxFontSizeMultiplier={1.4}
              style={{ flex: 1, fontSize: 16, fontFamily: fontFamily.regular, color: color.text }}
            />
          </FieldShell>
        </View>
      ) : null}

      <BottomSheetScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingBottom: 16 }}
      >
        <View>
          {options.map((option, i) => (
            <OptionRow
              key={option}
              label={option}
              multi={multi}
              selected={picked.includes(option)}
              last={i === options.length - 1}
              onPress={() => toggle(option)}
            />
          ))}
          {options.length === 0 ? (
            <View style={{ minHeight: OPTION_HEIGHT, justifyContent: "center" }}>
              <Text fontSize="text-md" tone="dim">
                No matches
              </Text>
            </View>
          ) : null}
        </View>
      </BottomSheetScrollView>

      <SheetFooter
        primary={{ label: saveLabel(spec, picked), onPress: save, disabled: picked.length === 0 }}
        secondary={{ label: "Clear", onPress: () => onSave(null) }}
      />
    </View>
  );
}

/**
 * Radios for an `enum`, checkboxes for a `multi_enum`. Saving — even the value
 * that was already there — is the owner's answer, which is what clears a
 * Check tag; the close X and a swipe down leave the spec as it was.
 */
export const SpecSheet = forwardRef<
  BottomSheetModal,
  { spec: Spec | null; onSave: (value: SpecValue | null) => void; onCancel: () => void }
>(({ spec, onSave, onCancel }, ref) => {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <CustomBottomSheetModal
      ref={ref}
      isDark={isDark}
      snapPoints={[SHEET_HEIGHT + insets.bottom]}
      frame
      scrollView={false}
    >
      {/* The modal unmounts its content on dismiss, so each opening starts
          from the spec's saved value; the key keeps that true if the spec
          ever changes under an open sheet. */}
      {spec ? <SheetBody key={spec.key} spec={spec} onSave={onSave} onCancel={onCancel} /> : null}
    </CustomBottomSheetModal>
  );
});
