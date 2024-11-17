import useReviews from "@/backend/reviews";
import { Button, Container, Text } from "@/components/core";
import { ReviewCard } from "@/components/product/review-card";
import { useGlobalContext } from "@/context/global-context";
import { RouteProps, useTypedNavigation } from "@/lib/types";
import { useRoute } from "@react-navigation/native";
import React, { useState, useEffect } from "react";
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
  const { getReviewStats } = useReviews();
  const { theme, isAuthenticated } = useGlobalContext();

  useEffect(() => {
    fetchReviewStats();
  }, []);

  const fetchReviewStats = async () => {
    const data = await getReviewStats(product.name);
    if (data) {
      setReviewStats(data);
    }
  };

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
      <View className="py-3 px-5 flex flex-row items-center">
        <View className="w-[10%]">
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ArrowLeftIcon color={isDark ? "white" : "black"} size={24} />
          </TouchableOpacity>
        </View>
        <View className="w-[80%] h-full items-center">
          <Text fontSize="text-xl" fontWeight="font-bold">
            All reviews
          </Text>
        </View>
        <View className="w-[10%]"></View>
      </View>

      <ScrollView className="px-5 mt-3">
        <Text fontSize="text-lg" fontWeight="font-bold" className="mt-2">
          Product Reviews
        </Text>
        <View className="flex flex-row space-x-2 items-center mt-6">
          <StarFilled color={isDark ? "white" : "black"} size={20} />
          <Text
            fontSize="text-md"
            fontWeight="font-bold"
            className={`${isDark ? "#FFFFFFB2" : "#000000B2"}`}
          >
            {averageRating.toFixed(1)}
          </Text>
          <Text
            fontSize="text-md"
            fontWeight="font-bold"
            className={`ml-2 ${isDark ? "#FFFFFFB2" : "#000000B2"}`}
          >
            ∙ {totalReviews} reviews
          </Text>
        </View>

        {reviewStats.map((item, index) => (
          <View key={index} className="flex flex-row  items-center mt-2">
            <Text
              className="mr-2 w-[5%]"
              style={{ color: isDark ? "#FFFFFF80" : "#00000080" }}
            >
              {item.rating}
            </Text>
            <StarFilled color={isDark ? "white" : "black"} size={16} />
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

        <Button
          variant="outline"
          className="mt-5 flex flex-row items-center justify-center h-11"
          onPress={handleWriteReview}
        >
          <View className="flex h-full flex-row items-center justify-between w-full">
            <Text>Write a review</Text>
            <ChevronRightIcon color={isDark ? "white" : "black"} size={20} />
          </View>
        </Button>

        <Text fontSize="text-lg" fontWeight="font-bold" className="my-6">
          {reviews.length} reviews
        </Text>

        {reviews.map((review, index) => (
          <ReviewCard
            size={100}
            key={index}
            reviewText={review.comment}
            reviewerName={`${review.user.first_name} ${review.user.last_name}`}
            reviewDate={review.created_at}
            reviewerImage={review.user.image}
          />
        ))}
      </ScrollView>
    </Container>
  );
}
