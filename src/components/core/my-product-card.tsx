import { formatCurrency } from "@/lib/format";
import { plansOf, smallestPlan } from "@/lib/plans";
import { useTheme } from "@/lib/theme";
import { ItemCard, useTypedNavigation } from "@/lib/types";
import { Image } from "expo-image";
import React from "react";
import { TouchableOpacity, View } from "react-native";
import { InformationCircleIcon } from "react-native-heroicons/outline";
import { listingStatusLabel } from "@/components/product/listing-status";
import { hasPrice } from "@/lib/listing-status";
import { LISTING_IMAGE } from "./card";
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
  plans,
  id,
  status,
  width,
  alignItems,
}: ItemCard) {
  const router = useTypedNavigation();
  const { color } = useTheme();
  const { pressStyle, onPressIn, onPressOut } = usePressFeedback();

  const isFlagged = status === "flagged";
  // The same states the screen's status pill shows, so the row is announced with
  // the label that is drawn under it. The card draws only the "Flagged" overlay
  // itself: the pill carries the rest, and used to be repeated by a corner chip
  // here.
  const statusLabel = status && status !== "live" ? listingStatusLabel(status) : null;
  // A draft made on the dashboard may have no price yet.
  const priced = hasPrice(price);
  // ENG-281: the smallest plan, per its unit.
  const shownPlan = smallestPlan(plansOf({ plans, rate: price }));

  const imageStyle = {
    width: "100%",
    aspectRatio: LISTING_IMAGE.aspectRatio,
    borderRadius: LISTING_IMAGE.radius,
  } as const;

  return (
    <TouchableOpacity
      id={id}
      accessibilityRole="button"
      accessibilityLabel={`${title}${statusLabel ? `, ${statusLabel}` : ""}, ${
        priced ? `${formatCurrency(shownPlan?.price ?? price)} per ${shownPlan?.unit ?? "day"}` : "no price yet"
      }. Opens the product editor.`}
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

          {isFlagged && (
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

        </View>

        {/* Kept identical to Card's text block (the kit Listing card: title,
            price, location) on purpose: My Listings sits a tap away from Saved,
            and the two grids read as one system only if the tile below the
            photo is the same tile. */}
        <View style={{ paddingTop: 8, gap: 2 }}>
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            fontSize="text-sm"
            fontWeight="font-semibold"
          >
            {title}
          </Text>
          {priced ? (
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 2 }}>
              <Text fontSize="text-md" fontWeight="font-bold">
                {formatCurrency(shownPlan?.price ?? price)}
              </Text>
              <Text fontSize="text-xs" tone="dim">
                {`/${shownPlan?.unit ?? "day"}`}
              </Text>
            </View>
          ) : (
            // On the price's own 16/24 line, so a draft's tile is the same height.
            <Text fontSize="text-md" tone="dim">
              No price yet
            </Text>
          )}
          <Text numberOfLines={1} ellipsizeMode="tail" fontSize="text-xs" tone="dim">
            {location}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
