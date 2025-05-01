import { Card, Button, Text } from "@/components/core";
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
import { FlatList, Pressable, StyleSheet, TouchableOpacity, View } from "react-native";
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

const { height } = Dimensions.get("window");

const StyledBottomView = styled(BottomSheetView);

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
  const [isLoading, setIsLoading] = useState(false);

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
    from_cat
  } = route.params;
  const { searchProducts } = useSearch();
  const [products, setProducts] = useState<BackendProduct[]>(fetchedProducts);

  const handleOpenBottomSheet = () => {
    bottomSheetRef.current?.present();
  };

  const [filters, setFilters] = useState({
    sort: "",
    category: category || "",
    subCategory: "",
    price: { min: "", max: "" },
    ratings: { product: 0, owner: 0 },
    condition: "",
  });

  const handleProdResp = async()=>{
    try {
      const products = await searchProducts(category as string,
                 { lat: coords?.lat as number,
                   lng: coords?.lng as number },
                 {
                   start_date:  undefined,
                   end_date:  undefined,
                 }
               );
               setProducts(products)
  } catch (error) {
    console.log(error)
  }
  }

  useEffect(() => {
    if(from_cat){
      handleProdResp()
    }
  }, [from_cat])

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

  const applyFilterAndSearch = async () => {
    setIsLoading(true);
    try {
      const filteredProducts = await searchProducts(
        selectedItem,
        { lat: coords.lat!, lng: coords.lng! },
        {
          start_date: range.startDate?.toISOString() ?? undefined,
          end_date: range.endDate?.toISOString() ?? undefined,
        },
        {
          sort: filters.sort,
          category: filters.category,
          subcategory: filters.subCategory,
          min_price: filters.price.min,
          max_price: filters.price.max,
          product_rating: filters.ratings.product,
          owner_rating: filters.ratings.owner,
          condition: filters.condition,
        }
      );
      if(filters.sort === 'high-to-low'){
        let productsToSet = filteredProducts.filter(prod => !prod?.moderation_labels?.length);
        productsToSet = productsToSet?.sort((a, b) => b?.rate - a?.rate);
        setProducts(productsToSet)
      }
      else if(filters.sort === 'low-to-high'){
        let productsToSet = filteredProducts.filter(prod => !prod?.moderation_labels?.length);
        productsToSet = productsToSet?.sort((a, b) => a?.rate - b?.rate);
        setProducts(productsToSet)
      }
      else{
        setProducts(filteredProducts.filter(prod => !prod?.moderation_labels?.length));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearFiltersAndSearch = async () => {
    setFilters({
      sort: "",
      category: "",
      subCategory: "",
      price: { min: "", max: "" },
      ratings: { product: 0, owner: 0 },
      condition: "",
    });
    await applyFilterAndSearch();
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
      shadowColor: isDark ? "#00000014" : "#00000080",
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
      handleCategorySelect(category);
      setSelectedTab("Category");
      // handleOpenBottomSheet();
    }
  }, [category]);

  return (
    <NonScrollableContainer height={height > 700 ? 105 : 100}>
      <View className="w-[90%] mx-auto flex-1">
        {/* Header */}
        <Pressable
          onPress={() => {
            navigation.dispatch(
              StackActions.replace('Search', { what: selectedItem, where: address })
            );
          }}
          style={styles.Shadow}
          className={`border h-[64px] w-[90%] ${isDark
            ? "border-[#292929] bg-[#0F0F0F]"
            : "border-[#E6E6E6] bg-white"
            } flex flex-row items-center w-full my-2 rounded-[16px] p-4 space-x-3`}
        >
          <TouchableOpacity onPress={() => {
            navigation.goBack()
          }}>
            <ArrowLeftIcon
              color={isDark ? "#FFFFFF80" : "#00000080"}
              size={18}
            />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text
              fontSize="text-sm"
              fontWeight="font-bold"
              style={{ width: '100%' }}
              numberOfLines={1}
            >
              {selectedItem || 'No product selected'}
            </Text>
            <View className="flex flex-row items-center space-x-2 mt-1 w-full" >
              {!!range.startDate || !!range.endDate ? <Text
                fontSize="text-sm"
                style={{
                  color: isDark ? "#FFFFFF80" : "#00000080",
                }}
              >
                {formatDate(range.startDate)} - {formatDate(range.endDate)}
              </Text>
                : <Text
                  fontSize="text-sm"
                  style={{
                    color: isDark ? "#FFFFFF80" : "#00000080",
                  }}
                >
                  No dates
                </Text>}<Text
                  fontSize="text-sm"
                  className="mb-1"
                  style={{
                    color: isDark ? "#FFFFFF80" : "#00000080",
                  }}
                >
                •
              </Text>
              <Text
                fontSize="text-sm"
                style={{
                  color: isDark ? "#FFFFFF80" : "#00000080",
                  flex: 1,
                }}
                numberOfLines={1}
              >
                {address || 'No location'}
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
            {products.length} results
          </Text>

          <View className="flex flex-row items-center space-x-3">
            {isFilterActive() && (
              <TouchableOpacity onPress={clearFiltersAndSearch}>
                <Text
                  fontSize="text-sm"
                  fontWeight="font-bold"
                  className={`underline ${isDark ? "text-[#FFFFFFB2]" : "text-[#000000B2]"
                    }`}
                >
                  Clear Filters
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={handleOpenBottomSheet}
              className={`relative rounded-full p-2 border ${isDark
                ? "border-[#292929] bg-[#0F0F0F]"
                : "border-[#E6E6E6] bg-white"
                }`}
            >
              <AdjustmentsVerticalIcon
                color={isDark ? "#FFFFFF80" : "#00000080"}
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
                    backgroundColor: "#413C9A",
                  }}
                />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Products Grid */}

        <FlatList
          style={{ width: '100%', }}
          data={products}
          keyExtractor={(item) => item.name}
          numColumns={2}
          columnWrapperStyle={{
            justifyContent: "space-between",
            marginTop: 8,
            gap: 12,
          }}
          contentContainerStyle={{ paddingBottom: hp("10%"), justifyContent: 'flex-start', alignItems: 'center', width: '100%', }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <Card
              id={item.name}
              image={item.cover_image}
              title={item.title}
              location={item.location}
              price={item.rate}
              width='48.5%'
              alignItems={index % 2 ? 'flex-start' : 'flex-end'}
            />
          )}
        />
        {products.length === 0 ? (
          <Disclaimer mb={24} />
        ) : null}
      </View>

      {/* Main Bottom Sheet */}
      <CustomBottomSheetModal
        ref={bottomSheetRef}
        snapPoints={["75%"]}
        isDark={isDark}
        scrollView={false}
      >
        <StyledBottomView className="w-full py-2 flex flex-col justify-between flex-1 ">
          <View className="flex-1 w-full ">
            <View className="flex w-full " style={{ marginBottom: selectedTab === 'Category' && !showSubCategory ? 0 : 12 }}>
              <Text
                fontSize="text-lg"
                fontWeight="font-bold"
                className="text-center"
              >
                Refine your search
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
                    backgroundColor: isDark ? "#292929" : "#e6e6e6",
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
                          fontWeight="font-bold"
                          className={`${selectedTab === tab
                            ? ""
                            : isDark
                              ? "text-[#FFFFFF80]"
                              : "text-[#00000080]"
                            }`}
                        >
                          {tab}
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
                              backgroundColor: "#635be8",
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
        </StyledBottomView>
      </CustomBottomSheetModal>
    </NonScrollableContainer>
  );
}
