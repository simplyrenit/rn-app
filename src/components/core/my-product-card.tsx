import { radius } from "@/lib/design-tokens";
import { formatCurrency } from "@/lib/format";
import { useTheme } from "@/lib/theme";
import { ItemCard, useTypedNavigation } from "@/lib/types";
import { Image } from "expo-image";
import React from "react";
import { TouchableOpacity, View } from "react-native";
import { InformationCircleIcon } from "react-native-heroicons/outline";
import { Text } from "./text";

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
 * opens the listing on tap — where Edit already lives in the footer.
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

  const isModerated = moderationLabels?.length > 0;
  // A listing is pending until an admin approves it. A flagged listing already
  // shows its own overlay, so the pending badge would only duplicate it.
  const isPendingApproval = !isModerated && adminApproved !== true;

  const status = isModerated
    ? "Flagged"
    : isPendingApproval
    ? "Pending approval"
    : null;

  const imageStyle = {
    width: "100%",
    aspectRatio: 41.5 / 44.5,
    borderRadius: radius.card,
  } as const;

  return (
    <TouchableOpacity
      id={id}
      accessibilityRole="button"
      accessibilityLabel={`${title}${status ? `, ${status}` : ""}, ${formatCurrency(
        price
      )} per day. Opens the listing.`}
      activeOpacity={0.85}
      onPress={() => router.navigate("ProductDetail", { id })}
      style={{ width: width ?? "100%", alignItems }}
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
                backgroundColor: "rgba(10,10,15,0.72)",
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
          {isPendingApproval && (
            <View
              style={{
                position: "absolute",
                top: 6,
                left: 6,
                backgroundColor: "rgba(10,10,15,0.72)",
                paddingHorizontal: 7,
                paddingVertical: 3,
                borderRadius: radius.full,
              }}
            >
              <Text
                fontSize="text-xs"
                fontWeight="font-medium"
                style={{ color: "#FFFFFF" }}
              >
                Pending
              </Text>
            </View>
          )}
        </View>

        <View style={{ marginTop: 8, gap: 2 }}>
          <Text
            numberOfLines={2}
            ellipsizeMode="tail"
            fontSize="text-md"
            fontWeight="font-semibold"
          >
            {title}
          </Text>
          <Text numberOfLines={1} ellipsizeMode="tail" fontSize="text-sm" tone="body">
            {location}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
            <Text fontSize="text-md" fontWeight="font-bold">
              {formatCurrency(price)}
            </Text>
            <Text fontSize="text-sm" tone="body">
              per day
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
