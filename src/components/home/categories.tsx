import { CategoryIcon, categoryDisplayName } from "@/lib/category-icons";
import { CATEGORIES } from "@/lib/categories";
import { SCREEN_GUTTER, density, radius } from "@/lib/design-tokens";
import { getDiscoveryLocationData } from "@/lib/location";
import { useTheme } from "@/lib/theme";
import { CategoryItem, useTypedNavigation } from "@/lib/types";
import React from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { Text } from "../core";

const GAP = 8;

/**
 * The category rail.
 *
 * It was two rows of 64pt glyph tiles at a 117pt pitch — 234pt, better than a
 * quarter of the viewport, spent on ten links that also exist inside Search.
 * Together with the search field and the first section heading that pushed the
 * first product pixel to 411pt on an iPhone 17 Pro: 47% of the screen before
 * any merchandise.
 *
 * It is now one row of chips at 36pt. Same ten destinations, same glyphs, same
 * tap targets (the chip is 36pt tall inside a 44pt row), roughly 170pt back.
 * The chip is also the shape Search already uses for the same categories, so
 * the two screens stopped disagreeing about what a category looks like.
 */
export function Categories() {
  const navigation = useTypedNavigation();
  const { color } = useTheme();

  const openCategory = async (category: CategoryItem) => {
    const locationData = await getDiscoveryLocationData();
    navigation.navigate("SearchResults", {
      category: category.name,
      address: locationData?.address ?? "",
      coords: locationData?.coordinates
        ? {
            lat: locationData.coordinates.lat,
            lng: locationData.coordinates.long,
          }
        : { lat: undefined, lng: undefined },
      range: { startDate: undefined, endDate: undefined },
      products: [],
      selectedItem: category.name,
    });
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      // A trailing gutter as wide as the leading one, so the last chip ends on
      // the content edge instead of being sliced mid-word by the screen.
      contentContainerStyle={{
        paddingHorizontal: SCREEN_GUTTER,
        paddingVertical: 4,
        gap: GAP,
        alignItems: "center",
      }}
    >
      {CATEGORIES.map((category) => (
        <TouchableOpacity
          key={category.name}
          accessibilityRole="button"
          accessibilityLabel={`Browse ${categoryDisplayName(category.name)}`}
          activeOpacity={0.7}
          onPress={() => openCategory(category)}
          hitSlop={{ top: 6, bottom: 6, left: 0, right: 0 }}
          style={{
            height: density.chip,
            flexDirection: "row",
            alignItems: "center",
            gap: 7,
            paddingHorizontal: 12,
            borderRadius: radius.full,
            backgroundColor: color.surface,
            borderWidth: 1,
            borderColor: color.line,
          }}
        >
          <CategoryIcon name={category.name} size={17} color={color.brandText} />
          <Text fontSize="text-sm" fontWeight="font-medium" numberOfLines={1}>
            {categoryDisplayName(category.name)}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
