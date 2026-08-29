import { Avatar, Text } from "@/components/core";
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
}

const PREVIEW_CHARS = 140;

export const ReviewCard: React.FC<ReviewCardProps> = ({
  reviewText,
  reviewerName,
  reviewDate,
  reviewerImage,
  size,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const { color, shadow } = useTheme();

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
          borderRadius: radius.group,
          borderWidth: 1,
          borderColor: color.line,
          backgroundColor: color.surface,
          gap: 14,
        },
        shadow,
      ]}
    >
      {/* Height follows the content. A fixed h-52 left a void under short
          reviews and clipped long ones. */}
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

      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Avatar uri={reviewerImage} name={reviewerName} size={40} />
        <View style={{ flex: 1 }}>
          <Text fontSize="text-sm" fontWeight="font-bold" numberOfLines={1}>
            {reviewerName}
          </Text>
          <Text fontSize="text-sm" tone="body">
            {moment(reviewDate).fromNow()}
          </Text>
        </View>
      </View>
    </View>
  );
};
