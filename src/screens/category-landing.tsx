import useSaved from "@/backend/useSaved";
import { useSearch } from "@/backend/search";
import {
  CategoryTile,
  TileGrid,
} from "@/components/categories/category-tile";
import {
  Card,
  EmptyState,
  ProductCardSkeleton,
  SubpageHeader,
  Text,
} from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { useRailData } from "@/components/home/sections/use-rail-data";
import { useGlobalContext } from "@/context/global-context";
import { CategoryIcon } from "@/lib/category-icons";
import {
  MIN_TOUCH_TARGET,
  SCREEN_GUTTER,
  density,
  radius,
  space,
} from "@/lib/design-tokens";
import { getDiscoveryLocationData } from "@/lib/location";
import { useTheme } from "@/lib/theme";
import { BackendProduct, RouteProps, useTypedNavigation } from "@/lib/types";
import { useRoute } from "@react-navigation/native";
import React from "react";
import { FlatList, TouchableOpacity, View, useWindowDimensions } from "react-native";

// Measured off the v3 Appliances landing frame (C-09): 16 under the header, four
// 78 x 64 sub-category tiles 12 apart and 12 between rows, 24 down to "Near you"
// (14 bold), 16 to the pills (44 tall, 8 apart), 16 to the listings. The
// listings are the search results' grid: two columns 16 apart, 24 between rows.
const TOP_INSET = 16;
const GAP = 12;
const ROW_GAP = 12;
const RATIO = 78 / 64;
const SECTION_GAP = 24;
const BLOCK_GAP = 16;
const PILL_GAP = 8;
const COLUMN_GAP = 16;
const RESULTS_GAP = 24;

const PILLS = ["Filters", "Sort", "Dates"];

/**
 * One category: its sub-categories as tiles, then listings in it near the
 * customer (ENG-77).
 *
 * The sub-categories come from the list the app loads at launch, matched by
 * slug, so admin adding or archiving one changes this screen with no release.
 * The listings are the search endpoint's, nearest first; the pills hand over to
 * the full results screen, which owns filtering, rather than rebuilding it here.
 */
export default function CategoryLandingScreen() {
  const navigation = useTypedNavigation();
  const { params } = useRoute<RouteProps<"CategoryLanding">>();
  const { categories } = useGlobalContext();
  const { color } = useTheme();
  const { favorites } = useSaved();
  const { searchProducts } = useSearch();
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = Math.floor((screenWidth - 2 * SCREEN_GUTTER - COLUMN_GAP) / 2);

  // A server from before slugs is matched by title instead.
  const parent = categories.find(
    (category) => (category.slug ?? category.title) === params.slug
  );
  const title = parent?.title ?? params.title;
  // Without the loaded list (cold start, offline) the tile only knew the slug,
  // which search also matches (ENG-29).
  const searchCategory = parent?.title ?? params.slug;

  const { products, loading, error, reload } = useRailData<BackendProduct>(
    async (lat, long) => ({
      results: await searchProducts(
        "",
        { lat, lng: long },
        { start_date: undefined, end_date: undefined },
        {
          sort: "nearest",
          category: searchCategory,
          subcategory: "",
          min_price: "",
          max_price: "",
          product_rating: 0,
          owner_rating: 0,
          condition: "",
        }
      ),
    })
  );

  /** The full results for this category, or one sub-category of it. */
  const openResults = async (subCategory?: string) => {
    const locationData = await getDiscoveryLocationData();
    navigation.navigate("SearchResults", {
      category: searchCategory,
      subCategory,
      selectedItem: subCategory ?? title,
      address: locationData?.address ?? "",
      coords: locationData?.coordinates
        ? {
            lat: locationData.coordinates.lat,
            lng: locationData.coordinates.long,
          }
        : { lat: undefined, lng: undefined },
      range: { startDate: undefined, endDate: undefined },
      products: [],
    });
  };

  const header = (
    <View style={{ paddingTop: TOP_INSET, paddingBottom: BLOCK_GAP }}>
      {parent && parent.subcategories.length > 0 ? (
        <View style={{ marginBottom: SECTION_GAP }}>
          <TileGrid columns={4} gap={GAP} rowGap={ROW_GAP} ratio={RATIO}>
            {(size) =>
              parent.subcategories.map((sub) => (
                <CategoryTile
                  key={sub.slug ?? sub.title}
                  size={size}
                  label={sub.title}
                  icon={
                    <CategoryIcon
                      name={sub.title}
                      slug={sub.slug}
                      size={24}
                      color={color.text}
                    />
                  }
                  onPress={() => openResults(sub.title)}
                />
              ))
            }
          </TileGrid>
        </View>
      ) : null}

      <View style={{ paddingHorizontal: SCREEN_GUTTER, gap: BLOCK_GAP }}>
        <Text accessibilityRole="header" fontSize="text-sm" fontWeight="font-bold">
          Near you
        </Text>
        <View style={{ flexDirection: "row", gap: PILL_GAP }}>
          {PILLS.map((pill) => (
            <TouchableOpacity
              key={pill}
              accessibilityRole="button"
              accessibilityHint={`Opens all results in ${title}`}
              activeOpacity={0.7}
              onPress={() => openResults()}
              style={{
                minHeight: MIN_TOUCH_TARGET,
                paddingHorizontal: space.md,
                borderRadius: radius.full,
                borderWidth: 1,
                borderColor: color.line,
                justifyContent: "center",
              }}
            >
              <Text fontSize="text-md">{pill}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  return (
    <NonScrollableContainer>
      <SubpageHeader title={title} />
      <FlatList
        style={{ flex: 1 }}
        data={loading || error ? [] : products}
        keyExtractor={(item) => item.name}
        numColumns={2}
        ListHeaderComponent={header}
        columnWrapperStyle={{ paddingHorizontal: SCREEN_GUTTER, gap: COLUMN_GAP }}
        ItemSeparatorComponent={() => <View style={{ height: RESULTS_GAP }} />}
        contentContainerStyle={{ paddingBottom: density.listFooterCompact }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <Card
            id={item.name}
            image={item.cover_image}
            title={item.title}
            location={item.location}
            price={item.rate}
            width={cardWidth}
            isFavorite={favorites.some((fav) => fav.name === item.name)}
            tile
            coordinates={item.coordinates}
          />
        )}
        ListEmptyComponent={
          loading ? (
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                paddingHorizontal: SCREEN_GUTTER,
                columnGap: COLUMN_GAP,
                rowGap: RESULTS_GAP,
              }}
            >
              {[0, 1, 2, 3].map((key) => (
                <ProductCardSkeleton key={key} width={cardWidth} />
              ))}
            </View>
          ) : error ? (
            <EmptyState
              compact
              variant="error"
              title="Couldn’t load this"
              body="Check your connection and try again."
              actionLabel="Retry"
              onAction={reload}
            />
          ) : (
            <EmptyState
              compact
              title="Nothing near you yet"
              body={`Nobody near you lists anything in ${title} yet.`}
            />
          )
        }
      />
    </NonScrollableContainer>
  );
}
