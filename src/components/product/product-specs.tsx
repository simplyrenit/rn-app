import { IconButton, Text, usePressFeedback } from "@/components/core";
import CustomBottomSheetModal from "@/components/core/custom-bottom-sheet-modal";
import { MIN_TOUCH_TARGET, SCREEN_GUTTER, radius } from "@/lib/design-tokens";
import { specMatchesFilters, specValueText } from "@/lib/product-specs";
import { useTheme } from "@/lib/theme";
import { ProductSpec } from "@/lib/types";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import React, { forwardRef } from "react";
import { TouchableOpacity, View } from "react-native";
import { XMarkIcon } from "react-native-heroicons/outline";
import { CheckIcon, ChevronRightIcon } from "react-native-heroicons/mini";

/**
 * The Specifications card (Figma PDP-01 7398:721441), cloned from the owner's
 * Specs card so renter and owner see one shape: a 128pt label column, the value
 * beside it, a hairline under every row but the card's last.
 */
const LABEL_WIDTH = 128;
const ROW_PAD = { paddingVertical: 12, paddingLeft: 16, paddingRight: 12 } as const;
const GLYPH = 20;

function SpecRow({
  spec,
  matched,
  divider,
}: {
  spec: ProductSpec;
  matched: boolean;
  divider: boolean;
}) {
  const { color } = useTheme();
  const value = specValueText(spec.value);
  return (
    // One stop for a screen reader: label, value and match, not three.
    <View
      accessible
      accessibilityLabel={`${spec.label}, ${value}${
        matched ? ", matches your filter" : ""
      }`}
      style={{
        ...ROW_PAD,
        minHeight: MIN_TOUCH_TARGET,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        borderBottomWidth: divider ? 1 : 0,
        borderBottomColor: color.line,
      }}
    >
      <Text fontSize="text-sm" tone="body" style={{ width: LABEL_WIDTH }}>
        {spec.label}
      </Text>
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 4 }}>
        <Text fontSize="text-md" style={{ flexShrink: 1 }}>
          {value}
        </Text>
        {/* A check, no banner or tint (PDP-03): the renter chose this value,
            so it only has to be findable, not announced. */}
        {matched ? <CheckIcon size={GLYPH} color={color.brandText} /> : null}
      </View>
    </View>
  );
}

function SpecList({
  specs,
  specFilters,
  footer,
}: {
  specs: ProductSpec[];
  specFilters?: Record<string, string[]>;
  footer?: React.ReactNode;
}) {
  const { color } = useTheme();
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: color.line,
        // The design's 12, which the card token (16) would round off.
        borderRadius: radius.button,
        backgroundColor: color.surface,
        overflow: "hidden",
      }}
    >
      {specs.map((spec, index) => (
        <SpecRow
          key={spec.key}
          spec={spec}
          matched={specMatchesFilters(spec, specFilters)}
          divider={index < specs.length - 1 || Boolean(footer)}
        />
      ))}
      {footer}
    </View>
  );
}

/**
 * The main specs, with a way to the rest when there is a rest. A listing whose
 * specs are all "expanded" shows them all here: a card of nothing but "See
 * all" would hide the only facts it has behind a tap.
 */
export function SpecsCard({
  specs,
  specFilters,
  onSeeAll,
}: {
  specs: ProductSpec[];
  specFilters?: Record<string, string[]>;
  onSeeAll: () => void;
}) {
  const { color } = useTheme();
  const feedback = usePressFeedback();
  const main = specs.filter((spec) => spec.facet === "default");
  const rows = main.length > 0 ? main : specs;

  return (
    <SpecList
      specs={rows}
      specFilters={specFilters}
      footer={
        specs.length > rows.length ? (
          <TouchableOpacity
            activeOpacity={1}
            onPress={onSeeAll}
            onPressIn={feedback.onPressIn}
            onPressOut={feedback.onPressOut}
            accessibilityRole="button"
            accessibilityLabel="See all specifications"
            style={[
              {
                ...ROW_PAD,
                minHeight: MIN_TOUCH_TARGET,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              },
              feedback.pressStyle,
            ]}
          >
            <Text fontSize="text-md" fontWeight="font-bold" tone="brand" style={{ flex: 1 }}>
              See all specifications
            </Text>
            <ChevronRightIcon size={GLYPH} color={color.textDim} />
          </TouchableOpacity>
        ) : null
      }
    />
  );
}

/**
 * Every spec the listing has (PDP-02), in one list: at a handful of rows,
 * "Main" and "More details" group headers added chrome without helping.
 */
export const AllSpecsSheet = forwardRef<
  BottomSheetModal,
  { specs: ProductSpec[]; specFilters?: Record<string, string[]>; onClose: () => void }
>(({ specs, specFilters, onClose }, ref) => {
  const { color, isDark } = useTheme();
  return (
    <CustomBottomSheetModal ref={ref} isDark={isDark} snapPoints={["75%"]} frame>
      <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingBottom: 32, gap: 8 }}>
        <View
          style={{
            minHeight: 52,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text role="sectionTitle" accessibilityRole="header">
            Specifications
          </Text>
          <IconButton accessibilityLabel="Close" onPress={onClose}>
            <XMarkIcon size={24} color={color.text} />
          </IconButton>
        </View>
        <SpecList specs={specs} specFilters={specFilters} />
      </View>
    </CustomBottomSheetModal>
  );
});
