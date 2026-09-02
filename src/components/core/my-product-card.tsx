import { aspect, darkColors, radius } from "@/lib/design-tokens";
import { formatCurrency } from "@/lib/format";
import { useTheme } from "@/lib/theme";
import { ItemCard, useTypedNavigation } from "@/lib/types";
import { Image } from "expo-image";
import React from "react";
import { TouchableOpacity, View } from "react-native";
import { InformationCircleIcon } from "react-native-heroicons/outline";
import { Text } from "./text";
import { usePressFeedback } from "./use-press-feedback";

/**
 * A listing on the owner's own shelf.
 *
 * It was a third product-card layout: hardcoded `wp("41.5%")` widths that
 * ignored the column the grid handed it — so row one's cards started 32pt from
 * the edge and row two's started 35pt, with different image widths per row — a
 * "Pending approval" pill centred over the artwork with a 20pt bold white
 * label louder than the product title, a raw `₹{price.toFixed(0)}` bypassing
 * the money formatter, and its own full-width 60pt Edit button, so three
 * listings meant 180pt of buttons repeating the same word.
 *
 * It now fills the column it is given, matches Card's proportions exactly, and
 * opens its owner-management editor on tap.
 */
export function MyProductCard({
  image,
  title,
  location,
  price,
  id,
  moderationLabels = [],
  adminApproved,
  width,
  alignItems,
}: ItemCard) {
  const router = useTypedNavigation();
  const { color } = useTheme();
  const { pressStyle, onPressIn, onPressOut } = usePressFeedback();

  const isModerated = moderationLabels?.length > 0;
  // The owner API uses three distinct approval states. Treating false and null
  // as the same state said "Pending" beside a rejected listing's explicit pill.
  const isPendingApproval = !isModerated && adminApproved === null;
  const isRejected = !isModerated && adminApproved === false;

  const status = isModerated
    ? "Flagged"
    : isRejected
    ? "Rejected"
    : isPendingApproval
    ? "Pending approval"
    : null;

  const imageStyle = {
    width: "100%",
    aspectRatio: aspect.productImage,
    borderRadius: radius.card,
  } as const;

  return (
    <TouchableOpacity
      id={id}
      accessibilityRole="button"
      accessibilityLabel={`${title}${status ? `, ${status}` : ""}, ${formatCurrency(
        price
      )} per day. Opens the product editor.`}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      activeOpacity={1}
      onPress={() => router.navigate("editProduct", { id })}
      style={[{ width: width ?? "100%", alignItems }, pressStyle]}
    >
      <View style={{ width: "100%" }}>
        <View style={{ position: "relative" }}>
          {image ? (
            <Image
              style={imageStyle}
              source={{ uri: image }}
              contentFit="cover"
              transition={150}
            />
          ) : (
            <View style={[imageStyle, { backgroundColor: color.skeleton }]} />
          )}

          <View
            pointerEvents="none"
            style={{
              ...imageStyle,
              position: "absolute",
              borderWidth: 1,
              borderColor: color.line,
            }}
          />

          {isModerated && (
            <View
              style={{
                ...imageStyle,
                position: "absolute",
                backgroundColor: color.photoScrim,
                justifyContent: "center",
                alignItems: "center",
                gap: 6,
                paddingHorizontal: 8,
              }}
            >
              <InformationCircleIcon size={22} color={color.danger} />
              <Text
                fontSize="text-xs"
                fontWeight="font-semibold"
                style={{ color: color.danger, textAlign: "center" }}
              >
                Flagged for review
              </Text>
            </View>
          )}

          {/* Anchored to a corner with a consistent inset, and quieter than the
              title it sits above. */}
          {(isPendingApproval || isRejected) && (
            <View
              style={{
                position: "absolute",
                top: 6,
                left: 6,
                backgroundColor: color.photoScrim,
                paddingHorizontal: 7,
                paddingVertical: 3,
                borderRadius: radius.full,
              }}
            >
              <Text
                fontSize="text-xs"
                fontWeight="font-medium"
                style={{ color: darkColors.text }}
              >
                {isRejected ? "Rejected" : "Pending"}
              </Text>
            </View>
          )}
        </View>

        {/* Kept identical to Card's text block on purpose: My Listings sits a
            tap away from Saved, and the two grids read as one system only if the
            tile below the photo is the same tile. */}
        <View style={{ marginTop: 8 }}>
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            fontSize="text-sm"
            fontWeight="font-bold"
          >
            {title}
          </Text>
          <Text numberOfLines={1} ellipsizeMode="tail" fontSize="text-sm" tone="dim">
            {location}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
            <Text fontSize="text-md" fontWeight="font-bold">
              {formatCurrency(price)}
            </Text>
            <Text fontSize="text-sm" tone="dim">
              per day
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
