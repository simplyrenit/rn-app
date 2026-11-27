import {
  CategoryTile,
  ParentCategoryTile,
  TILE_ICON_SIZE,
  TILE_ICON_STROKE,
  TileGrid,
} from "@/components/categories/category-tile";
import { SectionHeader } from "@/components/core";
import { useGlobalContext } from "@/context/global-context";
import { CATEGORIES } from "@/lib/categories";
import { homeTileName, pickHomeCategories } from "@/lib/home-categories";
import { useTheme } from "@/lib/theme";
import { useTypedNavigation } from "@/lib/types";
import React from "react";
import { View } from "react-native";
import { CubeIcon } from "react-native-heroicons/outline";

// The 2.1 Home frame (2083:15120 "Categories"): 16 above the heading (the
// pinned search header adds 8 more), 12 from the heading to the tiles, then
// four 78 x 88 tiles in 88 cells (grid padding 19) with 16 between the rows.
const TOP_INSET = 16;
const HEADING_GAP = 12;
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
 * tiles. Every tile is a line icon on a neutral tile (REVIEW b1-01); the
 * bundled list only stands in for the server's when it has not loaded.
 */
export function Categories() {
  const navigation = useTypedNavigation();
  const { categories } = useGlobalContext();
  const { color } = useTheme();
  const tiles = pickHomeCategories(categories, CATEGORIES);

  return (
    <View style={{ paddingTop: TOP_INSET }}>
      <View style={{ marginBottom: HEADING_GAP }}>
        <SectionHeader title="Categories" flush />
      </View>
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
              icon={
                <CubeIcon size={TILE_ICON_SIZE} color={color.text} strokeWidth={TILE_ICON_STROKE} />
              }
              onPress={() => navigation.navigate("AllCategories")}
            />
          </>
        )}
      </TileGrid>
    </View>
  );
}
