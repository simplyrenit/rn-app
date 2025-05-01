import { Text } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { ReviewCard } from "@/components/product/review-card";
import { useGlobalContext } from "@/context/global-context";
import { RouteProps, useTypedNavigation } from "@/lib/types";
import { useRoute } from "@react-navigation/native";
import React from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { ArrowLeftIcon } from "react-native-heroicons/outline";

export default function OwnersReviewScreen() {
  const route = useRoute<RouteProps<"OwnersReviewScreen">>();
  const navigation = useTypedNavigation();
  const { owner, reviews } = route.params;

  const { theme } = useGlobalContext();
  const isDark = theme === "dark";

  return (
    <NonScrollableContainer>
      <View className="py-3 px-5 flex flex-row items-center">
        <View className="w-[10%]">
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ArrowLeftIcon color={isDark ? "white" : "black"} size={18} />
          </TouchableOpacity>
        </View>
        <View className="w-[80%] h-full items-center">
          <Text fontSize="text-xl" fontWeight="font-bold">
            {owner?.first_name}'s reviews
          </Text>
        </View>
        <View className="w-[10%]"></View>
      </View>

      <ScrollView className="px-5 mt-3">
        <Text fontSize="text-lg" fontWeight="font-bold" className="my-6">
          {reviews.length} reviews
        </Text>

        {reviews.map((review, index) => (
          <ReviewCard
            size={100}
            key={index}
            reviewText={review.comment}
            reviewerName={`${review.reviewer.first_name} ${review.reviewer.last_name}`}
            reviewDate={review.created_at}
            reviewerImage={review.reviewer.image || ""}
          />
        ))}
      </ScrollView>
    </NonScrollableContainer>
  );
}
