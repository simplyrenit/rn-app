import { radius } from "@/lib/design-tokens";
import { formatCurrency } from "@/lib/format";
import { useTheme } from "@/lib/theme";
import { ItemCard, useTypedNavigation } from "@/lib/types";
import { Image } from "expo-image";
import React from "react";
import { TouchableOpacity, View } from "react-native";
import { FavouriteButton } from "./favourite-button";
import { Text } from "./text";

export function Card({
  image = null,
  title,
  location,
  price,
  id,
  isFavorite: checked,
  width,
  alignItems,
}: ItemCard) {
  const router = useTypedNavigation();
  const { color } = useTheme();

  // Only used when a call site does not pass an explicit width. Grid callers
  // pass one (e.g. "48.5%"); the horizontal rows on Home do not.
  const fallbackCardWidth = "100%";

  const imageStyle = {
    width: "100%",
    aspectRatio: 41.5 / 44.5,
    borderRadius: radius.card,
  } as const;

  return (
    <TouchableOpacity
      id={id}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${location}, ${formatCurrency(price)} per day`}
      activeOpacity={0.85}
      onPress={() => router.navigate("ProductDetail", { id, isFavorite: checked })}
      style={{ width: width ?? fallbackCardWidth, alignItems }}
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
              background bleeds into a light canvas and the tile loses its edge. */}
          <View
            pointerEvents="none"
            style={{
              ...imageStyle,
              position: "absolute",
              borderWidth: 1,
              borderColor: color.line,
            }}
          />

          <View style={{ position: "absolute", top: 4, right: 4 }}>
            <FavouriteButton id={id} isFavorite={Boolean(checked)} title={title} />
          </View>
        </View>

        <View style={{ marginTop: 8, gap: 2 }}>
          {/* The name of the thing leads. It used to fall through to the RN
              default (~14pt) while the price beside it was 17pt. */}
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
            {/* Same tone as the location line above it. These two adjacent lines
                of secondary text used to sit at visibly different weights. */}
            <Text fontSize="text-sm" tone="body">
              per day
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
