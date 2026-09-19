import { Avatar, Text } from "@/components/core";
import { ExpandableText } from "@/components/product/expandable-text";
import { radius } from "@/lib/design-tokens";
import { truncateWords } from "@/lib/format";
import { useTheme } from "@/lib/theme";
import moment from "moment";
import React from "react";
import { TouchableOpacity, View } from "react-native";

interface ReviewCardProps {
  reviewText: string;
  reviewerName: string;
  reviewDate: string;
  reviewerImage: string;
  /** Width as a percentage of the parent, when the caller needs to set one. */
  size?: number;
  /**
   * Opt-in. `detail` is the card the product page's review rail is drawn with
   * in Figma 1:9120: a fixed 185pt so a row of them lines up, the body clamped
   * to three lines in a fixed box, and the control set as a link rather than
   * as brand-coloured text. Every other screen keeps `default`.
   */
  variant?: "default" | "detail";
  /**
   * `detail` only. The card cannot grow inside a fixed-height rail, so its
   * control opens the full list instead of expanding in place.
   */
  onShowMore?: () => void;
}

const PREVIEW_CHARS = 140;

/** The frame's card: 16 + 64 + 4 + 21 + 24 + 40 + 16. */
const DETAIL_HEIGHT = 185;
/** Three lines of 14/21 body, as a fixed box so short reviews still align. */
const DETAIL_BODY_HEIGHT = 64;

export const ReviewCard: React.FC<ReviewCardProps> = ({
  reviewText,
  reviewerName,
  reviewDate,
  reviewerImage,
  size,
  variant = "default",
  onShowMore,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const { color, shadow } = useTheme();
  const detail = variant === "detail";

  const body = reviewText ?? "";
  const isLong = body.length > PREVIEW_CHARS;

  return (
    <View
      style={[
        {
          // `w-[${size}%]` was an interpolated arbitrary class, which NativeWind
          // cannot resolve at build time, so the width was silently dropped.
          width: size ? `${size}%` : "100%",
          padding: 16,
          borderRadius: detail ? radius.card : radius.group,
          borderWidth: 1,
          borderColor: color.line,
          backgroundColor: color.surface,
          gap: detail ? 24 : 14,
        },
        // The detail card sits on a page that rules its own blocks with
        // hairlines; a shadow under it would be a second elevation language.
        // `space-between` holds the author row on the bottom edge, so a rail
        // mixing reviews that are cut off with reviews that are not still
        // lines its avatars up.
        detail
          ? { minHeight: DETAIL_HEIGHT, justifyContent: "space-between" }
          : shadow,
      ]}
    >
      {detail ? (
        <ExpandableText
          text={body}
          fontSize="text-sm"
          lines={3}
          collapsedHeight={DETAIL_BODY_HEIGHT}
          controlGap={4}
          control="underline"
          onPress={onShowMore}
          accessibilityHint={
            onShowMore ? "Opens every review for this listing" : undefined
          }
        />
      ) : (
        // Height follows the content. A fixed h-52 left a void under short
        // reviews and clipped long ones.
        <View style={{ gap: 6 }}>
          <Text fontSize="text-sm" tone="hi">
            {isExpanded ? body : truncateWords(body, PREVIEW_CHARS)}
          </Text>
          {isLong && (
            <TouchableOpacity
              onPress={() => setIsExpanded((open) => !open)}
              accessibilityRole="button"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text fontSize="text-sm" fontWeight="font-bold" tone="brand">
                {isExpanded ? "Show less" : "Show more"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: detail ? 8 : 10,
        }}
      >
        <Avatar uri={reviewerImage} name={reviewerName} size={40} />
        <View style={{ flex: 1 }}>
          <Text fontSize="text-sm" fontWeight="font-bold" numberOfLines={1}>
            {reviewerName}
          </Text>
          <Text fontSize={detail ? "text-xs" : "text-sm"} tone="body">
            {moment(reviewDate).fromNow()}
          </Text>
        </View>
      </View>
    </View>
  );
};
