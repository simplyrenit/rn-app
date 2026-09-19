import { useTheme } from "@/lib/theme";
import React from "react";
import { View } from "react-native";
import { StarIcon } from "react-native-heroicons/outline";
import { StarIcon as StarFilled } from "react-native-heroicons/solid";

export const Stars = ({
  rating,
  isDark,
  size = 18,
  tone = "gold",
  gap = 1,
  strokeWidth = 1.5,
}: {
  rating: number;
  isDark?: boolean;
  size?: number;
  /**
   * Opt-in. The rating that heads the product detail page is drawn in the
   * design as solid black stars on white, not as the gold score this uses
   * everywhere else — so the palette is a prop rather than a second component.
   * Every existing call site keeps `gold`.
   */
  tone?: "gold" | "ink";
  /** Opt-in: the detail frame sets the five stars flush, with no gap. */
  gap?: number;
  strokeWidth?: number;
}) => {
  const { color } = useTheme();
  const filledStars = Math.round(rating ?? 0);

  // Gold, not the foreground colour: a rating drawn in body-text black reads as
  // an icon, not as a score. `ink` exists only because the detail frame draws
  // it that way, next to the title it belongs to.
  const filledColor = tone === "ink" ? color.text : color.warning;
  const emptyColor = tone === "ink" ? color.text : color.textDim;

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${(rating ?? 0).toFixed(1)} out of 5`}
      style={{ flexDirection: "row", gap }}
    >
      {[0, 1, 2, 3, 4].map((index) =>
        index < filledStars ? (
          <StarFilled key={index} size={size} color={filledColor} />
        ) : (
          <StarIcon
            key={index}
            size={size}
            color={emptyColor}
            strokeWidth={strokeWidth}
          />
        )
      )}
    </View>
  );
};
