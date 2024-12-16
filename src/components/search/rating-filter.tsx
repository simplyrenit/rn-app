import { useGlobalContext } from "@/context/global-context";
import { useState } from "react";
import { View } from "react-native";
import StarRating from "react-native-star-rating-widget";
import { Button, Text } from "../core";
import { Rating } from "@kolking/react-native-rating";

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
      <View className="mt-3 w-[90%] mx-auto flex-1">
        <Text
          fontSize="text-base"
          fontWeight="font-bold"
          className="mb-3"
        >
          Product Review
        </Text>
        <View
          className={`flex flex-row items-center justify-between border ${
            isDark ? "bg-black border-[#292929]" : "bg-white border-[#e6e6e6]"
          } w-full h-16 rounded-[16px] p-3`}
        >
          <Rating
            variant="stars-outline"
            fillColor="#635be8"
            touchColor="#635be8"
            size={20}
            spacing={12}
            scale={1}
            rating={rating.product}
            onChange={(newRating) => {
              setRating((prev) => ({
                ...prev,
                product: newRating,
              }));
              onSelect(newRating, rating.owner);
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
            isDark ? "bg-black border-[#292929]" : "bg-white border-[#e6e6e6]"
          } w-full h-16 rounded-[16px] p-3`}
        >
          <Rating
            variant="stars-outline"
            fillColor="#635be8"
            touchColor="#635be8"
            size={20}
            spacing={12}
            scale={1}
            rating={rating.owner}
            onChange={(newRating) => {
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
      {Boolean(rating.product || rating.owner) && (
        <View className="p-3">
          <Button
            onPress={closeSheet}
            className="mt-5"
          >
            {isLoading ? "Loading..." : "Show products"}
          </Button>
        </View>
      )}
    </View>
  );
}
