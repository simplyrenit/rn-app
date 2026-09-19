import { CATEGORIES } from "@/lib/categories";
import { categoryDisplayName } from "@/lib/category-icons";
import { getDiscoveryLocationData } from "@/lib/location";
import { CategoryItem, useTypedNavigation } from "@/lib/types";
import React from "react";
import { Image, ScrollView, TouchableOpacity, View } from "react-native";
import { Text } from "../core";

// Measured off the Figma Home frame. A cell is 112 wide and 116 tall: an 82pt
// picture area, an 18pt label line and 16pt beneath it. The design's rail is 238
// tall and starts at x=0, so the first picture sits 10pt in from the edge and the
// fourth is cut by the screen; that cut is what says "scroll". 238 is a minimum,
// not a fixed height, so the rail grows with Dynamic Type instead of clipping the
// bottom row's labels.
const CELL_WIDTH = 112;
const PICTURE_HEIGHT = 82;
const CELL_PADDING_BOTTOM = 16;
const RAIL_MIN_HEIGHT = 238;

// Each asset is the design's image with its drop shadow baked in (offset 2.46 x
// 3.28, blur 3.28). The shadow pads the left by 0.82 and the right by 5.74, and
// the top by 0 and the bottom by 6.56, so an asset's origin sits 0.82 left of the
// picture's own origin and level with its top.
const SHADOW_PAD_LEFT = 0.82;
const SHADOW_PAD_X = 6.56;

// The design's picture area is 91.84 wide and 82 tall, centred in the cell.
const PICTURE_WIDTH = 91.84;

// Where the design puts each picture's own top-left inside that area, read off
// the frame. The others sit in auto-layout, centred, so they fall through to the
// centring below. Centring every picture was close but not exact: the car sat 2pt
// low and the treadmill 1pt, because the pictures are not all centred.
//
// Automobiles is set from the render, not the frame: the frame says 17, but the
// design draws the car 1.75pt higher than that places this raster.
const PICTURE_ORIGIN: Record<string, { x: number; y: number }> = {
  Automobiles: { x: 8.93, y: 15.25 },
  Electronics: { x: 4.91, y: 0.14 },
  Machines: { x: 6.92, y: 17 },
  Fashion: { x: 12.92, y: 8 },
  "Art & Craft": { x: 13.92, y: 9 },
  "Real Estate": { x: 10.92, y: 21 },
  Appliances: { x: 13.94, y: 9.02 },
  Sports: { x: 13.12, y: 8.2 },
};

/**
 * The category rail: two rows of picture tiles that scroll sideways.
 *
 * `CATEGORIES` is ordered column by column, so taking the entries two at a time
 * gives the design's grid directly — Automobiles over Appliances, Electronics
 * over Furniture, and so on.
 *
 * This replaced a single row of icon chips that was introduced to win back
 * vertical space. The design keeps the picture tiles, so they are back; the
 * space they cost is the design's, not an accident.
 */
export function Categories() {
  const navigation = useTypedNavigation();

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

  const columns: CategoryItem[][] = [];
  for (let index = 0; index < CATEGORIES.length; index += 2) {
    columns.push(CATEGORIES.slice(index, index + 2));
  }

  const renderTile = (category: CategoryItem) => {
    // Null for a remote or array source; every entry in CATEGORIES is a bundled
    // require() today, but a missing tile beats a crash on the home screen.
    const resolved = Image.resolveAssetSource(category.image);
    if (!resolved) return null;
    const { width, height } = resolved;

    // The picture's origin in the design, or centred when the design leaves it to
    // auto-layout. The asset is then placed by its own origin, which is the
    // picture's shifted by the shadow padding on the left.
    const origin = PICTURE_ORIGIN[category.name] ?? {
      x: (PICTURE_WIDTH - (width - SHADOW_PAD_X)) / 2,
      y: (PICTURE_HEIGHT - (height - SHADOW_PAD_X)) / 2,
    };

    return (
      <TouchableOpacity
        key={category.name}
        accessibilityRole="button"
        // The spoken name is the app-wide one ("Musical instruments"); the tile
        // keeps the design's own wording on screen.
        accessibilityLabel={`Browse ${categoryDisplayName(category.name)}`}
        activeOpacity={0.7}
        onPress={() => openCategory(category)}
        style={{
          width: CELL_WIDTH,
          alignItems: "center",
          paddingBottom: CELL_PADDING_BOTTOM,
        }}
      >
        <View
          style={{
            width: PICTURE_WIDTH,
            height: PICTURE_HEIGHT,
          }}
        >
          <Image
            source={category.image}
            style={{
              position: "absolute",
              left: origin.x - SHADOW_PAD_LEFT,
              top: origin.y,
              width,
              height,
            }}
            resizeMode="contain"
          />
        </View>
        <Text
          fontSize="text-xs"
          fontWeight="font-bold"
          numberOfLines={1}
          style={{ textAlign: "center" }}
        >
          {category.name}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ minHeight: RAIL_MIN_HEIGHT }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ flexDirection: "row" }}
      >
        {columns.map((column) => (
          <View key={column[0].name}>{column.map(renderTile)}</View>
        ))}
      </ScrollView>
    </View>
  );
}
