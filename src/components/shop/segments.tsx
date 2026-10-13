import { Text } from "@/components/core";
import { MIN_TOUCH_TARGET, radius, space } from "@/lib/design-tokens";
import { selectionFeedback } from "@/lib/haptics";
import { useTheme } from "@/lib/theme";
import React from "react";
import { TouchableOpacity, View } from "react-native";

/** A row of segments, as the Rentals tab draws its two lists. */
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
        padding: 3,
        borderRadius: radius.button,
        backgroundColor: color.surfaceRaised,
        marginBottom: space.md,
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
            onPress={() => {
              if (!selected) selectionFeedback();
              onChange(key);
            }}
            style={{
              flex: 1,
              minHeight: MIN_TOUCH_TARGET - 6,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: radius.button - 3,
              backgroundColor: selected ? color.canvas : "transparent",
              borderWidth: selected ? 1 : 0,
              borderColor: color.line,
            }}
          >
            <Text
              fontSize="text-md"
              fontWeight={selected ? "font-bold" : "font-normal"}
              tone={selected ? "default" : "body"}
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
