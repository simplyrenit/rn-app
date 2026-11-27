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
   * Opt-in. `detail` is the rail card (Figma 2083:16177): 182pt so a row of
   * them lines up, the body clamped to three lines in a fixed box, then the
   * author. `list` is the All reviews card (2089:24972): no box, the author
   * first, two lines of body and the control. Every other screen keeps
   * `default`.
   */
  variant?: "default" | "detail" | "list";
  /**
   * `detail` only. The card cannot grow inside a fixed-height rail, so its
   * control opens the full list instead of expanding in place.
   */
  onShowMore?: () => void;
  /** What VoiceOver says the control opens. Defaults to the listing's reviews. */
  showMoreHint?: string;
}

const PREVIEW_CHARS = 140;

/** The rail card (2083:16177): 16 + 64 + 4 + 18 + 24 + 40 + 16. */
const DETAIL_HEIGHT = 182;
/** Three lines of 14/21 body, as a fixed box so short reviews still align. */
const DETAIL_BODY_HEIGHT = 64;

export const ReviewCard: React.FC<ReviewCardProps> = (props) => {
  // `variant` is fixed per call site, so this never swaps hooks mid-life.
  if (props.variant === "detail") return <DetailCard {...props} />;
  if (props.variant === "list") return <ListCard {...props} />;
  return <DefaultCard {...props} />;
};

/** The product page's (and owner page's) rail card, 2083:16177. */
function DetailCard({
  reviewText,
  reviewerName,
  reviewDate,
  reviewerImage,
  size,
  onShowMore,
  showMoreHint = "Opens every review for this listing",
}: ReviewCardProps) {
  const { color } = useTheme();
  return (
    <View
      style={{
        width: size ? `${size}%` : "100%",
        minHeight: DETAIL_HEIGHT,
        // 15 inside the 1pt border: Figma strokes inside the 16 padding, an RN border adds to it.
        padding: 15,
        borderRadius: radius.card,
        borderWidth: 1,
        borderColor: color.line,
        backgroundColor: color.surface,
        gap: 24,
        // Holds the author row on the bottom edge, so a rail mixing reviews
        // that are cut off with ones that are not still lines its avatars up.
        justifyContent: "space-between",
      }}
    >
      <ExpandableText
        text={reviewText ?? ""}
        fontSize="text-sm"
        tone="body"
        lines={3}
        lineHeight={21}
        collapsedHeight={DETAIL_BODY_HEIGHT}
        controlGap={4}
        control="link"
        controlLineHeight={18}
        onPress={onShowMore}
        accessibilityHint={onShowMore ? showMoreHint : undefined}
      />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Avatar uri={reviewerImage} name={reviewerName} size={40} />
        <View style={{ flex: 1 }}>
          <Text
            fontSize="text-sm"
            lineHeight={21}
            fontWeight="font-semibold"
            numberOfLines={1}
          >
            {reviewerName}
          </Text>
          <Text fontSize="text-xs" lineHeight={18} tone="dim">
            {moment(reviewDate).fromNow()}
          </Text>
        </View>
      </View>
    </View>
  );
}

/** The All reviews card, 2089:24972: author, two lines of body, control. */
function ListCard({
  reviewText,
  reviewerName,
  reviewDate,
  reviewerImage,
}: ReviewCardProps) {
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Avatar uri={reviewerImage} name={reviewerName} size={40} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text fontSize="text-sm" fontWeight="font-semibold" numberOfLines={1}>
            {reviewerName}
          </Text>
          {/* The frame prints "12 Oct 2026"; the relative date is kept. */}
          <Text fontSize="text-xs" tone="dim">
            {moment(reviewDate).fromNow()}
          </Text>
        </View>
      </View>
      <ExpandableText
        text={reviewText ?? ""}
        fontSize="text-sm"
        tone="body"
        lines={2}
        controlGap={8}
        control="link"
        controlLineHeight={20}
      />
    </View>
  );
}

const DefaultCard: React.FC<ReviewCardProps> = ({
  reviewText,
  reviewerName,
  reviewDate,
  reviewerImage,
  size,
  variant = "default",
  onShowMore,
  showMoreHint = "Opens every review for this listing",
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
            onShowMore ? showMoreHint : undefined
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
