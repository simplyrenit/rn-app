import {
  CategoryTile,
  ParentCategoryTile,
  TileGrid,
} from "@/components/categories/category-tile";
import { useGlobalContext } from "@/context/global-context";
import { CATEGORIES } from "@/lib/categories";
import { SCREEN_GUTTER } from "@/lib/design-tokens";
import { homeTileName, pickHomeCategories } from "@/lib/home-categories";
import { useTheme } from "@/lib/theme";
import { useTypedNavigation } from "@/lib/types";
import React from "react";
import { View } from "react-native";
import { Squares2X2Icon } from "react-native-heroicons/outline";
import { Text } from "../core";

// Measured off the v3 Home frame (C-10): 16 above the heading (the pinned
// search header adds 8 more), 20 from the heading to the tiles, then four
// 78 x 88 tiles 10 apart with 16 between the two rows.
const TOP_INSET = 16;
const HEADING_GAP = 20;
const GAP = 10;
const ROW_GAP = 16;
const RATIO = 78 / 88;

/**
 * Home's category block: seven categories and an "All categories" tile, in a
 * 4 x 2 grid.
 *
 * Which seven comes from the server (`homepage_order_id`, see
 * `pickHomeCategories`), so admin can change Home without a release; every
 * category, including the ones not shown here, is one tap away on All
 * categories.
 *
 * This replaced a two-row rail that scrolled sideways over the eleven bundled
 * tiles. The bundled pictures stay as the fallback until admin uploads its own.
 */
export function Categories() {
  const navigation = useTypedNavigation();
  const { categories } = useGlobalContext();
  const { color } = useTheme();
  const tiles = pickHomeCategories(categories, CATEGORIES);

  return (
    <View style={{ paddingTop: TOP_INSET }}>
      <Text
        accessibilityRole="header"
        role="sectionTitle"
        style={{ paddingHorizontal: SCREEN_GUTTER, marginBottom: HEADING_GAP }}
      >
        Categories
      </Text>
      <TileGrid columns={4} gap={GAP} rowGap={ROW_GAP} ratio={RATIO}>
        {(size) => (
          <>
            {tiles.map((category) => (
              <ParentCategoryTile
                key={category.slug ?? category.title}
                category={category}
                label={homeTileName(category)}
                size={size}
              />
            ))}
            <CategoryTile
              size={size}
              label="All categories"
              icon={<Squares2X2Icon size={24} color={color.text} strokeWidth={1.6} />}
              onPress={() => navigation.navigate("AllCategories")}
            />
          </>
        )}
      </TileGrid>
    </View>
  );
}
