import type { SpecFilter as Spec } from "@/backend/search";
import { MIN_TOUCH_TARGET, radius } from "@/lib/design-tokens";
import { selectionFeedback } from "@/lib/haptics";
import { useTheme } from "@/lib/theme";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import React, { useState } from "react";
import { TouchableOpacity, View } from "react-native";
import { Text } from "../core";

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
    <View key={spec.key} style={{ marginBottom: 20 }}>
      <Text fontSize="text-sm" fontWeight="font-bold" style={{ marginBottom: 8 }}>
        {spec.label}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {spec.options.map((option) => {
          const on = (selected[spec.key] ?? []).includes(option.value);
          return (
            <TouchableOpacity
              key={option.value}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`${spec.label}: ${option.value}, ${option.count} ${
                option.count === 1 ? "result" : "results"
              }`}
              onPress={() => {
                selectionFeedback();
                onToggle(spec.key, option.value);
              }}
              style={{
                minHeight: MIN_TOUCH_TARGET,
                paddingHorizontal: 14,
                borderRadius: radius.full,
                borderWidth: 1,
                borderColor: on ? color.brand : color.inputLine,
                backgroundColor: on ? color.brandWash : "transparent",
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Text
                fontSize="text-sm"
                fontWeight={on ? "font-semibold" : "font-normal"}
                style={{ color: on ? color.brandText : color.text }}
              >
                {option.value}
              </Text>
              <Text fontSize="text-sm" style={{ color: color.textDim }}>
                {option.count}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  return (
    <BottomSheetScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingTop: 4, paddingBottom: 16 }}
    >
      {primary.map(renderSpec)}
      {more.length > 0 && !showAll && (
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => setShowAll(true)}
          style={{ minHeight: MIN_TOUCH_TARGET, justifyContent: "center" }}
        >
          <Text fontSize="text-sm" fontWeight="font-semibold" style={{ color: color.brandText }}>
            All specifications ({more.length})
          </Text>
        </TouchableOpacity>
      )}
      {showAll && more.map(renderSpec)}
    </BottomSheetScrollView>
  );
}
