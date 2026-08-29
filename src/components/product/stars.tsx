import { useTheme } from "@/lib/theme";
import React from "react";
import { View } from "react-native";
import { StarIcon } from "react-native-heroicons/outline";
import { StarIcon as StarFilled } from "react-native-heroicons/solid";

export const Stars = ({
  rating,
  isDark,
  size = 18,
}: {
  rating: number;
  isDark?: boolean;
  size?: number;
}) => {
  const { color } = useTheme();
  const filledStars = Math.round(rating ?? 0);

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${(rating ?? 0).toFixed(1)} out of 5`}
      style={{ flexDirection: "row", gap: 1 }}
    >
      {[0, 1, 2, 3, 4].map((index) =>
        index < filledStars ? (
          // Gold, not the foreground colour. A rating drawn in body-text black
          // reads as an icon, not as a score.
          <StarFilled key={index} size={size} color={color.warning} />
        ) : (
          <StarIcon key={index} size={size} color={color.textDim} strokeWidth={1.5} />
        )
      )}
    </View>
  );
};
