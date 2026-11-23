import useReviews from "@/backend/reviews";
import { useProduct } from "@/backend/product";
import { SubpageHeader, Text } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { ReviewCard } from "@/components/product/review-card";
import { useGlobalContext } from "@/context/global-context";
import { pluralize } from "@/lib/pluralize";
import { RouteProps, useTypedNavigation } from "@/lib/types";
import { useFocusEffect, useRoute } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronRightIcon } from "react-native-heroicons/mini";
import { StarIcon as StarFilled } from "react-native-heroicons/solid";

import { toast } from "@/lib/toast";
import { MIN_TOUCH_TARGET, SCREEN_GUTTER, radius } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";

// Figma 2089:24972 / 2089:25040 ("All reviews"). One 24pt column under the
// kit top bar: 16 above the first block, 20 between blocks, 24 at the end.
const CONTENT_TOP = 16;
const CONTENT_BOTTOM = 24;
const BLOCK_GAP = 20;
/** Between two histogram rows. */
const BAR_GAP = 12;
/** The glyph beside the score, and the one beside each bar. */
const SCORE_STAR = 20;
const BAR_STAR = 16;
/** The row's own spacing: digit, star, track and count sit 8 apart. */
const ROW_GAP = 8;
const DIGIT_WIDTH = 12;
const BAR_HEIGHT = 8;
/** The count column right of each bar; counts are right-aligned in it. */
const COUNT_WIDTH = 24;
/** "Write a review": a 44 outline row, label on 16, mini chevron on 12. */
const ROW_PAD_LEFT = 16;
const ROW_PAD_RIGHT = 12;
const CHEVRON = 16;

interface ReviewData {
  rating: number;
  count: number;
}

/** 5 down to 1 — the frame always draws five bars, even at zero reviews. */
const RATING_ROWS = [5, 4, 3, 2, 1];

export default function ReviewsScreen() {
  const route = useRoute<RouteProps<"ReviewsScreen">>();
  const navigation = useTypedNavigation();
  const { owner, product, reviews } = route.params;
  const [reviewStats, setReviewStats] = useState<ReviewData[]>([]);
  const [currentReviews, setCurrentReviews] = useState(reviews);
  const { getReviewStats } = useReviews();
  const { fetchReviews } = useProduct();
  const { isAuthenticated, userDetails } = useGlobalContext();
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
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
  const countFor = (rating: number) =>
    ratingBuckets.find((item) => item.rating === rating)?.count ?? 0;

  return (
    <NonScrollableContainer>
      <SubpageHeader title="All reviews" />

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: SCREEN_GUTTER,
          paddingTop: CONTENT_TOP,
          paddingBottom: CONTENT_BOTTOM + insets.bottom,
          gap: BLOCK_GAP,
        }}
      >
        <Text accessibilityRole="header" role="sectionTitle">
          Product reviews
        </Text>

        <View
          accessible
          accessibilityRole="text"
          accessibilityLabel={
            totalReviews
              ? `${averageRating.toFixed(1)} out of 5, ${pluralize(
                  totalReviews,
                  "review"
                )}`
              : "No reviews yet"
          }
          style={{ flexDirection: "row", alignItems: "center", gap: ROW_GAP }}
        >
          {/* One star, not five, at the score's own 70% ink. */}
          <StarFilled size={SCORE_STAR} color={color.textBody} />
          {totalReviews ? (
            // Three runs on the row's own 8pt gap, not one string: set inline,
            // the bullet's own spaces measure tighter than the frame's.
            <>
              <Text fontSize="text-md" tone="body">
                {averageRating.toFixed(1)}
              </Text>
              <Text fontSize="text-md" tone="body">
                •
              </Text>
              <Text fontSize="text-md" tone="body">
                {pluralize(totalReviews, "review")}
              </Text>
            </>
          ) : (
            <Text fontSize="text-md" tone="body">
              No reviews yet
            </Text>
          )}
        </View>

        <View style={{ gap: BAR_GAP }}>
          {RATING_ROWS.map((rating) => {
            const count = countFor(rating);
            return (
              <View
                key={rating}
                accessible
                accessibilityRole="text"
                accessibilityLabel={`${pluralize(
                  rating,
                  "star"
                )}, ${pluralize(count, "review")}`}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: ROW_GAP,
                }}
              >
                <Text fontSize="text-md" tone="dim" style={{ width: DIGIT_WIDTH }}>
                  {rating}
                </Text>
                {/* Ink, not gold: the frame draws this histogram monochrome. */}
                <StarFilled size={BAR_STAR} color={color.text} />
                <View
                  style={{
                    flex: 1,
                    height: BAR_HEIGHT,
                    backgroundColor: color.line,
                    borderRadius: BAR_HEIGHT / 2,
                    overflow: "hidden",
                  }}
                >
                  <View
                    style={{
                      height: "100%",
                      width: totalReviews
                        ? `${(count / totalReviews) * 100}%`
                        : 0,
                      backgroundColor: color.text,
                      borderRadius: BAR_HEIGHT / 2,
                    }}
                  />
                </View>
                <Text
                  fontSize="text-md"
                  tone="dim"
                  style={{ width: COUNT_WIDTH, textAlign: "right" }}
                >
                  {count}
                </Text>
              </View>
            );
          })}
        </View>

        {isOwner ? (
          <Text fontSize="text-sm" tone="dim">
            You can’t review your own listing.
          </Text>
        ) : (
          // A local 44 row, not a 56 kit ListRow: the frame draws it as an
          // outline box on the brand hairline with a brand label and chevron.
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Write a review"
            accessibilityHint="Opens the review form for this listing"
            onPress={handleWriteReview}
            style={{
              height: MIN_TOUCH_TARGET,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingLeft: ROW_PAD_LEFT,
              paddingRight: ROW_PAD_RIGHT,
              borderRadius: radius.button,
              borderWidth: 1,
              borderColor: color.brandPanelLine,
            }}
          >
            <Text fontSize="text-sm" fontWeight="font-semibold" tone="brand">
              Write a review
            </Text>
            <ChevronRightIcon size={CHEVRON} color={color.brandText} />
          </TouchableOpacity>
        )}

        <Text accessibilityRole="header" fontSize="text-md" fontWeight="font-bold">
          {currentReviews.length === 0
            ? "No reviews yet"
            : pluralize(currentReviews.length, "review")}
        </Text>

        {currentReviews.map((review, index) => (
          // No `onShowMore` here, so the control opens the review in place
          // rather than pushing this screen onto itself.
          <ReviewCard
            key={index}
            variant="list"
            reviewText={review.comment}
            reviewerName={`${review.user.first_name} ${review.user.last_name}`}
            reviewDate={review.created_at}
            reviewerImage={review.user.image?.image_url}
          />
        ))}
      </ScrollView>
    </NonScrollableContainer>
  );
}
