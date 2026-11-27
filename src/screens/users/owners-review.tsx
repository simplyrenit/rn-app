import { imageUrlOf } from "@/lib/image-url";
import { SectionHeader, SubpageHeader } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { ReviewCard } from "@/components/product/review-card";
import { RouteProps } from "@/lib/types";
import { useRoute } from "@react-navigation/native";
import React from "react";
import { ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SCREEN_GUTTER } from "@/lib/design-tokens";
import { pluralize } from "@/lib/pluralize";

// Figma 2089:24740: 8 under the top bar, the 24 gutter, 16 between the
// heading and each card, 24 at the end.
const CONTENT_PAD_TOP = 8;
const CONTENT_PAD_BOTTOM = 24;
const CARD_GAP = 16;

export default function OwnersReviewScreen() {
  const route = useRoute<RouteProps<"OwnersReviewScreen">>();
  const { owner, reviews } = route.params;
  // The container leaves the bottom edge to the screen: the last card clears the home indicator here.
  const insets = useSafeAreaInsets();

  return (
    <NonScrollableContainer>
      {/* "Yashwant's reviews" on a screen reached from a section called
          "Reviews". One rule: bare nouns, and the person is already named by
          the profile you came from. */}
      <SubpageHeader title="Reviews" />

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: CONTENT_PAD_TOP,
          paddingHorizontal: SCREEN_GUTTER,
          paddingBottom: CONTENT_PAD_BOTTOM + insets.bottom,
          gap: CARD_GAP,
        }}
      >
        <SectionHeader
          title={`${owner?.first_name ?? "This owner"}`}
          subtitle={
            reviews.length
              ? pluralize(reviews.length, "review")
              : "No reviews yet"
          }
          gutter={false}
          flush
        />

        {reviews.map((review, index) => (
          <ReviewCard
            key={index}
            reviewText={review.comment}
            reviewerName={`${review.reviewer.first_name} ${review.reviewer.last_name}`}
            reviewDate={review.created_at}
            reviewerImage={imageUrlOf(review.reviewer.image)}
          />
        ))}
      </ScrollView>
    </NonScrollableContainer>
  );
}
