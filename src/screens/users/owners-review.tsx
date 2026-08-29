import { pluralize } from "@/lib/pluralize";
import { Text } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { ReviewCard } from "@/components/product/review-card";
import { useGlobalContext } from "@/context/global-context";
import { RouteProps, useTypedNavigation } from "@/lib/types";
import { useRoute } from "@react-navigation/native";
import React from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { ArrowLeftIcon } from "react-native-heroicons/outline";
import { ink } from "@/lib/design-tokens";

export default function OwnersReviewScreen() {
  const route = useRoute<RouteProps<"OwnersReviewScreen">>();
  const navigation = useTypedNavigation();
  const { owner, reviews } = route.params;

  const { theme } = useGlobalContext();
  const isDark = theme === "dark";

  return (
    <NonScrollableContainer>
      <View className="py-3 px-gutter flex flex-row items-center">
        <View className="w-[10%]">
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" onPress={() => navigation.goBack()}>
            <ArrowLeftIcon color={ink.text(isDark)} size={24} />
          </TouchableOpacity>
        </View>
        <View className="w-[80%] h-full items-center">
          <Text fontSize="text-xl" fontWeight="font-bold">
            {owner?.first_name}'s reviews
          </Text>
        </View>
        <View className="w-[10%]"></View>
      </View>

      <ScrollView className="px-gutter mt-3">
        <Text fontSize="text-lg" fontWeight="font-bold" className="my-6">
          {pluralize(reviews.length, "review")}
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
