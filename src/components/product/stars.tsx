import { View } from "react-native";
import { StarIcon } from "react-native-heroicons/outline";
import { StarIcon as StarFilled } from "react-native-heroicons/solid";

export const Stars = ({
  rating,
  isDark,
}: {
  rating: number;
  isDark: boolean;
}) => {
  const filledStars = Math.round(rating);
  const emptyStars = 5 - filledStars;

  return (
    <View className="flex-row">
      {[...Array(filledStars)].map((_, index) => (
        <StarFilled key={index} size={22} color={isDark ? "white" : "black"} />
      ))}
      {[...Array(emptyStars)].map((_, index) => (
        <StarIcon key={index} size={22} color="gray" />
      ))}
    </View>
  );
};
