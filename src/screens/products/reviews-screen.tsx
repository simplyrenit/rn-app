import { pluralize } from "@/lib/pluralize";
import useReviews from "@/backend/reviews";
import { useProduct } from "@/backend/product";
import { Button, Container, Text } from "@/components/core";
import { ReviewCard } from "@/components/product/review-card";
import { useGlobalContext } from "@/context/global-context";
import { RouteProps, useTypedNavigation } from "@/lib/types";
import { useFocusEffect, useRoute } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import {
  ArrowLeftIcon,
  ChevronRightIcon,
} from "react-native-heroicons/outline";
import { StarIcon as StarFilled } from "react-native-heroicons/solid";

import { toast } from "@/lib/toast";
import { ink, radius } from "@/lib/design-tokens";

interface ReviewData {
  rating: number;
  count: number;
}

export default function ReviewsScreen() {
  const route = useRoute<RouteProps<"ReviewsScreen">>();
  const navigation = useTypedNavigation();
  const { owner, product, reviews } = route.params;
  const [reviewStats, setReviewStats] = useState<ReviewData[]>([]);
  const [currentReviews, setCurrentReviews] = useState(reviews);
  const { getReviewStats } = useReviews();
  const { fetchReviews } = useProduct();
  const { theme, isAuthenticated, userDetails } = useGlobalContext();
  const isOwner = userDetails?.username === owner?.username;

  useFocusEffect(
    useCallback(() => {
      const refreshReviews = async () => {
        const [stats, latestReviews] = await Promise.all([
          getReviewStats(product.name),
          fetchReviews(product.name),
        ]);
        if (stats) setReviewStats(stats);
        setCurrentReviews(latestReviews || []);
      };
      refreshReviews();
    }, [product.name])
  );

  const handleWriteReview = () => {
    if (!isAuthenticated) {
      toast.error("Sign in to write a review");
      return;
    }
    if (isOwner) {
      toast.error("You can’t review your own listing");
      return;
    }
    navigation.navigate("WriteReviews", {
      product: product,
      owner: owner,
    });
  };

  const isDark = theme === "dark";

  // Star ratings run 1-5. The API also returns a "0" bucket, which only ever
  // catches a rating of exactly 0 and rendered a meaningless "0 star" row.
  const ratingBuckets = reviewStats.filter((item) => item.rating > 0);
  const totalReviews = ratingBuckets.reduce((sum, item) => sum + item.count, 0);
  const averageRating = totalReviews
    ? ratingBuckets.reduce((sum, item) => sum + item.rating * item.count, 0) /
      totalReviews
    : 0;

  return (
    <Container>
      <View className="py-4 px-gutter flex flex-row items-center">
        <View className="w-[10%]">
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" onPress={() => navigation.goBack()}>
            <ArrowLeftIcon
              color={ink.text(isDark)}
              size={24}
            />
          </TouchableOpacity>
        </View>
        <View className="w-[80%] h-full items-center">
          <Text
            fontSize="text-xl"
            fontWeight="font-bold"
          >
            All reviews
          </Text>
        </View>
        <View className="w-[10%]"></View>
      </View>

      <ScrollView className="px-gutter mt-3">
        <Text
          fontSize="text-lg"
          fontWeight="font-bold"
          className="mt-2"
        >
          Product Reviews
        </Text>
        <View className="flex flex-row space-x-2 items-center mt-6">
          <StarFilled
            color={ink.text(isDark)}
            size={20}
          />
          <Text
            fontSize="text-md"
            fontWeight="font-bold"
            className={`${ink.body(isDark)}`}
          >
            {averageRating ? averageRating.toFixed(1) : "0"}
          </Text>
          <Text
            fontSize="text-md"
            fontWeight="font-bold"
            className={`ml-2 ${ink.body(isDark)}`}
          >
            ∙{" "}
            {totalReviews === 0 ? "No reviews yet" : pluralize(totalReviews, "review")}
          </Text>
        </View>

        {ratingBuckets.map((item, index) => (
          <View
            key={index}
            className="flex flex-row  items-center mt-2"
          >
            <Text
              className="mr-2 w-[5%]"
              style={{ color: ink.dim(isDark) }}
            >
              {item.rating}
            </Text>
            <StarFilled
              color={ink.text(isDark)}
              size={16}
            />
            <View
              className={`flex-1 h-2 ${
                isDark ? "bg-surface-raised-dark" : "bg-skeleton-light"
              } ml-2`}
              style={{ borderRadius: radius.full }}
            >
              <View
                className={`h-full ${isDark ? "bg-surface-light" : "bg-canvas-dark"}`}
                style={{
                  width: totalReviews
                    ? `${(item.count / totalReviews) * 100}%`
                    : 0,
                  borderRadius: radius.full,
                }}
              />
            </View>
            <Text
              className="ml-2 w-8 text-right"
              style={{ color: ink.dim(isDark) }}
            >
              {item.count}
            </Text>
          </View>
        ))}

        {isOwner ? (
          <Text
            className="mt-5"
            style={{ color: ink.dim(isDark) }}
          >
            You can’t review your own listing.
          </Text>
        ) : (
          <Button
            variant="outline"
            className="mt-5 flex flex-row items-center justify-center border rounded-card"
            onPress={handleWriteReview}
          >
            <View className="flex h-full flex-row items-center justify-between w-full">
              <Text className="translate-y-0.5">Write a review</Text>
              <View className="flex flex-row items-center justify-center translate-y-0.5">
                <ChevronRightIcon
                  color={ink.text(isDark)}
                  size={20}
                />
              </View>
            </View>
          </Button>
        )}

        <Text
          fontSize="text-lg"
          fontWeight="font-bold"
          className="my-6"
        >
          {currentReviews.length === 0
            ? "No reviews yet"
            : pluralize(currentReviews.length, "review")}
        </Text>

        {currentReviews.map((review, index) => (
          <ReviewCard
            size={100}
            key={index}
            reviewText={review.comment}
            reviewerName={`${review.user.first_name} ${review.user.last_name}`}
            reviewDate={review.created_at}
            reviewerImage={review.user.image?.image_url}
          />
        ))}
      </ScrollView>
    </Container>
  );
}
