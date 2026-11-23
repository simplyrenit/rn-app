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
  /** What VoiceOver says the control opens. Defaults to the listing's reviews. */
  showMoreHint?: string;
  /** Opt-in, pt: overrides the `size` percentage (the owner profile's 285 rail card). */
  width?: number;
  /** Opt-in, `detail` only, pt: overrides the 185 card height (the owner profile's 182). */
  height?: number;
}

const PREVIEW_CHARS = 140;

/** The frame's card: 16 + 64 + 4 + 21 + 24 + 40 + 16. */
const DETAIL_HEIGHT = 185;
/** Three lines of 14/21 body, as a fixed box so short reviews still align. */
const DETAIL_BODY_HEIGHT = 64;
/** The owners-reviews card (Figma 2089:24740): 14/21 comment and name, 12/18 date. */
const BODY_LEADING = 21;
const DATE_LEADING = 18;

export const ReviewCard: React.FC<ReviewCardProps> = ({
  reviewText,
  reviewerName,
  reviewDate,
  reviewerImage,
  size,
  variant = "default",
  onShowMore,
  showMoreHint = "Opens every review for this listing",
  width,
  height,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const { color } = useTheme();
  const detail = variant === "detail";

  const body = reviewText ?? "";
  const isLong = body.length > PREVIEW_CHARS;

  return (
    <View
      style={[
        {
          // `w-[${size}%]` was an interpolated arbitrary class, which NativeWind
          // cannot resolve at build time, so the width was silently dropped.
          width: width ?? (size ? `${size}%` : "100%"),
          padding: 16,
          borderRadius: radius.card,
          borderWidth: 1,
          borderColor: color.line,
          backgroundColor: color.surface,
          gap: 24,
        },
        // Both cards sit on pages that rule their own blocks with hairlines; a
        // shadow under them would be a second elevation language.
        // `space-between` holds the author row on the bottom edge, so a rail
        // mixing reviews that are cut off with reviews that are not still
        // lines its avatars up.
        detail
          ? { minHeight: height ?? DETAIL_HEIGHT, justifyContent: "space-between" }
          : null,
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
            onShowMore ? showMoreHint : undefined
          }
        />
      ) : (
        // Height follows the content. A fixed h-52 left a void under short
        // reviews and clipped long ones.
        <View style={{ gap: 4 }}>
          <Text fontSize="text-sm" lineHeight={BODY_LEADING} tone="body">
            {isExpanded ? body : truncateWords(body, PREVIEW_CHARS)}
          </Text>
          {isLong && (
            <TouchableOpacity
              onPress={() => setIsExpanded((open) => !open)}
              accessibilityRole="button"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text fontSize="text-sm" fontWeight="font-semibold" tone="brand">
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
          gap: 8,
        }}
      >
        <Avatar uri={reviewerImage} name={reviewerName} size={40} />
        {detail ? (
          <View style={{ flex: 1 }}>
            <Text fontSize="text-sm" fontWeight="font-bold" numberOfLines={1}>
              {reviewerName}
            </Text>
            <Text fontSize="text-xs" tone="body">
              {moment(reviewDate).fromNow()}
            </Text>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <Text fontSize="text-sm" lineHeight={BODY_LEADING} fontWeight="font-semibold" numberOfLines={1}>
              {reviewerName}
            </Text>
            <Text fontSize="text-xs" lineHeight={DATE_LEADING} tone="dim">
              {moment(reviewDate).fromNow()}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};
