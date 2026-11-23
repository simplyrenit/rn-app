import { useDistanceTo } from "@/lib/distance";
import { formatCurrency } from "@/lib/format";
import { useTheme } from "@/lib/theme";
import { ItemCard, useTypedNavigation } from "@/lib/types";
import { Image } from "expo-image";
import React from "react";
import { TouchableOpacity, View } from "react-native";
import { FavouriteButton } from "./favourite-button";
import { plansOf, smallestPlan } from "@/lib/plans";
import { DeliveryFacts, cardDeliveryLine, deliveryLineText } from "@/lib/delivery";
import { Text } from "./text";
import { usePressFeedback } from "./use-press-feedback";
import { VerifiedBusinessBadge } from "./verified-business-badge";

/**
 * The kit Listing card's photo (figma/00 2073:14326): 162x176 at r8. Exported so
 * MyProductCard draws the same tile. `aspect.productImage` (163/176) is the
 * previous design's measure, still used by the skeleton.
 */
export const LISTING_IMAGE = { aspectRatio: 162 / 176, radius: 8 } as const;

export interface CardProps extends ItemCard {
  /**
   * The listing's coordinates. Given them, the card answers "how far away is
   * it?" — the first question in peer-to-peer rental, which until now the
   * customer could not ask anywhere. Omit them and the card is unchanged.
   */
  coordinates?: { lat?: number; long?: number } | null;
  /** A distance the caller has already worked out. Wins over `coordinates`. */
  distance?: string | null;
  /**
   * Kept so call sites compile; it no longer changes the look. It used to pick
   * the Home tile (8pt photo, no hairline, bare heart) over the older bordered
   * card, and the 2.1 kit has one Listing card for every grid.
   */
  tile?: boolean;
  /**
   * The search's spec filters, handed on to the product page so it can mark
   * the values that matched (ENG-35). Search results only.
   */
  specFilters?: Record<string, string[]>;
  /**
   * The search's dates as India days, handed on to the product page so Book
   * now starts on them (ENG-172). Search results only.
   */
  dates?: { first_day: string; last_day: string };
  /**
   * The owner's `business_verified` (ENG-73): a "Verified" chip on the photo.
   * Search results only; Home rails and the owner's own listings do not pass it.
   */
  businessVerified?: boolean;
  /**
   * ENG-292: the listing's delivery facts, to say "1.2 km · Delivery ₹110" or
   * "0.9 km · Self pickup" for the customer's address in place of the
   * distance and locality. Search results only.
   */
  deliveryFacts?: DeliveryFacts;
}

export function Card({
  image = null,
  title,
  location,
  price,
  plans,
  id,
  isFavorite: checked,
  width,
  alignItems,
  coordinates,
  distance,
  specFilters,
  dates,
  businessVerified,
  deliveryFacts,
}: CardProps) {
  // ENG-281: the smallest plan, per its unit; a product from an older server is its day price.
  const shownPlan = smallestPlan(plansOf({ plans, rate: price }));
  const router = useTypedNavigation();
  const { color } = useTheme();
  const { pressStyle, onPressIn, onPressOut } = usePressFeedback();

  // Resolved once per app run behind a shared promise, so a grid of these is
  // not a grid of location lookups.
  const derivedDistance = useDistanceTo(coordinates);
  const distanceLine = distance ?? derivedDistance;
  const delivery = deliveryFacts ? cardDeliveryLine(deliveryFacts, distanceLine) : null;

  // Only used when a call site does not pass an explicit width. Grid callers
  // pass one (e.g. "48.5%"); the horizontal rows on Home do not.
  const fallbackCardWidth = "100%";

  const imageStyle = {
    width: "100%",
    aspectRatio: LISTING_IMAGE.aspectRatio,
    borderRadius: LISTING_IMAGE.radius,
  } as const;

  return (
    <TouchableOpacity
      id={id}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${location}${
        delivery ? `, ${deliveryLineText(delivery)}` : distanceLine ? `, ${distanceLine}` : ""
      }, ${formatCurrency(shownPlan?.price ?? price)} per ${shownPlan?.unit ?? "day"}${businessVerified ? ", Verified business" : ""}`}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      activeOpacity={1}
      onPress={() =>
        router.navigate("ProductDetail", { id, isFavorite: checked, specFilters, dates })
      }
      style={[{ width: width ?? fallbackCardWidth, alignItems }, pressStyle]}
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

          {/* The chip, not the bare mark: it has to read on any photo. */}
          <View style={{ position: "absolute", left: 8, bottom: 8 }}>
            <VerifiedBusinessBadge verified={businessVerified} variant="chip" />
          </View>

          <View style={{ position: "absolute", top: 0, right: 0 }}>
            <FavouriteButton
              id={id}
              isFavorite={Boolean(checked)}
              title={title}
              tile
            />
          </View>
        </View>

        {/* The kit's text block: title, price, then where. Title 14 SemiBold
            at Primary, one line: a wrapping title makes neighbouring grid rows
            different heights. */}
        <View style={{ paddingTop: 8, gap: 2 }}>
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            fontSize="text-sm"
            fontWeight="font-semibold"
          >
            {title}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 2 }}>
            <Text fontSize="text-md" fontWeight="font-bold">
              {formatCurrency(shownPlan?.price ?? price)}
            </Text>
            <Text fontSize="text-xs" tone="dim">
              {`/${shownPlan?.unit ?? "day"}`}
            </Text>
          </View>
          {/* The kit's location line. Distance is the more useful of the two,
              so it leads the line when we have it; with delivery facts the
              delivery line takes the slot instead. */}
          {delivery ? (
            // The word is what the customer scans for: green, with its fee, when
            // the shop delivers to their address.
            <Text numberOfLines={1} ellipsizeMode="tail" fontSize="text-xs" tone="dim">
              {delivery.km ? `${delivery.km} · ` : ""}
              {/* The frames (2089:31917) draw the fee in the word's green too (ENG-427). */}
              <Text fontSize="text-xs" tone={delivery.word === "Delivery" ? "success" : "dim"}>
                {delivery.word}
                {delivery.fee ? ` ${delivery.fee}` : ""}
              </Text>
            </Text>
          ) : (
            <Text numberOfLines={1} ellipsizeMode="tail" fontSize="text-xs" tone="dim">
              {distanceLine ? `${distanceLine} · ${location}` : location}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}
