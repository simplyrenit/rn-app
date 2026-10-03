import useSaved from "@/backend/useSaved";
import { pluralize } from "@/lib/pluralize";
import {
  BackButton,
  Button,
  Card,
  CrossFade,
  EmptyState,
  ProductCardSkeleton,
  Text,
} from "@/components/core";
import CustomBottomSheetModal from "@/components/core/custom-bottom-sheet-modal";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { TaxonomyList } from "@/components/post/taxonomy-list";
import { ConditionFilter } from "@/components/search/condition-filter";
import { PriceFilter } from "@/components/search/price-filter";
import { RatingFilter } from "@/components/search/rating-filter";
import { SortFilter } from "@/components/search/sort-filter";
import { SpecFilter } from "@/components/search/spec-filter";
import SubCategoryFilter from "@/components/search/sub-category-filter";
import { CategoryRail, FilterBar } from "@/components/search/results-rails";
import { useGlobalContext } from "@/context/global-context";
import { categoryDisplayName } from "@/lib/category-icons";
import { BackendProduct, RouteProps, useTypedNavigation } from "@/lib/types";
import { BottomSheetView } from "@gorhom/bottom-sheet";
import { StackActions, useRoute } from "@react-navigation/native";
import { Image } from "expo-image";
import { styled } from "nativewind";
import React, { useRef, useState, useEffect } from "react";
import {
  FlatList,
  Pressable,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import {
  SpecFilterPanel,
  quickChipSpec,
  toggleSpecOption,
  useSearch,
} from "@/backend/search";
import { Disclaimer } from "@/components/home/disclaimer";
import { SCREEN_GUTTER, colors, density, ink, radius } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";


const StyledBottomView = styled(BottomSheetView);

/**
 * How tall the filter sheet needs to be for the tab on screen. It used to be a
 * flat 75% for every tab: the Price tab showed two 44pt fields above roughly
 * 1,180pt of empty white, and Sort showed four rows above 1,080pt.
 */
function sheetHeightForTab(tab: string, showSubCategory: boolean) {
  switch (tab) {
    case "Price":
      return "38%";
    case "Ratings":
      return "48%";
    case "Condition":
      return "44%";
    case "Sort":
      return "52%";
    case "Category":
      return showSubCategory ? "70%" : "62%";
    case "Specs":
      return "75%";
    default:
      return "60%";
  }
}

/** Marks a tab whose filter is currently set, so active filters are findable. */
function tabHasValue(tab: string, filters: any) {
  switch (tab) {
    case "Sort":
      return Boolean(filters?.sort);
    case "Category":
      return Boolean(filters?.category || filters?.subCategory);
    case "Price":
      return Boolean(filters?.price?.min || filters?.price?.max);
    case "Ratings":
      return Boolean(filters?.ratings?.product || filters?.ratings?.owner);
    case "Condition":
      return Boolean(filters?.condition);
    case "Specs":
      return Object.keys(filters?.specs ?? {}).length > 0;
    default:
      return false;
  }
}


/** Identity of a filter set, so "has this changed since we last counted?" is
 *  one comparison rather than eight. */
const keyOf = (filters: unknown) => JSON.stringify(filters);

const createDefaultFilters = (category = "", subCategory = "") => ({
  sort: "",
  category,
  subCategory,
  price: { min: "", max: "" },
  ratings: { product: 0, owner: 0 },
  condition: "",
  /** Chosen options per spec key; they belong to one sub-category (ENG-31). */
  specs: {} as Record<string, string[]>,
});

/** The range arrives as an ISO string, because navigation params must be
 *  serializable — see `RootStackParamList["SearchResults"]`. */
const formatDate = (date: string | undefined) => {
  if (!date) return "";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "";
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
  };
  return parsed.toLocaleDateString("en-US", options);
};

/** How long a filter edit has to settle before the count is re-counted. */
const COUNT_DEBOUNCE_MS = 350;

// Measured off the Figma results frame: a 64pt search bar with 16 above and below it,
// the category rail and Filters bar (ENG-78), a 21pt count 12 below them (the v3 frame
// drops the count; it stays, as it carries Clear Filters), then a two-column grid of the Home tile with 16
// between columns and 24 between rows. A column is half of what the gutters and the
// gap leave, so it is 163 on the 390pt frame and shrinks on a narrower phone.
const SUMMARY_HEIGHT = 64;
const SUMMARY_INSET = 16;
const RESULTS_GAP = 24;
const COLUMN_GAP = 16;

/** Two rows of the same grid the results use, while the first search runs. */
function ResultsSkeleton({ width }: { width: number }) {
  return (
    // The real grid's columns and gaps, so the cross-fade lands without a jump.
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        columnGap: COLUMN_GAP,
        rowGap: RESULTS_GAP,
      }}
    >
      {[0, 1, 2, 3].map((key) => (
        <ProductCardSkeleton key={key} width={width} />
      ))}
    </View>
  );
}

export default function SearchResults() {
  const navigation = useTypedNavigation();
  const route = useRoute<RouteProps<"SearchResults">>();

  const { theme, categories } = useGlobalContext();
  const isDark = theme === "dark";
  const { color, shadow } = useTheme();
  const { favorites } = useSaved();
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = Math.floor(
    (screenWidth - 2 * SCREEN_GUTTER - COLUMN_GAP) / 2
  );
  const bottomSheetRef = useRef<any>(null);
  const subCategoryBottomSheetRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(
    () => (route.params?.products?.length ?? 0) === 0
  );

  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(
    null
  );

  const {
    address,
    coords,
    range,
    selectedItem,
    products: fetchedProducts,
    category,
    subCategory,
  } = route.params;
  const { searchProducts, fetchSpecFilters } = useSearch();
  const [products, setProducts] = useState<BackendProduct[]>(fetchedProducts);
  const didBootstrapSearchRef = useRef(false);

  const [filters, setFilters] = useState(() =>
    createDefaultFilters(category || "", (category && subCategory) || "")
  );

  const filtersKey = keyOf(filters);
  /** The filter set the products on screen were actually fetched with. */
  const [appliedKey, setAppliedKey] = useState(filtersKey);
  /**
   * The spec filters behind the grid on screen, for the product page to mark
   * (ENG-35). The applied set, not the entered one: a spec picked in the sheet
   * but never applied did not choose these results.
   */
  const appliedSpecs: Record<string, string[]> = JSON.parse(appliedKey).specs;
  const specFilters =
    Object.keys(appliedSpecs).length > 0 ? appliedSpecs : undefined;
  /**
   * A count for a filter set that has been entered but not yet applied.
   *
   * "Show 2 results" was the previous search's total: with a minimum price of
   * ₹50 typed against a ₹25 item it still said 2, and applying it returned 1.
   * The number is the entire value of that button, so it re-counts against
   * whatever is currently in the fields — including a half-typed price.
   */
  const [preview, setPreview] = useState<{
    key: string;
    products: BackendProduct[];
  } | null>(null);

  const isFilterActive = () => {
    const { sort, category, subCategory, price, ratings, condition, specs } = filters;

    return (
      Object.keys(specs).length > 0 ||
      sort !== "" ||
      category !== "" ||
      subCategory !== "" ||
      price.min !== "" ||
      price.max !== "" ||
      ratings.product !== 0 ||
      ratings.owner !== 0 ||
      condition !== ""
    );
  };

  const handleFilterSelect = (
    filterType: keyof typeof filters,
    value: string | null
  ) => {
    setFilters((prevFilters) => ({
      ...prevFilters,
      [filterType]: prevFilters[filterType] === value ? null : value,
      // Specs are keys of one sub-category; another one has other keys.
      ...(filterType === "subCategory" ? { specs: {} } : {}),
    }));
  };

  const handleSpecToggle = (key: string, option: string) => {
    setFilters((prevFilters) => ({
      ...prevFilters,
      specs: toggleSpecOption(prevFilters.specs, key, option),
    }));
  };

  const handleCategorySelect = (category: string) => {
    setFilters((prevFilters) => ({
      ...prevFilters,
      category,
      // Back out of the sub-category list and tap the same parent: keep them.
      specs: prevFilters.category === category ? prevFilters.specs : {},
    }));
    setSelectedCategory(category);
    setShowSubCategory(true);
  };

  const handlePriceSelect = (min: string, max: string) => {
    setFilters((prevFilters) => ({
      ...prevFilters,
      price: { min, max },
    }));
  };

  const handleRatingSelect = (productRating: number, ownerRating: number) => {
    setFilters((prevFilters) => ({
      ...prevFilters,
      ratings: { product: productRating, owner: ownerRating },
    }));
  };

  /** One query for both the applied search and the live count on the button. */
  const runSearch = (nextFilters: typeof filters) =>
    searchProducts(
      selectedItem,
      coords.lat != null && coords.lng != null
        ? { lat: coords.lat, lng: coords.lng }
        : undefined,
      {
        start_date: range.startDate ?? undefined,
        end_date: range.endDate ?? undefined,
      },
      {
        sort: nextFilters.sort,
        category: nextFilters.category,
        subcategory: nextFilters.subCategory,
        min_price: nextFilters.price.min,
        max_price: nextFilters.price.max,
        product_rating: nextFilters.ratings.product,
        owner_rating: nextFilters.ratings.owner,
        condition: nextFilters.condition,
        specs: nextFilters.specs,
      }
    );

  /** The latest search; the rail and chips make several in quick succession. */
  const searchSeqRef = useRef(0);
  const applyFilterAndSearch = async (
    nextFilters: typeof filters = filters
  ) => {
    const seq = ++searchSeqRef.current;
    setIsLoading(true);
    try {
      const filteredProducts = await runSearch(nextFilters);
      // Air cooler then Water cooler tapped quickly: an Air cooler answer
      // arriving second must not fill the grid under the Water cooler chip.
      if (seq !== searchSeqRef.current) return;
      setProducts(filteredProducts.filter(prod => !prod?.moderation_labels?.length));
      setAppliedKey(keyOf(nextFilters));
    } catch (error) {
      console.error(error);
    } finally {
      if (seq === searchSeqRef.current) setIsLoading(false);
    }
  };

  /** Rail and chip taps: applied at once, as the sheet's "Show results" would. */
  const applyNow = (nextFilters: typeof filters) => {
    setFilters(nextFilters);
    void applyFilterAndSearch(nextFilters);
  };

  const clearFiltersAndSearch = async () => {
    const resetFilters = createDefaultFilters();
    setSelectedCategory(null);
    setShowSubCategory(false);
    setFilters(resetFilters);
    await applyFilterAndSearch(resetFilters);
  };

  // Re-count whenever the entered filters drift from the applied ones. Debounced
  // so a price typed digit by digit is one request, not four.
  useEffect(() => {
    if (filtersKey === appliedKey) return;
    if (preview?.key === filtersKey) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const counted = await runSearch(filters);
        if (!cancelled) setPreview({ key: filtersKey, products: counted });
      } catch {
        // Leave the count unknown rather than showing a stale one.
      }
    }, COUNT_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [filtersKey, appliedKey, preview?.key]);

  /**
   * The chosen sub-category's spec filters, counted against the filters as
   * entered (not yet applied), so every count is what tapping it would give.
   * Kept while the next count loads, so the tab doesn't flicker away.
   */
  const [specPanel, setSpecPanel] = useState<{
    subCategory: string;
    panel: SpecFilterPanel;
  } | null>(null);
  useEffect(() => {
    if (!filters.subCategory) {
      setSpecPanel(null);
      return;
    }
    const subCategory = filters.subCategory;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const panel = await fetchSpecFilters(
          selectedItem,
          coords.lat != null && coords.lng != null
            ? { lat: coords.lat, lng: coords.lng }
            : undefined,
          { start_date: range.startDate ?? undefined, end_date: range.endDate ?? undefined },
          {
            sort: filters.sort,
            category: filters.category,
            subcategory: filters.subCategory,
            min_price: filters.price.min,
            max_price: filters.price.max,
            product_rating: filters.ratings.product,
            owner_rating: filters.ratings.owner,
            condition: filters.condition,
            specs: filters.specs,
          }
        );
        if (!cancelled) setSpecPanel({ subCategory, panel });
      } catch {
        // No spec filters is a usable sheet; the rest of it still works.
      }
    }, COUNT_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [filtersKey]);

  // Only the chosen sub-category's own panel: a previous one's keys would
  // filter the new sub-category to nothing, with no chip left to undo them.
  const specs =
    specPanel && specPanel.subCategory === filters.subCategory
      ? specPanel.panel.filters
      : [];

  // ENG-78 quick chips: the options of the sub-category's first default spec,
  // from the same panel the Specs tab shows, so a chip only offers what the
  // sheet would. None on "All", where no panel loads.
  const chipSpec = quickChipSpec(specs);
  const quickChips = chipSpec
    ? chipSpec.options.map((option) => ({
        value: option.value,
        on: (filters.specs[chipSpec.key] ?? []).includes(option.value),
      }))
    : [];

  // The rail's parent: Home's tiles may send its slug rather than its title.
  const railParent = filters.category
    ? categories.find(
        (c) => c.title === filters.category || c.slug === filters.category
      )
    : undefined;
  /** Re-scope to one of the parent's children, or the whole parent (""). */
  const selectRailSubCategory = (subCategory: string) =>
    // As the sheet's Category tab: the specs were the old sub-category's keys.
    // The text, dates and place are route params, untouched here.
    applyNow({ ...filters, subCategory, specs: {} });

  const hasDates = !!range.startDate || !!range.endDate;
  // The rail already shows the category, so it does not light Filters up too.
  const refined =
    // Truthiness: a second tap in the sheet sets a value to null, not "".
    !!filters.sort ||
    !!filters.price.min ||
    !!filters.price.max ||
    filters.ratings.product !== 0 ||
    filters.ratings.owner !== 0 ||
    !!filters.condition ||
    Object.keys(filters.specs).length > 0;

  const tabs = [
    "Sort",
    "Category",
    ...(specs.length > 0 ? ["Specs"] : []),
    "Price",
    "Ratings",
    "Condition",
  ];

  const pendingCount =
    filtersKey === appliedKey
      ? products.length
      : preview?.key === filtersKey
      ? preview.products.length
      : null;

  const closeSheet = async () => {
    // Commit exactly the set that was counted, so the number cannot change
    // between reading it and tapping it.
    if (preview?.key === filtersKey) {
      // Supersedes a rail or chip search still in flight.
      searchSeqRef.current++;
      setIsLoading(false);
      setProducts(preview.products);
      setAppliedKey(filtersKey);
      bottomSheetRef.current?.dismiss();
      return;
    }
    await applyFilterAndSearch();
    bottomSheetRef.current?.dismiss();
  };

  const closeSubCategorySheet = async () => {
    await applyFilterAndSearch();
    [bottomSheetRef, subCategoryBottomSheetRef].forEach((ref) =>
      ref.current?.dismiss()
    );
  };

  const [selectedTab, setSelectedTab] = useState("Sort");
  // The Specs tab goes when its sub-category does; don't leave the sheet blank,
  // and don't jump back to Specs when a later panel arrives.
  const activeTab = tabs.includes(selectedTab) ? selectedTab : "Category";
  useEffect(() => {
    if (activeTab !== selectedTab) setSelectedTab(activeTab);
  }, [activeTab, selectedTab]);

  const [showSubCategory, setShowSubCategory] = useState(false);

  const selectedCategoryData = categories.find(
    (category) => category.title === selectedCategory
  );

  useEffect(() => {
    if (category) {
      setSelectedCategory(category);
      setSelectedTab("Category");
      // Arrived with the child already chosen: open the sheet on its list.
      if (subCategory) setShowSubCategory(true);
    }
  }, [category]);

  useEffect(() => {
    if (didBootstrapSearchRef.current || fetchedProducts.length > 0) {
      return;
    }

    didBootstrapSearchRef.current = true;
    void applyFilterAndSearch(
      createDefaultFilters(category || "", (category && subCategory) || "")
    );
  }, [category, fetchedProducts.length]);

  /** Back to the search form with these criteria; it is where dates are set. */
  const editSearch = () => {
    navigation.dispatch(
      StackActions.replace("Search", {
        what: selectedItem,
        where: address,
        coords: {
          lat: coords?.lat,
          lng: coords?.lng,
        },
      })
    );
  };

  const openSheetOn = (tab: string) => {
    setSelectedTab(tab);
    bottomSheetRef.current?.present();
  };

  return (
    <NonScrollableContainer>
      <View style={{ flex: 1, paddingHorizontal: SCREEN_GUTTER }}>
        {/* Header */}
        <Pressable
          onPress={editSearch}
          accessibilityRole="button"
          accessibilityLabel="Edit this search"
          accessibilityHint="Reopens the search screen with these criteria"
          style={[
            {
              // The frame's search bar: 64pt, radius 16, 4pt in on the left where
              // the 44pt back target sits and 12pt on the right.
              minHeight: SUMMARY_HEIGHT,
              backgroundColor: color.surface,
              borderColor: color.line,
              borderWidth: 1,
              borderRadius: radius.card,
              paddingLeft: 4,
              paddingRight: 12,
              marginVertical: SUMMARY_INSET,
            },
            // Theme elevation, not a hand-rolled 0.25 shadow.
            shadow,
          ]}
          className="flex flex-row items-center w-full"
        >
          {/* 44pt target inside the same 64pt row: the arrow used to be a bare
              24pt glyph with no hit slop. */}
          <BackButton onPress={() => navigation.goBack()} />

          <View style={{ flex: 1 }}>
            <Text
              fontSize="text-sm"
              fontWeight="font-bold"
              style={{ width: '100%' }}
              numberOfLines={1}
            >
              {selectedItem || "Everything on Renit"}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, width: "100%" }}>
              {!!range.startDate || !!range.endDate ? <Text
                fontSize="text-sm"
                style={{
                  color: ink.dim(isDark),
                }}
              >
                {formatDate(range.startDate)} - {formatDate(range.endDate)}
              </Text>
                : <Text
                  fontSize="text-sm"
                  style={{
                    color: ink.dim(isDark),
                  }}
                >
                  Any dates
                </Text>}
              {/* A 4pt round dot, not a bullet glyph, as the frame draws it. */}
              <View
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: radius.full,
                  backgroundColor: color.inputLine,
                }}
              />
              <Text
                fontSize="text-sm"
                style={{
                  color: ink.dim(isDark),
                  flex: 1,
                }}
                numberOfLines={1}
              >
                {address || "Anywhere"}
              </Text>
            </View>
          </View>
        </Pressable>

        {/* C-12 v3 moved the filter control out of the search pill into the
            Filters / Sort / Dates bar, under the category rail (ENG-78). The
            rail is 24 below the bar, the bar 12 below the rail. */}
        {railParent && (
          <View style={{ marginTop: 8 }}>
            <CategoryRail
              parentLabel={categoryDisplayName(railParent.title, railParent.slug)}
              onOpenParent={
                railParent.slug
                  ? () =>
                      navigation.navigate("CategoryLanding", {
                        slug: railParent.slug!,
                        title: railParent.title,
                      })
                  : undefined
              }
              items={railParent.subcategories.map((sub) => ({
                key: sub.title,
                label: categoryDisplayName(sub.title, sub.slug),
              }))}
              selectedKey={filters.subCategory ?? ""}
              onSelect={selectRailSubCategory}
            />
          </View>
        )}
        <View style={{ marginTop: railParent ? 12 : 0 }}>
          <FilterBar
            filtersActive={refined}
            sortActive={!!filters.sort}
            datesLabel={
              hasDates
                ? `${formatDate(range.startDate)} - ${formatDate(range.endDate)}`
                : "Dates"
            }
            datesActive={hasDates}
            onFilters={() => openSheetOn(specs.length > 0 ? "Specs" : "Category")}
            onSort={() => openSheetOn("Sort")}
            onDates={editSearch}
            chipSpecLabel={chipSpec?.label}
            chips={quickChips}
            onChip={(value) =>
              chipSpec &&
              applyNow({
                ...filters,
                specs: toggleSpecOption(filters.specs, chipSpec.key, value),
              })
            }
          />
        </View>

        {/* Results */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 12,
            marginBottom: RESULTS_GAP,
          }}
        >
          <Text
            accessibilityRole="header"
            fontSize="text-sm"
            fontWeight="font-bold"
          >
            {isLoading && products.length === 0
              ? "Searching…"
              : pluralize(products.length, "result")}
          </Text>

          <View className="flex flex-row items-center space-x-3">
            {isFilterActive() && (
              <TouchableOpacity onPress={clearFiltersAndSearch}>
                <Text
                  fontSize="text-sm"
                  fontWeight="font-bold"
                  className={`underline ${isDark ? "text-muted-dark" : "text-muted-light"
                    }`}
                >
                  Clear Filters
                </Text>
              </TouchableOpacity>
            )}

          </View>
        </View>

        {/* Products Grid */}

        <FlatList
          style={{ width: "100%" }}
          data={products}
          keyExtractor={(item) => item.name}
          // Always the two-up grid. Special-casing a single result to full width
          // gave the app a third product-card layout: the same object rendered
          // as a 158pt tile on Home, a half-column tile on the owner profile,
          // and a ~390pt full-bleed slab here, so one search result filled the
          // entire screen. A lone tile in a two-column row is the correct and
          // expected shape.
          numColumns={2}
          columnWrapperStyle={{
            justifyContent: "flex-start",
            gap: COLUMN_GAP,
          }}
          // No alignItems here: centring the content container makes each row
          // shrink-wrap its children instead of filling the list, so the cards'
          // "48.5%" resolved against a collapsed row and came out tiny.
          // columnWrapperStyle's gap does the real work.
          contentContainerStyle={{
            paddingBottom: density.listFooter,
            flexGrow: 1,
            gap: RESULTS_GAP,
          }}
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
              // "How far away is it?" is the first question in peer-to-peer
              // rental, and the results grid was the one place it was missing.
              coordinates={item.coordinates}
              specFilters={specFilters}
            />
          )}
          // Searching and finding nothing are the same slot, so the skeleton
          // can cross-fade into whichever one arrives. The list itself stays
          // mounted, which keeps it the thing that owns scrolling.
          ListEmptyComponent={
            <CrossFade loading={isLoading} placeholder={<ResultsSkeleton width={cardWidth} />}>
              <View>
                <EmptyState
                  compact
                  title="No matches"
                  body={
                    isFilterActive()
                      ? "Try widening your dates, price or location."
                      : "Try a broader word, or browse a category from Home."
                  }
                  actionLabel={isFilterActive() ? "Clear filters" : undefined}
                  onAction={isFilterActive() ? clearFiltersAndSearch : undefined}
                />
                <Disclaimer mb={24} />
              </View>
            </CrossFade>
          }
        />
      </View>

      {/* Main Bottom Sheet */}
      {/* The sheet was pinned at 75% whatever it contained, so the Price tab
          showed two fields above roughly 1,180pt of empty white. Each tab now
          asks for the height it actually needs. */}
      <CustomBottomSheetModal
        ref={bottomSheetRef}
        snapPoints={[sheetHeightForTab(activeTab, showSubCategory)]}
        isDark={isDark}
        scrollView={false}
      >
        <StyledBottomView className="w-full py-2 flex flex-col justify-between flex-1 ">
          <View className="flex-1 w-full ">
            <View className="flex w-full " style={{ marginBottom: activeTab === 'Category' && !showSubCategory ? 0 : 12 }}>
              <Text
                accessibilityRole="header"
                role="sectionTitle"
                className="text-center"
              >
                Filters
              </Text>

              <ScrollView
                showsHorizontalScrollIndicator={false}
                horizontal={true}
                className="mt-3 "
              >
                <View
                  style={{
                    position: "absolute",
                    bottom: 0,
                    height: 2,
                    backgroundColor: ink.line(isDark),
                    width: "100%",
                    zIndex: -1,
                    left: 0,
                    right: 0,
                  }}
                />
                {tabs.map(
                  (tab) => (
                    <TouchableOpacity
                      key={tab}
                      onPress={() => setSelectedTab(tab)}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        marginHorizontal: 5,
                      }}
                    >
                      <View
                        style={{
                          position: "relative",
                          paddingBottom: activeTab === tab ? 2 : 0,
                        }}
                      >
                        <Text
                          fontSize="text-sm"
                          fontWeight={activeTab === tab ? "font-semibold" : "font-medium"}
                          tone={activeTab === tab ? "default" : "body"}
                        >
                          {tab}
                          {tabHasValue(tab, filters) ? " •" : ""}
                        </Text>
                        {/* Border for the selected tab */}
                        {activeTab === tab && (
                          <View
                            style={{
                              position: "absolute",
                              bottom: -4,
                              left: 0,
                              right: 0,
                              height: 2,
                              backgroundColor: colors.dark.brand,
                            }}
                          />
                        )}
                      </View>
                    </TouchableOpacity>
                  )
                )}
              </ScrollView>
            </View>
            <View className="flex-1 px-1">
              {activeTab === "Sort" && (
                <SortFilter
                  selectedFilter={filters.sort}
                  onSelect={(option) => handleFilterSelect("sort", option)}
                  closeSheet={closeSheet}
                  isLoading={isLoading}
                  hasLocation={coords.lat != null && coords.lng != null}
                />
              )}
              {activeTab === "Category" && !showSubCategory && (
                // The picker every other screen uses, so the search across
                // sub-categories behaves the same here as there.
                <TaxonomyList
                  inBottomSheet
                  items={categories}
                  onSelect={(item) => handleCategorySelect(item.title)}
                  // The parent tap, then the child set outright. Not
                  // `handleFilterSelect`: that toggles, and a result carries
                  // no check mark to warn it would clear an existing pick.
                  onSearchSelect={(parent, child) => {
                    handleCategorySelect(parent.title);
                    setFilters((prev) => ({ ...prev, subCategory: child.title, specs: {} }));
                  }}
                />
              )}

              {activeTab === "Category" &&
                showSubCategory &&
                selectedCategoryData && (
                  <SubCategoryFilter
                    selectedCategory={selectedCategoryData.title}
                    selectedSubCategory={filters.subCategory}
                    onSelect={(subCategory) =>
                      handleFilterSelect("subCategory", subCategory)
                    }
                    onClose={() => setShowSubCategory(false)}
                    isDark={isDark}
                    subcategories={selectedCategoryData.subcategories}
                    isLoading={isLoading}
                    closeSheet={closeSheet}
                  />
                )}
              {activeTab === "Specs" && (
                <SpecFilter
                  specs={specs}
                  selected={filters.specs}
                  onToggle={handleSpecToggle}
                />
              )}
              {activeTab === "Price" && (
                <PriceFilter
                  minPrice={filters.price.min}
                  maxPrice={filters.price.max}
                  onSelect={handlePriceSelect}
                  closeSheet={closeSheet}
                  isLoading={isLoading}
                />
              )}
              {activeTab === "Ratings" && (
                <RatingFilter
                  productRating={filters.ratings.product}
                  ownerRating={filters.ratings.owner}
                  onSelect={handleRatingSelect}
                  closeSheet={closeSheet}
                  isLoading={isLoading}
                />
              )}
              {activeTab === "Condition" && (
                <ConditionFilter
                  selectedFilter={filters.condition}
                  onSelect={(option) => handleFilterSelect("condition", option)}
                  closeSheet={closeSheet}
                  isLoading={isLoading}
                />
              )}
            </View>
          </View>

          {/* One persistent footer. Each tab used to render its own "Show
              products" button, and only once something had been selected — so
              a sheet you had just opened had no action at all, and there was
              never a way to clear a filter you had set. */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              paddingHorizontal: SCREEN_GUTTER,
              paddingTop: 12,
              borderTopWidth: 1,
              borderTopColor: ink.line(isDark),
            }}
          >
            <View style={{ flex: 1 }}>
              <Button
                variant="ghost"
                disabled={!isFilterActive()}
                onPress={clearFiltersAndSearch}
              >
                Reset
              </Button>
            </View>
            <View style={{ flex: 1.4 }}>
              <Button loading={isLoading} onPress={closeSheet}>
                {isLoading
                  ? "Loading"
                  : pendingCount == null
                  ? // Counting. A number we know is out of date is worse than
                    // no number at all.
                    "Show results"
                  : `Show ${pluralize(pendingCount, "result")}`}
              </Button>
            </View>
          </View>
        </StyledBottomView>
      </CustomBottomSheetModal>
    </NonScrollableContainer>
  );
}
