import { BackButton, SectionHeader, Text } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { ReviewCard } from "@/components/product/review-card";
import { RouteProps } from "@/lib/types";
import { useRoute } from "@react-navigation/native";
import React from "react";
import { ScrollView, View } from "react-native";
import { MIN_TOUCH_TARGET, SCREEN_GUTTER, density } from "@/lib/design-tokens";
import { pluralize } from "@/lib/pluralize";

export default function OwnersReviewScreen() {
  const route = useRoute<RouteProps<"OwnersReviewScreen">>();
  const { owner, reviews } = route.params;

  return (
    <NonScrollableContainer>
      {/* "Yashwant's reviews" on a screen reached from a section called
          "Reviews". One rule: bare nouns, and the person is already named by
          the profile you came from. */}
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
            title={`${owner?.first_name ?? "This owner"}`}
            subtitle={
              reviews.length
                ? pluralize(reviews.length, "review")
                : "No reviews yet"
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
          {reviews.map((review, index) => (
            <ReviewCard
              key={index}
              reviewText={review.comment}
              reviewerName={`${review.reviewer.first_name} ${review.reviewer.last_name}`}
              reviewDate={review.created_at}
              reviewerImage={review.reviewer.image || ""}
            />
          ))}
        </View>
      </ScrollView>
    </NonScrollableContainer>
  );
}
