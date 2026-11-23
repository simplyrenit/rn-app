import { Text } from "@/components/core";
import { CategoryIcon } from "@/lib/category-icons";
import { SCREEN_GUTTER, radius } from "@/lib/design-tokens";
import type { BrowseCategory } from "@/lib/home-categories";
import { useTheme } from "@/lib/theme";
import { useTypedNavigation } from "@/lib/types";
import React from "react";
import { TouchableOpacity, View, useWindowDimensions } from "react-native";

// The 2.1 frames (Home 2083:15120, All categories 2089:24546): a 24 line icon at
// stroke 1.5, centred on the tile, and the 12/16 Medium label 8 under it.
export const TILE_ICON_SIZE = 24;
export const TILE_ICON_STROKE = 1.5;
const LABEL_GAP = 8;
// The parent tile's neutral fill. The frames draw #F5F5F7 unbound: no kit
// variable and no token, so it stays local (ENG-427 plan); dark uses the kit's
// muted surface, one step up from the canvas.
const TILE_FILL_LIGHT = "#F5F5F7";

export interface TileSize {
  /** The whole cell, which is also the tap target. */
  cell: number;
  width: number;
  height: number;
  /** The label's width: the cell on Home, the tile on All categories. */
  label: number;
}

/**
 * A grid of tiles on the screen gutter.
 *
 * Each cell is the tile plus the gap, with the tile centred, and the row starts
 * half a gap inside the gutter, so the tiles still sit on the gutter and the
 * gaps are the design's. Home's label gets the cell's width (the frame draws
 * 88 under a 78 tile); All categories' gets the tile's (106), which is where
 * the frame wraps "Art, Decor & Hobby".
 */
export function TileGrid({
  columns,
  gap,
  rowGap,
  ratio,
  labelWidth = "cell",
  children,
}: {
  columns: number;
  gap: number;
  rowGap: number;
  /** The tile's width over its height. */
  ratio: number;
  labelWidth?: "cell" | "tile";
  children: (size: TileSize) => React.ReactNode;
}) {
  const { width: screenWidth } = useWindowDimensions();
  const inset = SCREEN_GUTTER - gap / 2;
  // Floored, so rounding can never push the last cell onto a row of its own.
  const cell = Math.floor((screenWidth - 2 * inset) / columns);
  const width = cell - gap;
  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        paddingHorizontal: inset,
        rowGap,
      }}
    >
      {children({
        cell,
        width,
        height: width / ratio,
        label: labelWidth === "tile" ? width : cell,
      })}
    </View>
  );
}

/**
 * One parent tile: a line icon on a neutral r12 tile, and the label under it
 * (REVIEW b1-01: no pictures, admin's or bundled).
 */
export function CategoryTile({
  size,
  label,
  icon,
  accessibilityLabel,
  onPress,
}: {
  size: TileSize;
  label: string;
  icon: React.ReactNode;
  accessibilityLabel?: string;
  onPress: () => void;
}) {
  const { color, isDark } = useTheme();
  // A label with nowhere to wrap ("Mountaineering", 92pt) shrinks to fit its one
  // line instead of breaking mid-word; anything with a space wraps as it needs.
  const oneWord = !/[\s-]/.test(label.trim());

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      activeOpacity={0.7}
      onPress={onPress}
      style={{ width: size.cell, alignItems: "center" }}
    >
      <View
        style={{
          width: size.width,
          height: size.height,
          borderRadius: radius.button,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: isDark ? color.surfaceMuted : TILE_FILL_LIGHT,
        }}
      >
        {icon}
      </View>
      <TileLabel label={label} oneWord={oneWord} style={{ marginTop: LABEL_GAP, width: size.label }} />
    </TouchableOpacity>
  );
}

function TileLabel({
  label,
  oneWord,
  maxLines,
  style,
}: {
  label: string;
  oneWord: boolean;
  /** A cap for a label inside a fixed tile; under a tile it wraps freely. */
  maxLines?: number;
  style: { marginTop?: number; width?: number | "100%" };
}) {
  return (
    <Text
      fontSize="text-xs"
      fontWeight="font-medium"
      tone="body"
      numberOfLines={oneWord ? 1 : maxLines}
      adjustsFontSizeToFit={oneWord || maxLines !== undefined}
      minimumFontScale={0.8}
      // The label is held to its cell (70dp at 360), so it does not follow the
      // system font size: at Android's "Large" (1.3) "Automobiles" and
      // "categories" broke mid-word. The spoken label still carries the name.
      maxFontSizeMultiplier={1}
      style={{ textAlign: "center", ...style }}
    >
      {label}
    </Text>
  );
}

/**
 * A sub-category on the Category landing (2089:27555): its name alone, centred
 * in a white r12 tile with the hairline edge. It repeats no icon (REVIEW b1-01).
 */
export function SubCategoryTile({
  size,
  label,
  onPress,
}: {
  size: TileSize;
  label: string;
  onPress: () => void;
}) {
  const { color } = useTheme();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      activeOpacity={0.7}
      onPress={onPress}
      style={{ width: size.cell, alignItems: "center" }}
    >
      <View
        style={{
          width: size.width,
          height: size.height,
          borderRadius: radius.button,
          borderWidth: 1,
          borderColor: color.line,
          backgroundColor: color.surface,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 2,
        }}
      >
        {/* Three 16pt lines fill the 52pt tile, so a long taxonomy name ("Surveying &
            Measuring Instruments") shrinks to fit rather than spilling out of it. */}
        <TileLabel label={label} oneWord={!/[\s-]/.test(label.trim())} maxLines={3} style={{ width: "100%" }} />
      </View>
    </TouchableOpacity>
  );
}

/** A parent category's tile, with its icon from the kit's Category icon map. */
export function ParentCategoryTile({
  category,
  label,
  size,
}: {
  category: BrowseCategory;
  label: string;
  size: TileSize;
}) {
  const { color } = useTheme();
  const openCategory = useOpenCategory();
  return (
    <CategoryTile
      size={size}
      label={label}
      icon={
        <CategoryIcon
          name={category.title}
          slug={category.slug}
          size={TILE_ICON_SIZE}
          color={color.text}
          strokeWidth={TILE_ICON_STROKE}
        />
      }
      accessibilityLabel={`Browse ${category.title}`}
      onPress={() => openCategory(category)}
    />
  );
}

/** Where a category tile goes, from Home and from All categories alike. */
export function useOpenCategory() {
  const navigation = useTypedNavigation();

  return (category: BrowseCategory) =>
    // A tile from the API carries the v2 slug, and so does a bundled one (no
    // list: cold start, offline). The landing finds its sub-categories by it once
    // the list is loaded, and the search's category filter accepts a slug as well
    // as a title. A server from before slugs gets the title, which the landing
    // matches the same way.
    navigation.navigate("CategoryLanding", {
      slug: category.slug ?? category.title,
      title: category.title,
    });
}
