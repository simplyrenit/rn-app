import { Text } from "@/components/core";
import { radius } from "@/lib/design-tokens";
import { selectionFeedback } from "@/lib/haptics";
import { useTheme } from "@/lib/theme";
import React from "react";
import { TouchableOpacity, View } from "react-native";

/**
 * A row of segments, as the Rentals tab draws its lists (2091:20977 `Segments`): a 44 `surfaceMuted` track, r12,
 * padded 4 with 4 between, and the chosen one a 36 canvas pill, r9, with a hairline. SemiBold when chosen, else Medium.
 */
export function Segments<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { key: T; label: string }[];
  value: T;
  onChange: (key: T) => void;
}) {
  const { color } = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: "row",
        padding: 4,
        gap: 4,
        borderRadius: radius.button,
        backgroundColor: color.surfaceMuted,
      }}
    >
      {options.map(({ key, label }) => {
        const selected = key === value;
        return (
          <TouchableOpacity
            key={key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            activeOpacity={0.8}
            // The 36 pill plus the track's 4 above and below: a 44 target.
            hitSlop={{ top: 4, bottom: 4 }}
            onPress={() => {
              if (!selected) selectionFeedback();
              onChange(key);
            }}
            style={{
              flex: 1,
              minHeight: 36,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 9,
              backgroundColor: selected ? color.canvas : "transparent",
              // The hairline is drawn on every segment so the label does not move a point when it is chosen.
              borderWidth: 1,
              borderColor: selected ? color.line : "transparent",
            }}
          >
            <Text
              fontSize="text-sm"
              fontWeight={selected ? "font-semibold" : "font-medium"}
              lineHeight={20}
              numberOfLines={1}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
