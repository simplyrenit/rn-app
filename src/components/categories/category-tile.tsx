import { Text } from "@/components/core";
import { useGlobalContext } from "@/context/global-context";
import { CATEGORIES } from "@/lib/categories";
import { CategoryIcon } from "@/lib/category-icons";
import { SCREEN_GUTTER, radius } from "@/lib/design-tokens";
import type { BrowseCategory } from "@/lib/home-categories";
import { getDiscoveryLocationData } from "@/lib/location";
import { useTheme } from "@/lib/theme";
import { useTypedNavigation } from "@/lib/types";
import { Image } from "expo-image";
import React, { useState } from "react";
import {
  ImageSourcePropType,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";

const ICON_SIZE = 24;
// Measured off the v3 frames: the label starts 8pt under the tile, at 12pt bold.
const LABEL_GAP = 8;

export interface TileSize {
  /** The whole cell, which is also the tap target and the label's width. */
  cell: number;
  width: number;
  height: number;
}

/**
 * A grid of tiles on the screen gutter.
 *
 * Each cell is the tile plus the gap, with the tile centred, and the row starts
 * half a gap inside the gutter, so the tiles still sit on the gutter and the
 * gaps are the design's. The point is the label: it gets the cell's width, not
 * the tile's. "Automobiles" is 75pt at 12pt bold and a Home tile is 70pt at
 * 360dp; inside the tile it broke mid-word.
 */
export function TileGrid({
  columns,
  gap,
  rowGap,
  ratio,
  children,
}: {
  columns: number;
  gap: number;
  rowGap: number;
  /** The tile's width over its height. */
  ratio: number;
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
      {children({ cell, width, height: width / ratio })}
    </View>
  );
}

/**
 * One tile: a picture when there is one, otherwise an outlined square with a
 * line icon, and the label under it.
 *
 * `uri` is the admin-uploaded picture and `image` the bundled one. A remote
 * picture that fails to load falls back to the bundled one and then to the
 * icon, rather than leaving an empty square.
 */
export function CategoryTile({
  size,
  label,
  uri,
  image,
  icon,
  accessibilityLabel,
  onPress,
}: {
  size: TileSize;
  label: string;
  uri?: string | null;
  image?: ImageSourcePropType | null;
  icon: React.ReactNode;
  accessibilityLabel?: string;
  onPress: () => void;
}) {
  const { color } = useTheme();
  const [remoteFailed, setRemoteFailed] = useState(false);
  const remote = uri && !remoteFailed ? uri : null;
  const source = remote ? { uri: remote } : image ?? null;
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
          overflow: "hidden",
          alignItems: "center",
          justifyContent: "center",
          // The outline is the design's hairline, not `inputLine`: the whole cell
          // is the control, and a picture tile has no edge at all.
          ...(source
            ? { backgroundColor: color.skeleton }
            : {
                backgroundColor: color.surface,
                borderWidth: 1,
                borderColor: color.line,
              }),
        }}
      >
        {source ? (
          <Image
            source={source}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            onError={remote ? () => setRemoteFailed(true) : undefined}
            accessible={false}
          />
        ) : (
          icon
        )}
      </View>
      <Text
        fontSize="text-xs"
        fontWeight="font-bold"
        numberOfLines={oneWord ? 1 : undefined}
        adjustsFontSizeToFit={oneWord}
        minimumFontScale={0.8}
        style={{ marginTop: LABEL_GAP, textAlign: "center", width: "100%" }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/** The admin-uploaded picture for the theme, if any. */
export function remotePictureFor(category: BrowseCategory, isDark: boolean) {
  return (isDark ? category.dark_icon : category.light_icon) || category.main_icon || null;
}

/** The bundled picture for a v2 slug, while admin has none uploaded. */
export function bundledPictureFor(category: BrowseCategory) {
  return CATEGORIES.find((item) => item.slug === category.slug)?.image ?? null;
}

/** A parent category's tile, with the full picture fallback chain. */
export function ParentCategoryTile({
  category,
  label,
  size,
}: {
  category: BrowseCategory;
  label: string;
  size: TileSize;
}) {
  const { color, isDark } = useTheme();
  const openCategory = useOpenCategory();
  return (
    <CategoryTile
      size={size}
      label={label}
      uri={remotePictureFor(category, isDark)}
      image={bundledPictureFor(category)}
      icon={
        <CategoryIcon
          name={category.title}
          slug={category.slug}
          size={ICON_SIZE}
          color={color.text}
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
  const { categories } = useGlobalContext();

  return async (category: BrowseCategory) => {
    // A tile from the API carries the server title. A bundled tile (no list:
    // cold start, offline) has only the design's name, so send its slug, which
    // search also matches (ENG-29).
    const loaded = categories.length > 0;
    const locationData = await getDiscoveryLocationData();
    navigation.navigate("SearchResults", {
      category: loaded ? category.title : category.slug ?? category.title,
      address: locationData?.address ?? "",
      coords: locationData?.coordinates
        ? {
            lat: locationData.coordinates.lat,
            lng: locationData.coordinates.long,
          }
        : { lat: undefined, lng: undefined },
      range: { startDate: undefined, endDate: undefined },
      products: [],
      selectedItem: category.title,
    });
  };
}
