import type { SpecFilter as Spec } from "@/backend/search";
import { SCREEN_GUTTER } from "@/lib/design-tokens";
import { selectionFeedback } from "@/lib/haptics";
import { useTheme } from "@/lib/theme";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import React, { useState } from "react";
import { TouchableOpacity, View } from "react-native";
import { ChevronRightIcon } from "react-native-heroicons/outline";
import { Chip, Text } from "../core";

// 2089:34679: groups 20 apart, the label 12 above its chips, chips 8 apart.
const CHIP_SLOP = { top: 2, bottom: 2, left: 0, right: 0 };

interface Props {
  specs: Spec[];
  selected: Record<string, string[]>;
  onToggle: (key: string, option: string) => void;
}

/**
 * The sub-category's own filters (ENG-31): the "default" specs, then the rest
 * behind "All specifications". The server already drops options nobody has,
 * so nothing here is ever greyed out; a chosen option stays so it can be
 * turned off even when its count falls to zero.
 */
export function SpecFilter({ specs, selected, onToggle }: Props) {
  const { color } = useTheme();
  const primary = specs.filter((s) => s.facet === "default");
  const more = specs.filter((s) => s.facet !== "default");
  // A spec chosen from "All specifications" keeps the list open on return.
  const [showAll, setShowAll] = useState(() =>
    more.some((s) => (selected[s.key] ?? []).length > 0)
  );

  const renderSpec = (spec: Spec) => (
    <View key={spec.key} style={{ gap: 12 }}>
      <Text fontSize="text-sm" fontWeight="font-semibold">
        {spec.label}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {spec.options.map((option) => {
          const on = (selected[spec.key] ?? []).includes(option.value);
          return (
            <Chip
              key={option.value}
              // One label, the count in the label's own colour, two spaces apart as drawn.
              label={`${option.value}  ${option.count}`}
              selected={on}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`${spec.label}: ${option.value}, ${option.count} ${
                option.count === 1 ? "result" : "results"
              }`}
              hitSlop={CHIP_SLOP}
              onPress={() => {
                selectionFeedback();
                onToggle(spec.key, option.value);
              }}
            />
          );
        })}
      </View>
    </View>
  );

  return (
    <BottomSheetScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingVertical: 16, paddingHorizontal: SCREEN_GUTTER, gap: 20 }}
    >
      {primary.map(renderSpec)}
      {more.length > 0 && !showAll && (
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => setShowAll(true)}
          // The link is its 20pt line, as drawn; the slop keeps a 44pt target.
          hitSlop={12}
          style={{ flexDirection: "row", alignItems: "center", gap: 2, alignSelf: "flex-start" }}
        >
          <Text fontSize="text-sm" fontWeight="font-semibold" style={{ color: color.brandText }}>
            All specifications ({more.length})
          </Text>
          <ChevronRightIcon size={16} strokeWidth={1.5} color={color.brandText} />
        </TouchableOpacity>
      )}
      {showAll && more.map(renderSpec)}
    </BottomSheetScrollView>
  );
}
