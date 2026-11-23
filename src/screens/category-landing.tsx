import useSaved from "@/backend/useSaved";
import { useSearch } from "@/backend/search";
import {
  SubCategoryTile,
  TileGrid,
} from "@/components/categories/category-tile";
import {
  Card,
  EmptyState,
  ProductCardSkeleton,
  SectionHeader,
  SubpageHeader,
} from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { useRailData } from "@/components/home/sections/use-rail-data";
import { useGlobalContext } from "@/context/global-context";
import { FilterBar } from "@/components/search/results-rails";
import { SCREEN_GUTTER, density } from "@/lib/design-tokens";
import { getDiscoveryLocationData } from "@/lib/location";
import { useTheme } from "@/lib/theme";
import { BackendProduct, RootStackParamList, RouteProps } from "@/lib/types";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useCallback, useRef } from "react";
import { FlatList, View, useWindowDimensions } from "react-native";
import { MapPinIcon } from "react-native-heroicons/outline";

// The 2.1 landing frames (2089:27555, 2089:27679): 16 under the top bar, four
// 76 x 52 text-only sub-category tiles 12 apart and 16 between rows, 32 down to
// the "Near you" section header, 12 to the pills, 16 to the listings. The
// listings are two columns of 162 cards 18 apart, 24 between rows. The empty
// state sits 48 under the pills.
const TOP_INSET = 16;
const GAP = 12;
const ROW_GAP = 16;
const RATIO = 76 / 52;
const SECTION_GAP = 32;
const HEADING_GAP = 12;
const BLOCK_GAP = 16;
const COLUMN_GAP = 18;
const RESULTS_GAP = 24;
const EMPTY_TOP = 48;

/**
 * One category: its sub-categories as tiles, then listings in it near the
 * customer (ENG-77).
 *
 * The sub-categories come from the category list (loaded at launch and again on
 * Home's pull-to-refresh), matched by slug, so admin adding or archiving one
 * changes this screen with no release.
 * The listings are the search endpoint's, nearest first; the pills hand over to
 * the full results screen, which owns filtering, rather than rebuilding it here.
 */
export default function CategoryLandingScreen() {
  // The root native stack, for its typed `push`; `useTypedNavigation` is the
  // generic navigation prop, which has no `push`.
  const stack = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  // A tap awaits a location lookup before it pushes; a second tap in that
  // window would push the results twice.
  const opening = useRef(false);
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
  const hasSubcategories = Boolean(parent?.subcategories.length);
  // Without the loaded list (cold start, offline) there is only the slug, which
  // the search's category filter also matches (ENG-29).
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
    }),
    // A landing reused for another category must not keep the last one's.
    params.slug
  );

  /**
   * The full results for this category, or one sub-category of it. Pushed, not
   * navigated: `navigate` returns to any SearchResults already in the stack,
   * and that screen keeps the filters and results it opened with, so it showed
   * the previous sub-category's listings under the new one's name.
   *
   * `selectedItem` is also the search text. On a cold start it is the bundled
   * tile's name ("Sports"), which the server's text search matches against the
   * v2 parent's title ("Fitness & Sports"), so it does not narrow the results.
   */
  const openResults = async (subCategory?: string) => {
    if (opening.current) return;
    opening.current = true;
    try {
      const locationData = await getDiscoveryLocationData();
      stack.push("SearchResults", {
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
    } catch (caught) {
      // Nothing was pushed, so nothing will refocus this screen to free it.
      opening.current = false;
      throw caught;
    }
  };
  // Let go once this screen is back in view, not straight after the push: a
  // second tap during the push animation would otherwise push a second copy.
  useFocusEffect(
    useCallback(() => {
      opening.current = false;
    }, [])
  );

  const header = (
    <View style={{ paddingTop: TOP_INSET, paddingBottom: BLOCK_GAP }}>
      {parent && hasSubcategories ? (
        <View style={{ marginBottom: SECTION_GAP }}>
          <TileGrid columns={4} gap={GAP} rowGap={ROW_GAP} ratio={RATIO}>
            {(size) =>
              parent.subcategories.map((sub) => (
                <SubCategoryTile
                  key={sub.slug ?? sub.title}
                  size={size}
                  label={sub.title}
                  onPress={() => openResults(sub.title)}
                />
              ))
            }
          </TileGrid>
        </View>
      ) : null}

      <View style={{ gap: HEADING_GAP }}>
        <SectionHeader title="Near you" flush />
        <View style={{ paddingHorizontal: SCREEN_GUTTER }}>
          {/* The results screen's own bar, so the two match; each pill opens
              the full results, which own filtering, sorting and dates. */}
          <FilterBar
            filtersActive={false}
            sortActive={false}
            datesLabel="Dates"
            datesActive={false}
            hint={`Opens all results in ${title}`}
            onFilters={() => openResults()}
            onSort={() => openResults()}
            onDates={() => openResults()}
            chips={[]}
            onChip={() => {}}
          />
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
            plans={item.plans}
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
            <View style={{ marginTop: EMPTY_TOP - BLOCK_GAP }}>
              <EmptyState
                variant="error"
                title="Couldn’t load this"
                body="Check your connection and try again."
                actionLabel="Retry"
                onAction={reload}
              />
            </View>
          ) : (
            // The frame hides the kit's action, so none is offered (plan Decision 6).
            <View style={{ marginTop: EMPTY_TOP - BLOCK_GAP }}>
              <EmptyState
                icon={<MapPinIcon color={color.text} strokeWidth={1.5} />}
                title="Nothing near you yet"
                body={`Nobody near you lists anything in ${title} yet.`}
              />
            </View>
          )
        }
      />
    </NonScrollableContainer>
  );
}
