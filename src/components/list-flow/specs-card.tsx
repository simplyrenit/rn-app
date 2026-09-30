import { Button, FieldLabel, FieldShell, Skeleton, Text, usePressFeedback } from "@/components/core";
import CustomBottomSheetModal from "@/components/core/custom-bottom-sheet-modal";
import { MIN_TOUCH_TARGET, SCREEN_GUTTER, density, fontFamily, radius, space } from "@/lib/design-tokens";
import { selectionFeedback } from "@/lib/haptics";
import { specDisplayValue } from "@/lib/list-flow/specs";
import { Spec, SpecValue } from "@/lib/list-flow/types";
import { foldForSearch } from "@/lib/taxonomy-search";
import { useTheme } from "@/lib/theme";
import { BottomSheetModal, BottomSheetScrollView, BottomSheetTextInput } from "@gorhom/bottom-sheet";
import React, { forwardRef, useState } from "react";
import { Platform, TextInput, TouchableOpacity, View } from "react-native";
import { CheckIcon } from "react-native-heroicons/solid";
import { ChevronRightIcon } from "react-native-heroicons/mini";
import { MagnifyingGlassIcon } from "react-native-heroicons/outline";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * The Review screen's Specs card and its edit sheet (ENG-34, Figma "ENG-27 v3
 * · UPLOAD FLOW"). Nothing here says where a value came from — no "AI", no
 * confidence — by the contract: a Check tag only asks the owner to look.
 */

/** The row's label column, from the frame (104pt, then 8 to the value). */
const LABEL_WIDTH = 104;
const ROW_PADDING = { paddingTop: 12, paddingBottom: 12, paddingLeft: 16, paddingRight: 12 };
/** Option rows in the sheet, as the Radio row component draws them. */
const OPTION_HEIGHT = 56;
const INDICATOR = 22;

/**
 * "Field tag · Check". The frame's amber pair is not a token yet; the app's
 * warning pair stands in until the designer ships semantic colours.
 */
export function CheckTag() {
  const { color } = useTheme();
  return (
    <View
      style={{
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: radius.full,
        backgroundColor: color.warningWash,
      }}
    >
      <Text fontSize="text-xs" fontWeight="font-bold" style={{ color: color.warning, lineHeight: 16 }}>
        Check
      </Text>
    </View>
  );
}

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
          minHeight: MIN_TOUCH_TARGET,
          flexDirection: "row",
          alignItems: "center",
          gap: space.sm,
          borderBottomWidth: last ? 0 : 1,
          borderBottomColor: color.line,
        },
        feedback.pressStyle,
      ]}
    >
      <Text fontSize="text-sm" tone="body" style={{ width: LABEL_WIDTH }}>
        {spec.label}
      </Text>
      <Text fontSize="text-md" tone={value ? "default" : "dim"} numberOfLines={2} style={{ flex: 1 }}>
        {value ?? "Add"}
      </Text>
      {check ? <CheckTag /> : null}
      <ChevronRightIcon size={20} color={color.textDim} />
    </TouchableOpacity>
  );
}

/** "Model, Year, Stabiliser and more. Optional." from the specs it hides. */
function moreDetailHint(specs: Spec[]) {
  const labels = specs.slice(0, 3).map((s) => s.label);
  return specs.length > 3 ? `${labels.join(", ")} and more. Optional.` : `${labels.join(", ")}. Optional.`;
}

export function SpecsCard({
  specs,
  loading,
  onPressSpec,
}: {
  specs: Spec[];
  loading: boolean;
  onPressSpec: (spec: Spec) => void;
}) {
  const { color } = useTheme();
  const feedback = usePressFeedback();
  const [expanded, setExpanded] = useState(false);
  // A sub-category with no specs, or a call that failed: no card at all.
  if (!loading && specs.length === 0) return null;

  const primary = specs.filter((s) => s.facet === "default");
  const more = specs.filter((s) => s.facet !== "default");
  const rows = expanded ? [...primary, ...more] : primary;
  const showMore = !expanded && more.length > 0;

  return (
    <View style={{ marginBottom: density.fieldGap }}>
      <FieldLabel label="Specs" />
      <View
        style={{
          borderRadius: radius.button,
          borderWidth: 1,
          borderColor: color.line,
          backgroundColor: color.surface,
          overflow: "hidden",
        }}
        accessibilityLabel={loading ? "Loading specs" : undefined}
      >
        {loading
          ? [0, 1, 2].map((i) => (
              <View
                key={i}
                style={{
                  ...ROW_PADDING,
                  minHeight: MIN_TOUCH_TARGET,
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
        {!loading && showMore ? (
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setExpanded(true)}
            onPressIn={feedback.onPressIn}
            onPressOut={feedback.onPressOut}
            accessibilityRole="button"
            accessibilityHint={moreDetailHint(more)}
            style={[
              { ...ROW_PADDING, minHeight: MIN_TOUCH_TARGET, flexDirection: "row", alignItems: "center", gap: space.sm },
              feedback.pressStyle,
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text fontSize="text-md" fontWeight="font-bold" tone="brand">
                Add more detail
              </Text>
              <Text fontSize="text-sm" tone="body">
                {moreDetailHint(more)}
              </Text>
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
        paddingHorizontal: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: space.sm,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: color.line,
      }}
    >
      <Text fontSize="text-md" style={{ flex: 1 }}>
        {label}
      </Text>
      <View
        style={{
          width: INDICATOR,
          height: INDICATOR,
          borderRadius: multi ? 6 : radius.full,
          borderWidth: 1.5,
          borderColor: selected ? color.brand : color.inputLine,
          backgroundColor: multi && selected ? color.brand : "transparent",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {selected ? (
          multi ? (
            <CheckIcon size={15} color={color.onBrand} />
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
  const insets = useSafeAreaInsets();
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
      <View
        style={{
          paddingHorizontal: SCREEN_GUTTER,
          paddingBottom: space.md,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: space.md,
        }}
      >
        <Text role="sectionTitle" accessibilityRole="header" numberOfLines={1} style={{ flex: 1 }}>
          {spec.label}
        </Text>
        <TouchableOpacity
          onPress={onCancel}
          accessibilityRole="button"
          style={{ minHeight: MIN_TOUCH_TARGET, justifyContent: "center" }}
        >
          <Text fontSize="text-md" fontWeight="font-bold" tone="brand">
            Cancel
          </Text>
        </TouchableOpacity>
      </View>

      {searchable ? (
        <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingBottom: space.md }}>
          <FieldShell focused={focused}>
            <MagnifyingGlassIcon size={20} color={color.textBody} />
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
              style={{ flex: 1, fontSize: 16, fontFamily: fontFamily.regular, color: color.text }}
            />
          </FieldShell>
        </View>
      ) : null}

      <BottomSheetScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingBottom: space.md }}
      >
        <View style={{ borderRadius: radius.button, borderWidth: 1, borderColor: color.line, overflow: "hidden" }}>
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
            <View style={{ minHeight: OPTION_HEIGHT, paddingHorizontal: 16, justifyContent: "center" }}>
              <Text fontSize="text-md" tone="dim">
                No matches
              </Text>
            </View>
          ) : null}
        </View>
      </BottomSheetScrollView>

      <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: space.sm, paddingBottom: insets.bottom + space.sm, gap: space.xs }}>
        <Button disabled={picked.length === 0} onPress={save}>
          {saveLabel(spec, picked)}
        </Button>
        <Button variant="ghost" onPress={() => onSave(null)}>
          Clear
        </Button>
      </View>
    </View>
  );
}

/**
 * Radios for an `enum`, checkboxes for a `multi_enum`. Saving — even the value
 * that was already there — is the owner's answer, which is what clears a
 * Check tag; Cancel and a swipe down leave the spec as it was.
 */
export const SpecSheet = forwardRef<
  BottomSheetModal,
  { spec: Spec | null; onSave: (value: SpecValue | null) => void; onCancel: () => void }
>(({ spec, onSave, onCancel }, ref) => {
  const { isDark } = useTheme();
  return (
    <CustomBottomSheetModal ref={ref} isDark={isDark} snapPoints={["75%"]} frame scrollView={false}>
      {/* The modal unmounts its content on dismiss, so each opening starts
          from the spec's saved value; the key keeps that true if the spec
          ever changes under an open sheet. */}
      {spec ? <SheetBody key={spec.key} spec={spec} onSave={onSave} onCancel={onCancel} /> : null}
    </CustomBottomSheetModal>
  );
});
