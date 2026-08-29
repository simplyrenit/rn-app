import { MIN_TOUCH_TARGET, radius } from "@/lib/design-tokens";
import { selectionFeedback } from "@/lib/haptics";
import { useTheme } from "@/lib/theme";
import React from "react";
import { TouchableOpacity, View } from "react-native";
import { CheckCircleIcon } from "react-native-heroicons/solid";
import { Text } from "./text";

interface Option<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

interface Props<T extends string> {
  options: Option<T>[];
  value: T | null;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
}

/**
 * A visible choice between two or three options.
 *
 * The contact-person choice this replaces rendered as two plain bordered boxes
 * with left-aligned text — the same border, radius and height as the text
 * inputs stacked directly above them — with no radio affordance and nothing
 * selected by default. Customers could not tell it was a choice at all.
 */
export function SegmentedChoice<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: Props<T>) {
  const { color } = useTheme();

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={{ flexDirection: "row", gap: 10 }}
    >
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <TouchableOpacity
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            accessibilityHint={option.hint}
            activeOpacity={0.8}
            onPress={() => {
              selectionFeedback();
              onChange(option.value);
            }}
            style={{
              flex: 1,
              minHeight: MIN_TOUCH_TARGET,
              paddingHorizontal: 12,
              paddingVertical: 10,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              borderRadius: radius.input,
              // Selected reads as selected: brand border, brand wash, and a
              // filled check. Unselected is visibly a control, not an input.
              borderWidth: selected ? 2 : 1,
              borderColor: selected ? color.brand : color.inputLine,
              backgroundColor: selected ? color.brandWash : color.surface,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                fontSize="text-md"
                fontWeight={selected ? "font-bold" : "font-normal"}
              >
                {option.label}
              </Text>
              {option.hint ? (
                <Text fontSize="text-xs" tone="body">
                  {option.hint}
                </Text>
              ) : null}
            </View>
            {selected ? (
              <CheckCircleIcon size={20} color={color.brand} />
            ) : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
