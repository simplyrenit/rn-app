import { pluralize } from "@/lib/pluralize";
import { Button, Card, EmptyState, Text } from "@/components/core";
import CustomBottomSheetModal from "@/components/core/custom-bottom-sheet-modal";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { CategoryFilter } from "@/components/search/category-filter";
import { ConditionFilter } from "@/components/search/condition-filter";
import { PriceFilter } from "@/components/search/price-filter";
import { RatingFilter } from "@/components/search/rating-filter";
import { SortFilter } from "@/components/search/sort-filter";
import SubCategoryFilter from "@/components/search/sub-category-filter";
import { useGlobalContext } from "@/context/global-context";
import { SUB_CATEGORIES } from "@/lib/categories";
import { BackendProduct, RouteProps, useTypedNavigation } from "@/lib/types";
import { BottomSheetView } from "@gorhom/bottom-sheet";
import { StackActions, useRoute } from "@react-navigation/native";
import { Image } from "expo-image";
import { styled } from "nativewind";
import React, { useRef, useState, useEffect } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, TouchableOpacity, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { heightPercentageToDP as hp } from "react-native-responsive-screen";
import {
  AdjustmentsVerticalIcon,
  ArrowLeftIcon,
  CheckIcon,
  ChevronLeftIcon,
} from "react-native-heroicons/outline";
import { useSearch } from "@/backend/search";
import { Dimensions } from "react-native";
import { Disclaimer } from "@/components/home/disclaimer";
import { SCREEN_GUTTER, colors, ink } from "@/lib/design-tokens";

const { height } = Dimensions.get("window");

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
    default:
      return false;
  }
}


const createDefaultFilters = (category = "") => ({
  sort: "",
  category,
  subCategory: "",
  price: { min: "", max: "" },
  ratings: { product: 0, owner: 0 },
  condition: "",
});

const formatDate = (date: Date | undefined) => {
  if (!date) return "";
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
  };
  return date.toLocaleDateString("en-US", options);
};

export default function SearchResults() {
  const navigation = useTypedNavigation();
  const route = useRoute<RouteProps<"SearchResults">>();

  const { theme, categories } = useGlobalContext();
  const isDark = theme === "dark";
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
  } = route.params;
  const { searchProducts } = useSearch();
  const [products, setProducts] = useState<BackendProduct[]>(fetchedProducts);
  const didBootstrapSearchRef = useRef(false);

  const handleOpenBottomSheet = () => {
    bottomSheetRef.current?.present();
  };

  const [filters, setFilters] = useState(() =>
    createDefaultFilters(category || "")
  );

  const isFilterActive = () => {
    const { sort, category, subCategory, price, ratings, condition } = filters;

    return (
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
    }));
  };

  const handleCategorySelect = (category: string) => {
    setFilters((prevFilters) => ({
      ...prevFilters,
      category,
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

  const applyFilterAndSearch = async (
    nextFilters: typeof filters = filters
  ) => {
    setIsLoading(true);
    try {
      const filteredProducts = await searchProducts(
        selectedItem,
        coords.lat != null && coords.lng != null
          ? { lat: coords.lat, lng: coords.lng }
          : undefined,
        {
          start_date: range.startDate?.toISOString() ?? undefined,
          end_date: range.endDate?.toISOString() ?? undefined,
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
        }
      );
      setProducts(filteredProducts.filter(prod => !prod?.moderation_labels?.length));
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearFiltersAndSearch = async () => {
    const resetFilters = createDefaultFilters();
    setSelectedCategory(null);
    setShowSubCategory(false);
    setFilters(resetFilters);
    await applyFilterAndSearch(resetFilters);
  };

  const closeSheet = async () => {
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

  const styles = StyleSheet.create({
    Shadow: {
      shadowColor: isDark ? ink.line(false) : ink.dim(false),
      shadowOffset: {
        width: 0,
        height: 3.5,
      },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
  });

  const [showSubCategory, setShowSubCategory] = useState(false);

  const selectedCategoryData = categories.find(
    (category) => category.title === selectedCategory
  );

  useEffect(() => {
    if (category) {
      setSelectedCategory(category);
      setSelectedTab("Category");
    }
  }, [category]);

  useEffect(() => {
    if (didBootstrapSearchRef.current || fetchedProducts.length > 0) {
      return;
    }

    didBootstrapSearchRef.current = true;
    void applyFilterAndSearch(
      createDefaultFilters(category || "")
    );
  }, [category, fetchedProducts.length]);

  return (
    <NonScrollableContainer height={height > 700 ? 105 : 100}>
      <View className="w-[90%] mx-auto flex-1">
        {/* Header */}
        <Pressable
          onPress={() => {
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
          }}
          style={styles.Shadow}
          className={`border h-[64px] w-[90%] ${isDark
            ? "border-line-dark bg-surface-dark"
            : "border-line-light bg-surface-light"
            } flex flex-row items-center w-full my-2 rounded-group p-4 space-x-3`}
        >
          <TouchableOpacity onPress={() => {
            navigation.goBack()
          }}>
            <ArrowLeftIcon
              color={ink.dim(isDark)}
              size={24}
            />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text
              fontSize="text-sm"
              fontWeight="font-bold"
              style={{ width: '100%' }}
              numberOfLines={1}
            >
              {selectedItem || "Everything on Renit"}
            </Text>
            <View className="flex flex-row items-center space-x-2 mt-1 w-full" >
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
                </Text>}<Text
                  fontSize="text-sm"
                  className="mb-1"
                  style={{
                    color: ink.dim(isDark),
                  }}
                >
                •
              </Text>
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

        {/* Filters and Results */}
        <View className="mx-1 mt-1 mb-2 flex flex-row items-center justify-between">
          <Text
            fontSize="text-base"
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

            <TouchableOpacity
              onPress={handleOpenBottomSheet}
              accessibilityRole="button"
              accessibilityLabel="Filters"
              accessibilityHint="Refine these results by price, dates and location"
              className={`relative rounded-full p-2 border ${isDark
                ? "border-line-dark bg-surface-dark"
                : "border-line-light bg-surface-light"
                }`}
            >
              <AdjustmentsVerticalIcon
                color={ink.dim(isDark)}
                size={20}
              />
              {isFilterActive() && (
                <View
                  style={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: colors.dark.brand,
                  }}
                />
              )}
            </TouchableOpacity>
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
            marginTop: 8,
            gap: 12,
          }}
          // No alignItems here: centring the content container makes each row
          // shrink-wrap its children instead of filling the list, so the cards'
          // "48.5%" resolved against a collapsed row and came out tiny.
          // columnWrapperStyle's space-between does the real work.
          contentContainerStyle={{ paddingBottom: hp("10%") }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <Card
              id={item.name}
              image={item.cover_image}
              title={item.title}
              location={item.location}
              price={item.rate}
              width="48.5%"
            />
          )}
        />
        {isLoading && products.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={colors.dark.brand} />
          </View>
        ) : null}
        {!isLoading && products.length === 0 ? (
          <>
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
          </>
        ) : null}
      </View>

      {/* Main Bottom Sheet */}
      {/* The sheet was pinned at 75% whatever it contained, so the Price tab
          showed two fields above roughly 1,180pt of empty white. Each tab now
          asks for the height it actually needs. */}
      <CustomBottomSheetModal
        ref={bottomSheetRef}
        snapPoints={[sheetHeightForTab(selectedTab, showSubCategory)]}
        isDark={isDark}
        scrollView={false}
      >
        <StyledBottomView className="w-full py-2 flex flex-col justify-between flex-1 ">
          <View className="flex-1 w-full ">
            <View className="flex w-full " style={{ marginBottom: selectedTab === 'Category' && !showSubCategory ? 0 : 12 }}>
              <Text
                accessibilityRole="header"
                fontSize="text-md"
                fontWeight="font-semibold"
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
                {["Sort", "Category", "Price", "Ratings", "Condition"].map(
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
                          paddingBottom: selectedTab === tab ? 2 : 0,
                        }}
                      >
                        <Text
                          fontSize="text-sm"
                          fontWeight={selectedTab === tab ? "font-semibold" : "font-medium"}
                          tone={selectedTab === tab ? "default" : "body"}
                        >
                          {tab}
                          {tabHasValue(tab, filters) ? " •" : ""}
                        </Text>
                        {/* Border for the selected tab */}
                        {selectedTab === tab && (
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
              {selectedTab === "Sort" && (
                <SortFilter
                  selectedFilter={filters.sort}
                  onSelect={(option) => handleFilterSelect("sort", option)}
                  closeSheet={closeSheet}
                  isLoading={isLoading}
                  hasLocation={coords.lat != null && coords.lng != null}
                />
              )}
              {selectedTab === "Category" && !showSubCategory && (
                <CategoryFilter
                  selectedCategory={filters.category}
                  onSelect={handleCategorySelect}
                  closeSheet={closeSheet}
                  categories={categories}
                  isDark={isDark}
                  isLoading={isLoading}
                />
              )}

              {selectedTab === "Category" &&
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
              {selectedTab === "Price" && (
                <PriceFilter
                  minPrice={filters.price.min}
                  maxPrice={filters.price.max}
                  onSelect={handlePriceSelect}
                  closeSheet={closeSheet}
                  isLoading={isLoading}
                />
              )}
              {selectedTab === "Ratings" && (
                <RatingFilter
                  productRating={filters.ratings.product}
                  ownerRating={filters.ratings.owner}
                  onSelect={handleRatingSelect}
                  closeSheet={closeSheet}
                  isLoading={isLoading}
                />
              )}
              {selectedTab === "Condition" && (
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
                  : `Show ${products.length} ${
                      products.length === 1 ? "result" : "results"
                    }`}
              </Button>
            </View>
          </View>
        </StyledBottomView>
      </CustomBottomSheetModal>
    </NonScrollableContainer>
  );
}
