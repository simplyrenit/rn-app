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
import Toast from "react-native-toast-message";

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
      Toast.show({
        type: "customToast",
        position: "bottom",
        text1: "Sign in to write a review",
        text2: "error",
      });
      return;
    }
    if (isOwner) {
      Toast.show({
        type: "customToast",
        position: "bottom",
        text1: "You can't review your own listing",
        text2: "error",
      });
      return;
    }
    navigation.navigate("WriteReviews", {
      product: product,
      owner: owner,
    });
  };

  const isDark = theme === "dark";

  const totalReviews = reviewStats.reduce((sum, item) => sum + item.count, 0);
  const averageRating =
    reviewStats.reduce((sum, item) => sum + item.rating * item.count, 0) /
    totalReviews;

  return (
    <Container>
      <View className="py-4 px-5 flex flex-row items-center">
        <View className="w-[10%]">
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ArrowLeftIcon
              color={isDark ? "white" : "black"}
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

      <ScrollView className="px-5 mt-3">
        <Text
          fontSize="text-lg"
          fontWeight="font-bold"
          className="mt-2"
        >
          Product Reviews
        </Text>
        <View className="flex flex-row space-x-2 items-center mt-6">
          <StarFilled
            color={isDark ? "white" : "black"}
            size={20}
          />
          <Text
            fontSize="text-md"
            fontWeight="font-bold"
            className={`${isDark ? "#FFFFFFB2" : "#000000B2"}`}
          >
            {averageRating ? averageRating.toFixed(1) : "0"}
          </Text>
          <Text
            fontSize="text-md"
            fontWeight="font-bold"
            className={`ml-2 ${isDark ? "#FFFFFFB2" : "#000000B2"}`}
          >
            ∙{" "}
            {totalReviews === 0 ? "No reviews yet" : pluralize(totalReviews, "review")}
          </Text>
        </View>

        {reviewStats.map((item, index) => (
          <View
            key={index}
            className="flex flex-row  items-center mt-2"
          >
            <Text
              className="mr-2 w-[5%]"
              style={{ color: isDark ? "#FFFFFF80" : "#00000080" }}
            >
              {item.rating}
            </Text>
            <StarFilled
              color={isDark ? "white" : "black"}
              size={16}
            />
            <View
              className={`flex-1 h-2 ${
                isDark ? "bg-[#292929]" : "bg-[#e6e6e6]"
              } ml-2`}
              style={{ borderRadius: 9999 }}
            >
              <View
                className={`h-full ${isDark ? "bg-white" : "bg-black"}`}
                style={{
                  width: `${(item.count / totalReviews) * 100}%`,
                  borderRadius: 9999,
                }}
              />
            </View>
            <Text
              className="ml-2 w-8 text-right"
              style={{ color: isDark ? "#FFFFFF80" : "#00000080" }}
            >
              {item.count}
            </Text>
          </View>
        ))}

        {isOwner ? (
          <Text
            className="mt-5"
            style={{ color: isDark ? "#FFFFFF80" : "#00000080" }}
          >
            You can't review your own listing.
          </Text>
        ) : (
          <Button
            variant="outline"
            className="mt-5 flex flex-row items-center justify-center border rounded-xl"
            onPress={handleWriteReview}
          >
            <View className="flex h-full flex-row items-center justify-between w-full">
              <Text className="translate-y-0.5">Write a review</Text>
              <View className="flex flex-row items-center justify-center translate-y-0.5">
                <ChevronRightIcon
                  color={isDark ? "white" : "black"}
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
