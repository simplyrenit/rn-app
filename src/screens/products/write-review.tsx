import useReviews from "@/backend/reviews";
import { BottomBar, SubpageHeader, Text } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import Rating from "@/components/core/rating";
import { useGlobalContext } from "@/context/global-context";
import {
  BadCondition,
  ExcellentCondition,
  GoodCondition,
} from "@/icons/conditions";
import { RouteProps, useTypedNavigation } from "@/lib/types";
import { useRoute } from "@react-navigation/native";
import { Image } from "expo-image";
import React, { useState } from "react";
import { TextInput, View } from "react-native";
import { ChevronDownIcon } from "react-native-heroicons/mini";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { Dropdown as RNEDropdown } from "react-native-element-dropdown";

import { apiError } from "@/lib/api-error";
import { toast } from "@/lib/toast";
import {
  SCREEN_GUTTER,
  fontFamily,
  fontSize,
  lineHeight,
  radius,
} from "@/lib/design-tokens";
import { formatCurrency } from "@/lib/format";
import { plansOf, smallestPlan } from "@/lib/plans";
import { useTheme } from "@/lib/theme";

// Figma 2089:25101 / 2089:25181: a 24pt column under the kit top bar, 16 above
// the first block, 24 between blocks and 12 from a heading to its control.
const CONTENT_TOP = 16;
const CONTENT_BOTTOM = 24;
const BLOCK_GAP = 24;
const HEADING_GAP = 12;
/** The listing thumbnail (r8), and the gap to the text beside it. */
const THUMB = 72;
const THUMB_RADIUS = 8;
const THUMB_GAP = 16;
/** The summary column's three lines sit 2 apart; so do price and unit. */
const SUMMARY_LINE_GAP = 2;
/** The kit field box at the frame's text-area height: r12, a hairline, 12/16 padding. */
const FIELD_HEIGHT = 112;
const FIELD_PAD_V = 12;
const FIELD_PAD_H = 16;
/** The condition dropdown (48) and the star rows (52), on the field's 16 sides. */
const CONTROL_HEIGHT = 48;
const RATING_HEIGHT = 52;
const CONTROL_PAD_H = 16;
const CONTROL_GAP = 8;
const GLYPH = 20;
/** The rating stars: 28pt, 8 apart. */
const STAR = 28;
const STAR_GAP = 8;
const CONTROL_RADIUS = radius.input;

type ConditionOption = {
  label: string;
  value: string;
  icon: JSX.Element;
};

export default function WriteReviewScreen() {
  const [productReview, setProductReview] = useState("");
  const [ownerReview, setOwnerReview] = useState("");
  const [rating, setRating] = useState({ product: 0, owner: 0 });
  const route = useRoute<RouteProps<"WriteReviews">>();
  const navigation = useTypedNavigation();
  const { product, owner } = route.params;
  const { writeAReview, isLoading } = useReviews();

  const [selectedValue, setSelectedValue] = useState<string>("good");

  const { color } = useTheme();
  const { userDetails } = useGlobalContext();
  const isOwner = Boolean(owner) && userDetails?.username === owner?.username;
  const plan = smallestPlan(plansOf(product));

  const reviewValid =
    !isOwner &&
    Boolean(productReview && ownerReview && rating.product && rating.owner);

  const handleSubmit = async () => {
    if (isOwner) {
      toast.error("You can’t review your own listing");
      return;
    }

    const reviewData = {
      productName: product.name,
      productReview,
      ownerReview,
      productRating: rating.product,
      ownerRating: rating.owner,
      condition: selectedValue,
    };

    try {
      await writeAReview(reviewData);
      toast.success("Review submitted");
      navigation.goBack();
    } catch (error) {
      // The API says why, e.g. `not_rented` before a rental of this product closed.
      toast.error(apiError(error)?.message ?? "Your review was not sent. Try again.");
    }
  };

  const options: ConditionOption[] = [
    {
      label: "Excellent",
      value: "excellent",
      icon: <ExcellentCondition size={GLYPH} color={color.text} />,
    },
    {
      label: "Good",
      value: "good",
      icon: <GoodCondition size={GLYPH} color={color.text} />,
    },
    {
      label: "Fair",
      value: "fair",
      icon: <BadCondition size={GLYPH} color={color.text} />,
    },
  ];

  /**
   * The frame's text area: the kit field box at 112 high with 16/24 type. Not
   * `TextField`, which is the 48pt single-line kit field.
   */
  const fieldStyle = {
    textAlignVertical: "top" as const,
    height: FIELD_HEIGHT,
    paddingTop: FIELD_PAD_V,
    paddingBottom: FIELD_PAD_V,
    paddingHorizontal: FIELD_PAD_H,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    fontFamily: fontFamily.regular,
    color: color.text,
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: CONTROL_RADIUS,
  };

  /** The condition control's box, reused by the two star rows at 52. */
  const controlBox = {
    height: CONTROL_HEIGHT,
    paddingHorizontal: CONTROL_PAD_H,
    borderRadius: CONTROL_RADIUS,
    borderWidth: 1,
    borderColor: color.line,
  };
  const ratingBox = [
    controlBox,
    {
      height: RATING_HEIGHT,
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
    },
  ];

  return (
    <NonScrollableContainer>
      <SubpageHeader title="Write a review" />

      {/* The container already pads by the iOS keyboard (Android resizes),
          so the sticky bar below rides on the keys without a second lift. */}
      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: SCREEN_GUTTER,
          paddingTop: CONTENT_TOP,
          paddingBottom: CONTENT_BOTTOM,
          gap: BLOCK_GAP,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: THUMB_GAP,
          }}
        >
          {product.cover_image ? (
            <Image
              source={{ uri: product.cover_image }}
              style={{
                width: THUMB,
                height: THUMB,
                borderRadius: THUMB_RADIUS,
              }}
              contentFit="cover"
              accessibilityLabel={product.title}
            />
          ) : (
            <View
              style={{
                width: THUMB,
                height: THUMB,
                borderRadius: THUMB_RADIUS,
                backgroundColor: color.skeleton,
              }}
            />
          )}
          <View style={{ flex: 1, gap: SUMMARY_LINE_GAP }}>
            <Text fontSize="text-sm" fontWeight="font-semibold" numberOfLines={1}>
              {product.title}
            </Text>
            {product.location ? (
              <Text fontSize="text-sm" tone="body" numberOfLines={1}>
                {product.location}
              </Text>
            ) : null}
            {/* Baseline-aligned, so the unit sits on the price's own line
                rather than on the middle of its digits. A closed booking
                passes no price, and the line is left out rather than "₹0". */}
            {plan ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "baseline",
                  gap: SUMMARY_LINE_GAP,
                }}
              >
                <Text fontSize="text-md" fontWeight="font-bold">
                  {formatCurrency(plan.price)}
                </Text>
                <Text fontSize="text-xs" tone="dim">
                  {`/${plan.unit}`}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* The frame labels this field with its placeholder alone. */}
        <TextInput
          style={fieldStyle}
          // The core Text's cap, so the typed text and the page around it
          // scale together instead of the input running uncapped.
          maxFontSizeMultiplier={1.4}
          multiline
          placeholder="Share your thoughts..."
          placeholderTextColor={color.placeholder}
          accessibilityLabel="Your review of the product"
          value={productReview}
          onChangeText={setProductReview}
        />

        <View style={{ gap: HEADING_GAP }}>
          <Text
            accessibilityRole="header"
            fontSize="text-md"
            fontWeight="font-bold"
          >
            How was the product’s condition?
          </Text>

          <RNEDropdown
            style={controlBox}
            activeColor={color.surfaceRaised}
            containerStyle={{
              marginTop: CONTROL_GAP,
              backgroundColor: color.surface,
              borderRadius: CONTROL_RADIUS,
              borderWidth: 1,
              borderColor: color.line,
              overflow: "hidden",
            }}
            itemTextStyle={{
              color: color.text,
              fontFamily: fontFamily.regular,
              fontSize: fontSize.md,
            }}
            itemContainerStyle={{
              borderBottomWidth: 1,
              borderBottomColor: color.line,
            }}
            placeholderStyle={{
              color: color.placeholder,
              fontFamily: fontFamily.regular,
              fontSize: fontSize.md,
            }}
            selectedTextStyle={{
              color: color.text,
              fontFamily: fontFamily.regular,
              fontSize: fontSize.md,
            }}
            data={options}
            labelField="label"
            valueField="value"
            value={selectedValue}
            onChange={(item) => setSelectedValue(item.value)}
            accessibilityLabel="Condition"
            // The closed control is the label alone; the glyphs stay in the
            // open list. The caret is the mini chevron at 60%.
            renderRightIcon={() => (
              <ChevronDownIcon size={GLYPH} color={color.textDim} />
            )}
            renderItem={(item) => (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: CONTROL_GAP,
                  paddingHorizontal: CONTROL_PAD_H,
                  height: CONTROL_HEIGHT,
                }}
              >
                {item.icon}
                <Text fontSize="text-md">{item.label}</Text>
              </View>
            )}
            placeholder="Select condition"
          />
        </View>

        {/* Not in the frame. The backend requires an owner review and both
            ratings, so they stay — set in the frame's own tokens and rhythm
            rather than dropped. See design/audit.md: which of the two is
            wrong is a product decision, not a layout one. */}
        <View style={{ gap: HEADING_GAP }}>
          <Text
            accessibilityRole="header"
            fontSize="text-md"
            fontWeight="font-bold"
          >
            How was the owner?
          </Text>
          <TextInput
            style={fieldStyle}
            maxFontSizeMultiplier={1.4}
            multiline
            placeholder="Share your thoughts..."
            placeholderTextColor={color.placeholder}
            accessibilityLabel="Your review of the owner"
            value={ownerReview}
            onChangeText={setOwnerReview}
          />
        </View>

        <View style={{ gap: HEADING_GAP }}>
          <Text
            accessibilityRole="header"
            fontSize="text-md"
            fontWeight="font-bold"
          >
            Rate the product
          </Text>
          <View style={ratingBox}>
            <Rating
              tone="ink"
              value={rating.product}
              size={STAR}
              gap={STAR_GAP}
              onChange={(next) =>
                setRating((prev) => ({ ...prev, product: next }))
              }
            />
            <Text fontSize="text-md" fontWeight="font-bold">
              {rating.product || "—"}
            </Text>
          </View>
        </View>

        <View style={{ gap: HEADING_GAP }}>
          <Text
            accessibilityRole="header"
            fontSize="text-md"
            fontWeight="font-bold"
          >
            Rate the owner
          </Text>
          <View style={ratingBox}>
            <Rating
              tone="ink"
              value={rating.owner}
              size={STAR}
              gap={STAR_GAP}
              onChange={(next) =>
                setRating((prev) => ({ ...prev, owner: next }))
              }
            />
            <Text fontSize="text-md" fontWeight="font-bold">
              {rating.owner || "—"}
            </Text>
          </View>
        </View>

      </KeyboardAwareScrollView>

      {/* The kit Full CTA bar; its disabled Primary replaces the old dimmed
          text until both reviews and both ratings are in. */}
      <BottomBar
        primary={{
          label: "Submit feedback",
          onPress: handleSubmit,
          disabled: !reviewValid,
          loading: isLoading,
        }}
      />
    </NonScrollableContainer>
  );
}
