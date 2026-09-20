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
import { ChevronRightIcon } from "react-native-heroicons/mini";
import { StarIcon as StarFilled } from "react-native-heroicons/solid";

import { toast } from "@/lib/toast";
import {
  MIN_TOUCH_TARGET,
  SCREEN_GUTTER,
  density,
  radius,
} from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";

// Measured off the Figma "All reviews" frame (1:17697). The screen is one 24pt
// column under the shared 44pt header, with the gaps the frame draws between
// its blocks rather than a single rhythm.
const TOP_INSET = 24;
/** "Product Reviews" to the score line, and the last bar to the write row. */
const HEADING_GAP = 24;
/** The score line to the histogram, and the list heading to the first card. */
const BLOCK_GAP = 16;
/** Between two bars, and inside the histogram only. */
const BAR_GAP = 8;
/** The write row to the "N reviews" heading. */
const LIST_HEADING_GAP = 32;
/** The star the frame sets beside the score and beside each bar. */
const STAR = 20;
/** Height of a bar's track. */
const BAR_HEIGHT = 8;
/** The rating digit to its star. */
const LABEL_GAP = 8;
/** The star to the track, and the track to the count. */
const BAR_INSET = 12;
/** The count column the frame right of each bar; left-aligned, not ragged. */
const COUNT_WIDTH = 30;
const ROW_RADIUS = radius.button;
/** The row's label sits on 16; its chevron measures ~13 from the edge. */
const ROW_PAD_LEFT = 16;
const ROW_PAD_RIGHT = 12;

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
      {/* The frame titles this screen "All reviews"; the product page's own
          section stays "Reviews", so the two do not read as the same list. */}
      <SubpageHeader title="All reviews" />

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: SCREEN_GUTTER,
          paddingTop: TOP_INSET,
          paddingBottom: density.listFooterCompact,
        }}
      >
        <Text accessibilityRole="header" role="sectionTitle">
          Product Reviews
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
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            marginTop: HEADING_GAP,
          }}
        >
          {/* One star, not five: the frame sets the score as a line of text with
              a single glyph in front of it, a step quieter than the ink the
              bars below are drawn in. */}
          <StarFilled size={STAR} color={color.textBody} />
          {totalReviews ? (
            // Three runs on the row's own 8pt gap, not one string: set inline,
            // the bullet's own spaces measure 12pt tighter than the frame's.
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

        <View style={{ marginTop: BLOCK_GAP, gap: BAR_GAP }}>
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
                style={{ flexDirection: "row", alignItems: "center" }}
              >
                <Text fontSize="text-md" tone="dim">
                  {rating}
                </Text>
                {/* Ink, not gold: the frame draws this histogram monochrome, the
                    way the product page's own rating is drawn. */}
                <View style={{ marginLeft: LABEL_GAP }}>
                  <StarFilled size={STAR} color={color.text} />
                </View>
                <View
                  style={{
                    flex: 1,
                    marginHorizontal: BAR_INSET,
                    height: BAR_HEIGHT,
                    backgroundColor: color.line,
                    borderRadius: radius.full,
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
                      borderRadius: radius.full,
                    }}
                  />
                </View>
                <Text
                  fontSize="text-md"
                  tone="dim"
                  style={{ width: COUNT_WIDTH }}
                >
                  {count}
                </Text>
              </View>
            );
          })}
        </View>

        {isOwner ? (
          <Text
            fontSize="text-sm"
            tone="dim"
            style={{ marginTop: HEADING_GAP }}
          >
            You can’t review your own listing.
          </Text>
        ) : (
          // The frame replaces the old outline button with a list row: a 44pt
          // hairline box, the label on the gutter's own 16 inset and a mini
          // chevron at the far edge.
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Write a review"
            accessibilityHint="Opens the review form for this listing"
            onPress={handleWriteReview}
            style={{
              marginTop: HEADING_GAP,
              height: MIN_TOUCH_TARGET,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingLeft: ROW_PAD_LEFT,
              paddingRight: ROW_PAD_RIGHT,
              borderRadius: ROW_RADIUS,
              borderWidth: 1,
              borderColor: color.line,
              backgroundColor: color.surface,
            }}
          >
            <Text fontSize="text-sm">Write a review</Text>
            <ChevronRightIcon size={STAR} color={color.text} />
          </TouchableOpacity>
        )}

        <Text
          accessibilityRole="header"
          fontSize="text-md"
          fontWeight="font-bold"
          style={{ marginTop: LIST_HEADING_GAP }}
        >
          {currentReviews.length === 0
            ? "No reviews yet"
            : pluralize(currentReviews.length, "review")}
        </Text>

        <View style={{ marginTop: BLOCK_GAP, gap: BLOCK_GAP }}>
          {currentReviews.map((review, index) => (
            // The same card the product page's rail draws, full width: the
            // frame clamps the body to three lines in a 185pt box with an
            // underlined control. No `onShowMore` here, so the control opens
            // the review in place rather than pushing this screen onto itself.
            <ReviewCard
              key={index}
              variant="detail"
              reviewText={review.comment}
              reviewerName={`${review.user.first_name} ${review.user.last_name}`}
              reviewDate={review.created_at}
              reviewerImage={review.user.image?.image_url}
            />
          ))}
        </View>
      </ScrollView>
    </NonScrollableContainer>
  );
}
