import useReviews from "@/backend/reviews";
import { Button, SubpageHeader, Text } from "@/components/core";
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

import { toast } from "@/lib/toast";
import {
  MIN_TOUCH_TARGET,
  SCREEN_GUTTER,
  density,
  fontFamily,
  fontSize,
  radius,
} from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";

// Measured off the Figma "Write a review" frame (1:18034): a 24pt column under
// the shared 44pt header, 27 from it, with 16 between blocks and 8 between a
// heading and the control it introduces. 27, not the 24 the All reviews frame
// uses — the two frames disagree, and this is the one that lands on the frame.
const TOP_INSET = 27;
const BLOCK_GAP = 16;
const HEADING_GAP = 8;
/** The listing thumbnail, and the gap to the text beside it. */
const THUMB = 72;
const THUMB_GAP = 16;
/**
 * The three lines of the summary column measure 5 apart in the frame — wider
 * than the type ramp's own leading, and the only place the number appears.
 */
const SUMMARY_LINE_GAP = 5;
/** The frame's text area, and the box the extra sections reuse. */
const FIELD_HEIGHT = 200;
const FIELD_PADDING = 16;
/** The condition control, and the star rows modelled on it. */
const CONTROL_HEIGHT = 48;
const CONTROL_PAD_H = 16;
const CONTROL_PAD_V = 8;
const CONTROL_GAP = 8;
const GLYPH = 20;
/**
 * The frame draws the thumbnail, the condition control and the star rows at
 * radius 12, where `radius.button` is 11 and `radius.group` is 14. Kept local
 * until one ruling moves the token (see design/audit.md).
 */
const CONTROL_RADIUS = 12;

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
  const isOwner = userDetails?.username === owner?.username;

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
    } catch (error: any) {
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

  /** The frame's box: a hairline, no fill, and the page's own ground inside. */
  const fieldStyle = {
    textAlignVertical: "top" as const,
    height: FIELD_HEIGHT,
    padding: FIELD_PADDING,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    // No `lineHeight`: the ramp's 21pt leading pushes the first line 2pt below
    // where the frame sets it, and an input is a single block of typing rather
    // than body copy that needs the extra air.
    color: color.text,
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: radius.card,
  };

  /** The condition control's box, reused by the two star rows. */
  const controlBox = {
    height: CONTROL_HEIGHT,
    paddingHorizontal: CONTROL_PAD_H,
    paddingVertical: CONTROL_PAD_V,
    borderRadius: CONTROL_RADIUS,
    borderWidth: 1,
    borderColor: color.line,
  };

  return (
    <NonScrollableContainer>
      <SubpageHeader title="Write a review" />

      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: SCREEN_GUTTER,
          paddingTop: TOP_INSET,
          paddingBottom: density.listFooterCompact,
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
                borderRadius: CONTROL_RADIUS,
              }}
              contentFit="cover"
              accessibilityLabel={product.title}
            />
          ) : (
            <View
              style={{
                width: THUMB,
                height: THUMB,
                borderRadius: CONTROL_RADIUS,
                backgroundColor: color.skeleton,
              }}
            />
          )}
          <View style={{ flex: 1, gap: SUMMARY_LINE_GAP }}>
            <Text fontSize="text-sm" fontWeight="font-bold" numberOfLines={1}>
              {product.title}
            </Text>
            <Text fontSize="text-sm" tone="body" numberOfLines={1}>
              {product.location}
            </Text>
            {/* Baseline-aligned, so the unit sits on the price's own line
                rather than on the middle of its digits. */}
            <View
              style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}
            >
              <Text fontSize="text-md" fontWeight="font-bold">
                ₹{Number(product.rate).toFixed(0)}
              </Text>
              <Text fontSize="text-sm" tone="dim">
                per day
              </Text>
            </View>
          </View>
        </View>

        {/* The frame labels this field with its placeholder alone. */}
        <TextInput
          style={fieldStyle}
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
              marginTop: HEADING_GAP,
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
            renderLeftIcon={() => (
              <View style={{ marginRight: CONTROL_GAP }}>
                {options.find((option) => option.value === selectedValue)?.icon}
              </View>
            )}
            // The frame's caret is the mini chevron the rest of the app uses;
            // the library's default is a larger filled triangle.
            renderRightIcon={() => (
              <ChevronDownIcon size={GLYPH} color={color.text} />
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
          <View
            style={[
              controlBox,
              {
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              },
            ]}
          >
            <Rating
              value={rating.product}
              size={GLYPH}
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
          <View
            style={[
              controlBox,
              {
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              },
            ]}
          >
            <Rating
              value={rating.owner}
              size={GLYPH}
              onChange={(next) =>
                setRating((prev) => ({ ...prev, owner: next }))
              }
            />
            <Text fontSize="text-md" fontWeight="font-bold">
              {rating.owner || "—"}
            </Text>
          </View>
        </View>

        {reviewValid ? (
          <Button loading={isLoading} onPress={handleSubmit}>
            <Text tone="onBrand" fontWeight="font-bold" fontSize="text-sm">
              Submit feedback
            </Text>
          </Button>
        ) : (
          // The frame draws the inactive state as bare tertiary text in a 44pt
          // row with no fill; it becomes the primary button once the review is
          // complete. Same treatment as Feedback & Review.
          <View
            accessible
            accessibilityRole="button"
            accessibilityState={{ disabled: true }}
            accessibilityLabel="Submit feedback"
            accessibilityHint={
              isOwner
                ? "You can’t review your own listing"
                : "Write both reviews and set both ratings to submit"
            }
            style={{
              height: MIN_TOUCH_TARGET,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text fontSize="text-sm" fontWeight="font-bold" tone="dim">
              Submit feedback
            </Text>
          </View>
        )}
      </KeyboardAwareScrollView>
    </NonScrollableContainer>
  );
}
