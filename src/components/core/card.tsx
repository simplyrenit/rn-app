import { aspect, radius } from "@/lib/design-tokens";
import { useDistanceTo } from "@/lib/distance";
import { formatCurrency } from "@/lib/format";
import { useTheme } from "@/lib/theme";
import { ItemCard, useTypedNavigation } from "@/lib/types";
import { Image } from "expo-image";
import React from "react";
import { TouchableOpacity, View } from "react-native";
import { FavouriteButton } from "./favourite-button";
import { Text } from "./text";
import { usePressFeedback } from "./use-press-feedback";

// The design's Home tile rounds its photo to 8; the shared tile uses `radius.card`.
const TILE_IMAGE_RADIUS = 8;

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
   * The Home rails' tile, as the design draws it: an 8pt-radius photo with no
   * hairline over it and the bare corner heart. Saved, Search results and the
   * owner profile use it too.
   */
  tile?: boolean;
}

export function Card({
  image = null,
  title,
  location,
  price,
  id,
  isFavorite: checked,
  width,
  alignItems,
  coordinates,
  distance,
  tile = false,
}: CardProps) {
  const router = useTypedNavigation();
  const { color } = useTheme();
  const { pressStyle, onPressIn, onPressOut } = usePressFeedback();

  // Resolved once per app run behind a shared promise, so a grid of these is
  // not a grid of location lookups.
  const derivedDistance = useDistanceTo(coordinates);
  const distanceLine = distance ?? derivedDistance;

  // Only used when a call site does not pass an explicit width. Grid callers
  // pass one (e.g. "48.5%"); the horizontal rows on Home do not.
  const fallbackCardWidth = "100%";

  const imageStyle = {
    width: "100%",
    aspectRatio: aspect.productImage,
    borderRadius: tile ? TILE_IMAGE_RADIUS : radius.card,
  } as const;

  return (
    <TouchableOpacity
      id={id}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${location}${
        distanceLine ? `, ${distanceLine}` : ""
      }, ${formatCurrency(price)} per day`}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      activeOpacity={1}
      onPress={() => router.navigate("ProductDetail", { id, isFavorite: checked })}
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

          {/* A hairline over the photo. Without it a product shot on a white
              background bleeds into a light canvas and the tile loses its edge.
              The Home tile omits it, as the design does. */}
          {tile ? null : (
            <View
              pointerEvents="none"
              style={{
                ...imageStyle,
                position: "absolute",
                borderWidth: 1,
                borderColor: color.line,
              }}
            />
          )}

          <View style={{ position: "absolute", top: 0, right: 0 }}>
            <FavouriteButton
              id={id}
              isFavorite={Boolean(checked)}
              title={title}
              tile={tile}
            />
          </View>
        </View>

        <View style={{ marginTop: 8 }}>
          {/* Body Small - Bold at Primary, per the design's tile.
              This deliberately reverses an earlier call to hold the title at
              `hi` (70%) to soften a grid of full-white titles on a dark canvas.
              The redesign sets Primary here, so Primary is what ships; if the
              glare reads badly on a long grid, `tone="hi"` is the one-word
              revert and the reason is recorded here.

              One line, not two: the design's tile is a fixed 250pt tall, and a
              wrapping title makes neighbouring grid rows different heights. */}
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            fontSize="text-sm"
            fontWeight="font-bold"
          >
            {title}
          </Text>
          {/* Distance is the more useful of the two, so it takes the line when
              we have it and the place name follows it. */}
          <Text numberOfLines={1} ellipsizeMode="tail" fontSize="text-sm" tone="dim">
            {distanceLine ? `${distanceLine} · ${location}` : location}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
            <Text fontSize="text-md" fontWeight="font-bold">
              {formatCurrency(price)}
            </Text>
            {/* Same tone as the location line above it. These two adjacent lines
                of secondary text used to sit at visibly different weights. */}
            <Text fontSize="text-sm" tone="dim">
              per day
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
