import { pluralize } from "@/lib/pluralize";
import useReviews from "@/backend/reviews";
import { useProduct } from "@/backend/product";
import {
  BackButton,
  Button,
  SectionHeader,
  StaticContainer,
  Text,
} from "@/components/core";
import { ReviewCard } from "@/components/product/review-card";
import { Stars } from "@/components/product/stars";
import { useGlobalContext } from "@/context/global-context";
import { RouteProps, useTypedNavigation } from "@/lib/types";
import { useFocusEffect, useRoute } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { ScrollView, View } from "react-native";
import { StarIcon as StarFilled } from "react-native-heroicons/solid";

import { toast } from "@/lib/toast";
import {
  MIN_TOUCH_TARGET,
  SCREEN_GUTTER,
  density,
  radius,
} from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";

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
  const { isAuthenticated, userDetails } = useGlobalContext();
  const { color, isDark } = useTheme();
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

  // Star ratings run 1-5. The API also returns a "0" bucket, which only ever
  // catches a rating of exactly 0 and rendered a meaningless "0 star" row.
  const ratingBuckets = reviewStats.filter((item) => item.rating > 0);
  const totalReviews = ratingBuckets.reduce((sum, item) => sum + item.count, 0);
  const averageRating = totalReviews
    ? ratingBuckets.reduce((sum, item) => sum + item.rating * item.count, 0) /
      totalReviews
    : 0;

  return (
    <StaticContainer width={100}>
      {/* One heading rule across the flow: bare nouns. The product page's
          section is called "Reviews", so this screen is too. */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 10,
          paddingVertical: 6,
        }}
      >
        <BackButton />
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text role="screenTitle" numberOfLines={1}>
            Reviews
          </Text>
        </View>
        <View style={{ width: MIN_TOUCH_TARGET }} />
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingTop: density.section }}>
          <SectionHeader
            title="Rating"
            subtitle={
              totalReviews === 0
                ? "No reviews yet"
                : pluralize(totalReviews, "review")
            }
          />
        </View>

        <View style={{ paddingHorizontal: SCREEN_GUTTER }}>
          <View
            style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
          >
            <Text fontSize="text-2xl" fontWeight="font-bold">
              {averageRating ? averageRating.toFixed(1) : "—"}
            </Text>
            <Stars rating={averageRating} isDark={isDark} />
          </View>

          {ratingBuckets.map((item) => (
            <View
              key={item.rating}
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 8,
                gap: 8,
              }}
            >
              <Text fontSize="text-sm" tone="dim" style={{ width: 12 }}>
                {item.rating}
              </Text>
              {/* Gold, so the histogram reads as a rating and not as a chart. */}
              <StarFilled color={color.warning} size={14} />
              <View
                style={{
                  flex: 1,
                  height: 8,
                  backgroundColor: color.skeleton,
                  borderRadius: radius.full,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    height: "100%",
                    width: totalReviews
                      ? `${(item.count / totalReviews) * 100}%`
                      : 0,
                    backgroundColor: color.brand,
                    borderRadius: radius.full,
                  }}
                />
              </View>
              <Text
                fontSize="text-sm"
                tone="dim"
                style={{ width: 28, textAlign: "right" }}
              >
                {item.count}
              </Text>
            </View>
          ))}

          {isOwner ? (
            <Text fontSize="text-sm" tone="dim" style={{ marginTop: density.section }}>
              You can’t review your own listing.
            </Text>
          ) : (
            <Button
              variant="outline"
              style={{ marginTop: density.section }}
              onPress={handleWriteReview}
            >
              Write a review
            </Button>
          )}
        </View>

        <View style={{ paddingTop: density.section * 1.5 }}>
          <SectionHeader
            title="Reviews"
            subtitle={
              currentReviews.length === 0 ? "Nothing written yet" : undefined
            }
          />
        </View>

        <View
          style={{
            paddingHorizontal: SCREEN_GUTTER,
            paddingBottom: density.section * 2,
            gap: 12,
          }}
        >
          {currentReviews.map((review, index) => (
            <ReviewCard
              key={index}
              reviewText={review.comment}
              reviewerName={`${review.user.first_name} ${review.user.last_name}`}
              reviewDate={review.created_at}
              reviewerImage={review.user.image?.image_url}
            />
          ))}
        </View>
      </ScrollView>
    </StaticContainer>
  );
}
