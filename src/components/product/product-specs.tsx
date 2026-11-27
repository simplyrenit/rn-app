import { SheetHeader, Text, usePressFeedback } from "@/components/core";
import CustomBottomSheetModal from "@/components/core/custom-bottom-sheet-modal";
import { MIN_TOUCH_TARGET, SCREEN_GUTTER, radius } from "@/lib/design-tokens";
import { specMatchesFilters, specValueText } from "@/lib/product-specs";
import { useTheme } from "@/lib/theme";
import { ProductSpec } from "@/lib/types";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import React, { forwardRef } from "react";
import { TouchableOpacity, View } from "react-native";
import { CheckIcon, ChevronRightIcon } from "react-native-heroicons/mini";

/**
 * The Specifications card and sheet (04 2083:16177, 2083:16201): a 112 label
 * column at 60%, 16 to the SemiBold value, a hairline over every row but the
 * first. In the card each row is padded 12/16 inside a r12 hairline box; in the
 * sheet the rows sit straight on the sheet, 14 above and below, with no box.
 */
const LABEL_WIDTH = 112;
const ROW_PAD = {
  card: { paddingVertical: 12, paddingHorizontal: 16 },
  sheet: { paddingVertical: 14, paddingHorizontal: 0 },
} as const;
const GLYPH = 16;

type Surface = keyof typeof ROW_PAD;

function SpecRow({
  spec,
  matched,
  divider,
  surface,
}: {
  spec: ProductSpec;
  matched: boolean;
  divider: boolean;
  surface: Surface;
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
        ...ROW_PAD[surface],
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 16,
        borderTopWidth: divider ? 1 : 0,
        borderTopColor: color.line,
      }}
    >
      <Text fontSize="text-sm" tone="dim" style={{ width: LABEL_WIDTH }}>
        {spec.label}
      </Text>
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 4 }}>
        <Text fontSize="text-sm" fontWeight="font-semibold" style={{ flexShrink: 1 }}>
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
  surface,
}: {
  specs: ProductSpec[];
  specFilters?: Record<string, string[]>;
  footer?: React.ReactNode;
  surface: Surface;
}) {
  const { color } = useTheme();
  return (
    <View
      style={
        surface === "card"
          ? {
              borderWidth: 1,
              borderColor: color.line,
              borderRadius: radius.button,
              backgroundColor: color.surface,
              overflow: "hidden",
            }
          : undefined
      }
    >
      {specs.map((spec, index) => (
        <SpecRow
          key={spec.key}
          spec={spec}
          matched={specMatchesFilters(spec, specFilters)}
          divider={index > 0}
          surface={surface}
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
      surface="card"
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
                // 14/16, so the row is the frame's 49 with its hairline.
                paddingVertical: 14,
                paddingHorizontal: 16,
                minHeight: MIN_TOUCH_TARGET,
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                borderTopWidth: 1,
                borderTopColor: color.line,
              },
              feedback.pressStyle,
            ]}
          >
            <Text fontSize="text-sm" fontWeight="font-semibold" tone="brand">
              See all specifications
            </Text>
            <ChevronRightIcon size={GLYPH} color={color.brandText} />
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
  const { isDark } = useTheme();
  return (
    // The kit sheet scrim (`frame` off): the frame draws 40%, nearer the kit's 50% than `frame`'s 60%.
    <CustomBottomSheetModal ref={ref} isDark={isDark} snapPoints={["75%"]}>
      <SheetHeader title="Specifications" onClose={onClose} grabber={false} />
      {/* 2083:16412: 8 above the first row, 24 at the sides, 34 below the last. */}
      <View style={{ paddingTop: 8, paddingHorizontal: SCREEN_GUTTER, paddingBottom: 34 }}>
        <SpecList specs={specs} specFilters={specFilters} surface="sheet" />
      </View>
    </CustomBottomSheetModal>
  );
});
