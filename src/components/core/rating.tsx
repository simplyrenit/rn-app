import { MIN_TOUCH_TARGET } from "@/lib/design-tokens";
import { selectionFeedback } from "@/lib/haptics";
import { useTheme } from "@/lib/theme";
import React from "react";
import { TouchableOpacity, View } from "react-native";
import { StarIcon as StarOutline } from "react-native-heroicons/outline";
import { StarIcon as StarSolid } from "react-native-heroicons/solid";
import { Text } from "./text";

interface Props {
  /** Current value, 0–5. Controlled when supplied alongside `onChange`. */
  value?: number;
  onChange?: (value: number) => void;
  /** Read-only display, e.g. a product's average rating. */
  readOnly?: boolean;
  size?: number;
  /** How many reviews the average is drawn from. */
  count?: number;
  /**
   * Shows "Not yet rated" instead of five empty stars when nothing has been
   * rated. Five hollow stars read as zero-out-of-five, which damages exactly
   * the new listings that need help.
   */
  showUnratedCopy?: boolean;
}

/**
 * The app's one star rating, for both input and display.
 *
 * It now reports what the customer picked (it had no `onChange` at all, so a
 * parent could never read the value), uses the same heroicon family as the rest
 * of the app rather than a literal ★ in the system font, and no longer ships a
 * "Rating: 0" debug label.
 */
export default function Rating({
  value = 0,
  onChange,
  readOnly = false,
  size = 20,
  count,
  showUnratedCopy = false,
}: Props) {
  const { color } = useTheme();
  const interactive = Boolean(onChange) && !readOnly;

  if (showUnratedCopy && !value) {
    return (
      <Text fontSize="text-sm" tone="body">
        Not yet rated
      </Text>
    );
  }

  const label = count !== undefined
    ? `${value.toFixed(1)} out of 5, ${count} review${count === 1 ? "" : "s"}`
    : `${value.toFixed(1)} out of 5`;

  return (
    <View
      accessible={!interactive}
      accessibilityRole={interactive ? undefined : "text"}
      accessibilityLabel={interactive ? undefined : label}
      style={{ flexDirection: "row", alignItems: "center", gap: 2 }}
    >
      {[0, 1, 2, 3, 4].map((index) => {
        const filled = value >= index + 1;
        // Half values are drawn as a filled star clipped to half its width —
        // an actual half star, not a full star at 50% opacity.
        const half = !filled && value >= index + 0.5;
        const Star = filled ? StarSolid : StarOutline;

        const glyph = (
          <View style={{ width: size, height: size }}>
            <StarOutline size={size} color={color.textDim} strokeWidth={1.5} />
            {(filled || half) && (
              <View
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  height: size,
                  width: half ? size / 2 : size,
                  overflow: "hidden",
                }}
              >
                <StarSolid size={size} color={color.warning} />
              </View>
            )}
          </View>
        );

        if (!interactive) return <View key={index}>{glyph}</View>;

        return (
          <TouchableOpacity
            key={index}
            onPress={() => {
              selectionFeedback();
              onChange?.(index + 1);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected: Math.ceil(value) === index + 1 }}
            accessibilityLabel={`${index + 1} star${index === 0 ? "" : "s"}`}
            hitSlop={{
              top: (MIN_TOUCH_TARGET - size) / 2,
              bottom: (MIN_TOUCH_TARGET - size) / 2,
              left: 4,
              right: 4,
            }}
          >
            {glyph}
          </TouchableOpacity>
        );
      })}

      {count !== undefined && (
        <Text fontSize="text-sm" tone="body" style={{ marginLeft: 4 }}>
          {value.toFixed(1)} ({count})
        </Text>
      )}
    </View>
  );
}
