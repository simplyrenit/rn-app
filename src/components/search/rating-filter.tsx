import { useGlobalContext } from "@/context/global-context";
import { useState } from "react";
import { View } from "react-native";
import StarRating from "react-native-star-rating-widget";
import { Button, Text } from "../core";
import { Rating } from "react-native-ratings";
import { colors } from "@/lib/design-tokens";

interface Props {
  productRating: number;
  ownerRating: number;
  onSelect: (productRating: number, ownerRating: number) => void;
  closeSheet: () => void;
  isLoading: boolean;
}

export function RatingFilter({
  productRating,
  ownerRating,
  onSelect,
  closeSheet,
  isLoading,
}: Props) {
  const { theme } = useGlobalContext();

  const isDark = theme === "dark";
  const [rating, setRating] = useState({
    product: productRating,
    owner: ownerRating,
  });

  return (
    <View className="flex-1">
      <View className="mt-0 w-[90%] mx-auto flex-1">
        <Text
          fontSize="text-base"
          fontWeight="font-bold"
          className="mb-3"
        >
          Product Review
        </Text>
        <View
          className={`flex flex-row items-center justify-between border ${
            isDark ? "bg-canvas-dark border-line-dark" : "bg-surface-light border-line-light"
          } w-full h-16 rounded-group p-3`}
        >
          <Rating
            ratingCount={5}
            type="custom"
            fractions={1}
            jumpValue={0.5}
            ratingColor={colors.dark.brand}
            startingValue={rating.product}
            imageSize={24}
            onFinishRating={(newRating: number) => {
              setRating((prev) => ({
                ...prev,
                product: newRating,
              }));
              onSelect(rating.product, newRating);
            }}
          />

          <Text fontSize="text-2xl">{rating.product}</Text>
        </View>
        <Text
          fontSize="text-base"
          fontWeight="font-bold"
          className="mt-8 mb-3"
        >
          Owner Review
        </Text>
        <View
          className={`flex flex-row items-center justify-between border ${
            isDark ? "bg-canvas-dark border-line-dark" : "bg-surface-light border-line-light"
          } w-full h-16 rounded-group p-3`}
        >
          <Rating
            ratingCount={5}
            type="custom"
            fractions={1}
            jumpValue={0.5}
            // ratingImage={require("../../../assets/star.png")}
            ratingColor={colors.dark.brand}
            style={{ gap: 10}}
            startingValue={rating.owner}
            imageSize={24}
            onFinishRating={(newRating: number) => {
              setRating((prev) => ({
                ...prev,
                owner: newRating,
              }));
              onSelect(rating.product, newRating);
            }}
          />
          <Text fontSize="text-2xl">{rating.owner}</Text>
        </View>
      </View>
    </View>
  );
}
