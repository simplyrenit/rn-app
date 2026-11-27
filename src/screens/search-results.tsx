import useSaved from "@/backend/useSaved";
import { pluralize } from "@/lib/pluralize";
import {
  BackButton,
  Card,
  CrossFade,
  EmptyState,
  ProductCardSkeleton,
  SheetFooter,
  SheetHeader,
  Text,
} from "@/components/core";
import CustomBottomSheetModal from "@/components/core/custom-bottom-sheet-modal";
import DateRangePicker from "@/components/core/date-range-picker";
import { apiError } from "@/lib/api-error";
import { BOOKING_DAYS_AHEAD, daysRefusal } from "@/lib/booking";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { TaxonomyList } from "@/components/post/taxonomy-list";
import { ConditionFilter } from "@/components/search/condition-filter";
import { SellerFilter } from "@/components/search/seller-filter";
import { track } from "@/lib/events";
import { PriceFilter } from "@/components/search/price-filter";
import { RatingFilter } from "@/components/search/rating-filter";
import { SortFilter } from "@/components/search/sort-filter";
import { SpecFilter } from "@/components/search/spec-filter";
import SubCategoryFilter from "@/components/search/sub-category-filter";
import { CategoryRail, FilterBar } from "@/components/search/results-rails";
import { useGlobalContext } from "@/context/global-context";
import { categoryDisplayName } from "@/lib/category-icons";
import { searchedDays } from "@/lib/booking";
import { toast } from "@/lib/toast";
import {
  BackendProduct,
  RootStackParamList,
  RouteProps,
  useTypedNavigation,
} from "@/lib/types";
import { BottomSheetView } from "@gorhom/bottom-sheet";
import {
  StackActions,
  useFocusEffect,
  useIsFocused,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { styled } from "nativewind";
import React, { useCallback, useRef, useState, useEffect } from "react";
import {
  FlatList,
  Pressable,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  SpecFilterPanel,
  isBrowseLabel,
  quickChipSpec,
  toggleSpecOption,
  useSearch,
} from "@/backend/search";
import { Disclaimer } from "@/components/home/disclaimer";
import { MIN_TOUCH_TARGET, SCREEN_GUTTER, density, radius } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { useAddAddress } from "@/backend/useAddresses";
import { AddressPickerSheet, AddressPickerSheetHandle } from "@/components/addresses/address-picker-sheet";
import { deliveryAddressKey, useDeliveryAddress } from "@/context/delivery-address";
import { SavedAddress, flatAndLandmark } from "@/lib/addresses";
import { addressRowCopy, areaOf, deliverCountLine, nobodyDeliversCopy, splitByDelivery } from "@/lib/delivery";
import { rememberReturnTo } from "@/lib/return-to";
import {
  ChevronRightIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  TruckIcon,
} from "react-native-heroicons/outline";


const StyledBottomView = styled(BottomSheetView);

/**
 * How tall the filter sheet is for the tab on screen: each 2.1 frame's sheet
 * height (2089:34679 … 35398), which counts the frame's own 21pt home-indicator
 * strip; the screen adds the real inset instead. The parent category list is
 * not drawn in any frame and keeps its share of the screen.
 */
const SHEET_FRAME_HEIGHT: Record<string, number> = {
  Specs: 671,
  Sort: 491,
  Category: 655,
  Price: 360,
  Ratings: 411,
  Condition: 415,
  Seller: 345,
};
const FRAME_INDICATOR = 21;
const CATEGORY_LIST_SHARE = 0.62;

/** The frame height the share above was tuned on (390x844). */
const FRAME_HEIGHT = 844;

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
    case "Seller":
      return Boolean(filters?.verifiedBusiness);
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
  /** Only listings from verified businesses (D-26, ENG-73). */
  verifiedBusiness: false,
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

// The 2.1 results frame (2089:31917): a 64pt summary bar 8 under the status bar
// and 12 above the content, then the rail, the Filters bar, the address row, the
// count and the grid, each 16 apart. The grid is two columns 18 apart with 24
// between rows: 162 on the 390pt frame, narrower on a smaller phone.
const SUMMARY_HEIGHT = 64;
const SUMMARY_TOP = 8;
const SUMMARY_BOTTOM = 12;
const BLOCK_GAP = 16;
const RESULTS_GAP = 24;
const COLUMN_GAP = 18;
/**
 * The empty states sit 24 under the count, full width: the kit EmptyState pads
 * itself by the gutter, so the wrap bleeds out of the screen's own one and the
 * words get the frame's 342.
 */
const EMPTY_WRAP = { marginHorizontal: -SCREEN_GUTTER, paddingTop: 24 } as const;
/**
 * A 20pt text link grown to a 44pt target by padding that the margin takes back,
 * so the line stays where drawn. Android hit-tests a child only inside its
 * parent's bounds (hitSlop too), so the links' parents get the same, to hold the
 * whole target.
 */
const LINK_TARGET = { paddingVertical: 12, marginVertical: -12 } as const;
/** The summary bar's card shadow, #0000000F 0/4 blur 16; dark keeps the hairline alone. */
const SUMMARY_SHADOW = {
  shadowColor: "#000000",
  shadowOpacity: 0.06,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
} as const;

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
  /** For `push` and `setParams`, which the shared navigation type lacks. */
  const stack =
    useNavigation<NativeStackNavigationProp<RootStackParamList, "SearchResults">>();
  const route = useRoute<RouteProps<"SearchResults">>();

  const { theme, categories } = useGlobalContext();
  const isDark = theme === "dark";
  const { color } = useTheme();
  const { favorites } = useSaved();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // Fixed heights, so a 667pt SE or a 640dp Android does not cut the rows and
  // the footer (the sheet caps itself at the screen). The home-indicator inset
  // is added on top, since the footer clears it.
  const filterSheetHeight = (tab: string) =>
    tab === "Category" && !showSubCategory
      ? Math.round(CATEGORY_LIST_SHARE * Math.max(screenHeight, FRAME_HEIGHT) + insets.bottom)
      : (SHEET_FRAME_HEIGHT[tab] ?? SHEET_FRAME_HEIGHT.Sort) - FRAME_INDICATOR + insets.bottom;
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
  // The category landing and the product page's breadcrumb send the
  // category's name as the text; the pill still shows it, but it is not
  // searched for (see isBrowseLabel).
  const routeParent = category
    ? categories.find((c) => c.title === category || c.slug === category)
    : undefined;
  const searchText = isBrowseLabel(selectedItem, [
    category,
    // A caller without the category list (a cold start) can send a slug as
    // `category` and the bundled display name as the text.
    category && categoryDisplayName(category),
    routeParent?.title,
    routeParent?.slug,
    routeParent && categoryDisplayName(routeParent.title, routeParent.slug),
    subCategory,
  ])
    ? ""
    : selectedItem;
  const [products, setProducts] = useState<BackendProduct[]>(fetchedProducts);
  const didBootstrapSearchRef = useRef(false);

  /**
   * ENG-284 D12: the address the grid answers "who delivers?" for. Each result
   * says it (`delivery`) when the search carries `deliver_address`; the
   * "Delivers to me" chip, its counts and the nobody-delivers state are worked
   * out here from that one array (D2), so the chip is instant.
   */
  const deliveryAddress = useDeliveryAddress();
  const deliverTo = deliveryAddress.address;
  const addressKey = deliveryAddressKey(deliverTo);
  /** The address the grid on screen was searched for; null before the first search lands. */
  const [gridAddressKey, setGridAddressKey] = useState<string | null>(null);
  const [addressSearchFailed, setAddressSearchFailed] = useState(false);
  const [deliversToMe, setDeliversToMe] = useState(false);
  // The first search waits for the addresses (signed in), so cards don't flash
  // "Delivery available" and the search doesn't run twice; but not for long.
  const [holdOver, setHoldOver] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setHoldOver(true), 1500);
    return () => clearTimeout(timer);
  }, []);
  const addressSettled = deliveryAddress.state !== "loading" || holdOver;
  const addressSheet = useRef<AddressPickerSheetHandle>(null);

  /**
   * The scope the route opened with: a browse keeps its category and
   * sub-category through Clear Filters, a typed search has neither. Clearing
   * a browse to nothing searched the whole catalogue, the label no longer
   * being sent as text.
   */
  const routeFilters = () =>
    createDefaultFilters(category || "", (category && subCategory) || "");
  const [filters, setFilters] = useState(routeFilters);

  const filtersKey = keyOf(filters);
  /** The filter set the products on screen were actually fetched with. */
  const [appliedKey, setAppliedKey] = useState(filtersKey);
  const appliedKeyRef = useRef(appliedKey);
  appliedKeyRef.current = appliedKey;
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

  // Anything Clear Filters would undo. Against the route's own scope, so a
  // browse does not show Clear Filters for the category it opened on. The
  // "Delivers to me" chip counts, though it lives outside `filters`: it is
  // applied here, not by the server, so it never goes into a search. Only
  // while it is shown and filtering (`filterOn`): signed out or with no
  // address it is hidden, and Clear Filters would clear nothing visible.
  const isFilterActive = () => filtersKey !== keyOf(routeFilters()) || filterOn;

  const handleFilterSelect = (
    filterType: keyof typeof filters,
    value: string | null
  ) => {
    setFilters((prevFilters) => ({
      ...prevFilters,
      // A second tap clears to "", the empty value everything else checks for;
      // null left isFilterActive() true with nothing set.
      [filterType]: prevFilters[filterType] === value ? "" : value,
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

  const handleVerifiedToggle = (on: boolean) => {
    track("kyc_badge_filter_toggled", { on });
    setFilters((prevFilters) => ({ ...prevFilters, verifiedBusiness: on }));
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
  const runSearch = (nextFilters: typeof filters, dates = range) =>
    searchProducts(
      searchText,
      coords.lat != null && coords.lng != null
        ? { lat: coords.lat, lng: coords.lng }
        : undefined,
      {
        start_date: dates.startDate ?? undefined,
        end_date: dates.endDate ?? undefined,
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
        verified_business: nextFilters.verifiedBusiness,
      },
      deliverTo?.id ?? null
    );

  /** The latest search; the rail and chips make several in quick succession. */
  const searchSeqRef = useRef(0);
  /** The filter set a search is running for, so it is not counted twice. */
  const searchingKeyRef = useRef<string | null>(null);
  /** False when the search failed; a superseded one counts as done. */
  const applyFilterAndSearch = async (
    nextFilters: typeof filters = filters,
    dates = range,
    /** An address change says its failure inline, under the row, not as a toast. */
    quiet = false
  ): Promise<boolean> => {
    const seq = ++searchSeqRef.current;
    const forAddress = addressKey;
    searchingKeyRef.current = keyOf(nextFilters);
    setIsLoading(true);
    try {
      const filteredProducts = await runSearch(nextFilters, dates);
      // Air cooler then Water cooler tapped quickly: an Air cooler answer
      // arriving second must not fill the grid under the Water cooler chip.
      if (seq !== searchSeqRef.current) return true;
      setProducts(filteredProducts.filter(prod => !prod?.moderation_labels?.length));
      setAppliedKey(keyOf(nextFilters));
      setGridAddressKey(forAddress);
      setAddressSearchFailed(false);
      return true;
    } catch (error) {
      console.error(error);
      if (seq !== searchSeqRef.current) return true;
      if (quiet) return false;
      // Days the server will not search (beyond 180 days ahead): its own sentence, not "check your connection".
      const refusal = daysRefusal(apiError(error));
      toast.error(refusal ? "These dates can't be searched." : "We couldn't update these results.", {
        message: refusal ?? "Check your connection and try again.",
      });
      return false;
    } finally {
      if (seq === searchSeqRef.current) {
        searchingKeyRef.current = null;
        setIsLoading(false);
      }
    }
  };

  /** Rail and chip taps: applied at once, as the sheet's "Show results" would. */
  const applyNow = async (nextFilters: typeof filters) => {
    setFilters(nextFilters);
    // Back to the set behind the grid, so the rail and chips do not claim a
    // scope whose results never arrived. The ref, not the tap's closure: an
    // earlier tap may have applied since.
    if (!(await applyFilterAndSearch(nextFilters))) {
      setFilters(JSON.parse(appliedKeyRef.current));
    }
  };

  const clearFiltersAndSearch = async () => {
    setDeliversToMe(false);
    const resetFilters = routeFilters();
    setSelectedCategory(category || null);
    setShowSubCategory(Boolean(category && subCategory));
    setFilters(resetFilters);
    await applyFilterAndSearch(resetFilters);
  };

  // Re-count whenever the entered filters drift from the applied ones. Debounced
  // so a price typed digit by digit is one request, not four. Not while that
  // very set is being searched (a rail or chip tap): the search is the count.
  // Keyed on the address too: a count made for another address would say
  // "Show N results" for a grid that is not the one the button gives.
  const previewKey = `${filtersKey}#${addressKey}`;
  useEffect(() => {
    if (filtersKey === appliedKey) return;
    if (preview?.key === previewKey) return;
    if (searchingKeyRef.current === filtersKey) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const counted = await runSearch(filters);
        if (!cancelled) setPreview({ key: previewKey, products: counted });
      } catch {
        // Leave the count unknown rather than showing a stale one.
      }
    }, COUNT_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [filtersKey, appliedKey, preview?.key, previewKey]);

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
          searchText,
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
            verified_business: filters.verifiedBusiness,
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
    // The dates too: the counts are for this range (the Dates pill moves it).
  }, [filtersKey, range.startDate, range.endDate]);

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

  // The rail's parent, by title or slug: search accepts either as `category`.
  const railParent = filters.category
    ? categories.find(
        (c) => c.title === filters.category || c.slug === filters.category
      )
    : undefined;
  // A browse names what is on screen, so it follows the rail: the label the
  // screen opened with ("Refrigerator") went stale after a tap on "All". A
  // typed search keeps its words.
  const headerLabel =
    searchText ||
    filters.subCategory ||
    railParent?.title ||
    selectedItem ||
    "Everything on Renit";
  /** Re-scope to one of the parent's children, or the whole parent (""). */
  const selectRailSubCategory = (subCategory: string) =>
    // As the sheet's Category tab: the specs were the old sub-category's keys.
    // The text, dates and place are route params, untouched here.
    applyNow({ ...filters, subCategory, specs: {} });

  const nobodyDelivers = (to: SavedAddress) =>
    nobodyDeliversCopy(searchText || filters.subCategory || railParent?.title || "", areaOf(to), split.pickup);

  const hasDates = !!range.startDate || !!range.endDate;
  // The rail already shows the category, so it does not light Filters up too.
  const refined =
    !!filters.sort ||
    !!filters.price.min ||
    !!filters.price.max ||
    filters.ratings.product !== 0 ||
    filters.ratings.owner !== 0 ||
    !!filters.condition ||
    filters.verifiedBusiness ||
    Object.keys(filters.specs).length > 0;

  const tabs = [
    "Sort",
    "Category",
    ...(specs.length > 0 ? ["Specs"] : []),
    "Price",
    "Ratings",
    "Condition",
    "Seller",
  ];

  const filterOn = deliversToMe && deliveryAddress.state === "ready";
  const split = splitByDelivery(products);
  const shown = filterOn ? split.deliver : products;
  // The sheet's count is what "Show N results" will put on screen, chip included.
  const countOf = (list: BackendProduct[]) =>
    filterOn ? splitByDelivery(list).deliver.length : list.length;
  const pendingCount =
    filtersKey === appliedKey
      ? shown.length
      : preview?.key === previewKey
      ? countOf(preview.products)
      : null;

  const closeSheet = async () => {
    // Commit exactly the set that was counted, so the number cannot change
    // between reading it and tapping it.
    if (preview?.key === previewKey) {
      // Supersedes a rail or chip search still in flight. Its `finally` is
      // gated on the sequence, so release its key here or a later preview of
      // that same set would be skipped.
      searchSeqRef.current++;
      searchingKeyRef.current = null;
      setIsLoading(false);
      setProducts(preview.products);
      setAppliedKey(filtersKey);
      setGridAddressKey(addressKey);
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

  // The first search, once the addresses are in (or 1.5 s have gone), and a
  // search again whenever the address the grid answers for has changed: chosen
  // here or on BK-02, edited or deleted in Profile. Only while this screen is
  // in front: a search under another screen would toast over it.
  const focused = useIsFocused();
  const searchForAddress = async () => {
    setAddressSearchFailed(false);
    // The set a rail or chip search is still running for, if any, else the one
    // behind the grid: the newer search supersedes that one, and with the old
    // set the rail would show the tap while the grid showed what came before.
    const latestKey = searchingKeyRef.current ?? appliedKeyRef.current;
    if (!(await applyFilterAndSearch(JSON.parse(latestKey), range, true))) {
      setAddressSearchFailed(true);
      // As applyNow: back to the set behind the grid, since a superseded rail
      // or chip search never landed either.
      setFilters(JSON.parse(appliedKeyRef.current));
    }
  };
  useEffect(() => {
    if (!focused || !addressSettled || gridAddressKey === addressKey) return;
    if (!didBootstrapSearchRef.current) {
      didBootstrapSearchRef.current = true;
      void applyFilterAndSearch(
        createDefaultFilters(category || "", (category && subCategory) || "")
      );
      return;
    }
    void searchForAddress();
    // The search functions are remade every render; these are what decide.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused, addressSettled, addressKey]);

  /** The add flow, coming back with the new address chosen (and the chip on, from the chip). */
  const turnOnAfterAdd = useRef(false);
  const addAddress = useAddAddress(
    useCallback(
      (saved: SavedAddress) => {
        deliveryAddress.choose(saved);
        if (turnOnAfterAdd.current) setDeliversToMe(true);
        turnOnAfterAdd.current = false;
      },
      [deliveryAddress.choose]
    )
  );
  const signInForDelivery = () => {
    // The same search after sign-in: text, place and dates; filters start again.
    rememberReturnTo({ name: "SearchResults", params: { ...route.params, products: [] } });
    navigation.navigate("Welcome");
  };
  const onAddressRow = () => {
    if (deliveryAddress.state === "signed_out") signInForDelivery();
    else if (deliveryAddress.state === "none") {
      turnOnAfterAdd.current = false;
      addAddress();
    } else addressSheet.current?.present();
  };
  const onDeliversToMe = () => {
    if (deliveryAddress.state === "none") {
      turnOnAfterAdd.current = true;
      addAddress();
    } else setDeliversToMe((on) => !on);
  };
  const addressRow = addressRowCopy(deliveryAddress.state, deliverTo);

  /** Back to the search form with these criteria, to change the words or place. */
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

  // Back to the landing this browse came from when it is the same category;
  // pushing another copy made Back walk every hop. Otherwise pushed, not
  // navigated: a landing further down may be another category's once the sheet
  // changed it. The ref stops a double tap; it is let go back in view.
  const openingLandingRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      openingLandingRef.current = false;
    }, [])
  );
  const openLanding = (slug: string, title: string) => {
    if (openingLandingRef.current) return;
    openingLandingRef.current = true;
    // The screen under this one, not under the top: a push still animating
    // would make the top's neighbour this very screen.
    const { routes } = stack.getState();
    const previous = routes[routes.findIndex((r) => r.key === route.key) - 1];
    if (
      previous?.name === "CategoryLanding" &&
      (previous.params as RootStackParamList["CategoryLanding"] | undefined)?.slug === slug
    ) {
      stack.goBack();
      return;
    }
    stack.push("CategoryLanding", { slug, title });
  };

  /**
   * The Dates pill picks dates here rather than back on the search form,
   * which replaced this screen and lost the category, sub-category and specs.
   * The range becomes a param only once its search has landed, so the header
   * never names dates the grid was not searched for.
   */
  const [datesOpen, setDatesOpen] = useState(false);
  const confirmDates = async ({ startDate, endDate }: { startDate: Date; endDate: Date }) => {
    setDatesOpen(false);
    // ISO strings: navigation params must stay serializable.
    const dates = { startDate: startDate.toISOString(), endDate: endDate.toISOString() };
    const seq = searchSeqRef.current + 1;
    const ok = await applyFilterAndSearch(filters, dates);
    // A rail or chip tap that overtook it searched the old range; that grid
    // is what is on screen, so the header keeps the old range too.
    if (ok && searchSeqRef.current === seq) {
      setPreview(null); // counted for the old range
      stack.setParams({ range: dates });
    }
  };

  return (
    <NonScrollableContainer>
      <View style={{ flex: 1, paddingHorizontal: SCREEN_GUTTER }}>
        {/* Header: the frame's "Summary bar · Edit this search". */}
        <Pressable
          onPress={editSearch}
          accessibilityRole="button"
          accessibilityLabel="Edit this search"
          accessibilityHint="Reopens the search screen with these criteria"
          style={[
            {
              minHeight: SUMMARY_HEIGHT,
              backgroundColor: color.surface,
              borderColor: color.line,
              borderWidth: 1,
              borderRadius: radius.card,
              // The 44pt back target sits 4 in (5 with the stroke), the text 4 after it.
              paddingLeft: 4,
              paddingRight: 16,
              gap: 4,
              marginTop: SUMMARY_TOP,
              marginBottom: SUMMARY_BOTTOM,
            },
            isDark ? null : SUMMARY_SHADOW,
          ]}
          className="flex flex-row items-center w-full"
        >
          <BackButton onPress={() => navigation.goBack()} />

          <View style={{ flex: 1 }}>
            <Text fontSize="text-md" fontWeight="font-semibold" numberOfLines={1}>
              {headerLabel}
            </Text>
            <Text fontSize="text-xs" tone="dim" numberOfLines={1}>
              {`${hasDates ? `${formatDate(range.startDate)} - ${formatDate(range.endDate)}` : "Any dates"}  ·  ${
                address || "Anywhere"
              }`}
            </Text>
          </View>
        </Pressable>

        {/* C-12 v3 moved the filter control out of the search pill into the
            Filters / Sort / Dates bar, under the category rail (ENG-78). Every
            block from here to the grid is 16 apart. */}
        <View style={{ gap: BLOCK_GAP, marginBottom: BLOCK_GAP }}>
        {railParent && (
          <CategoryRail
            // The API's own titles, as the landing's header and tiles use
            // and the frame draws ("Fitness & Sports ›", "Tennis").
            parentLabel={railParent.title}
            onOpenParent={
              railParent.slug
                ? () => openLanding(railParent.slug!, railParent.title)
                : undefined
            }
            items={railParent.subcategories.map((sub) => ({
              key: sub.title,
              label: sub.title,
            }))}
            selectedKey={filters.subCategory ?? ""}
            onSelect={selectRailSubCategory}
          />
        )}
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
          onDates={() => setDatesOpen(true)}
          deliver={
            deliveryAddress.state === "ready" || deliveryAddress.state === "none"
              ? { on: filterOn, onPress: onDeliversToMe }
              : undefined
          }
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

        {/* ENG-284 D12: whose address the cards answer for, and the way to change it. */}
        {addressRow ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`${addressRow.text}. ${addressRow.action}`}
            activeOpacity={0.6}
            onPress={onAddressRow}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              minHeight: MIN_TOUCH_TARGET,
              paddingVertical: 12,
              paddingHorizontal: 16,
              borderRadius: radius.input,
              backgroundColor: color.surfaceMuted,
            }}
          >
            <MapPinIcon size={20} strokeWidth={1.5} color={color.textDim} />
            <Text fontSize="text-sm" tone="body" numberOfLines={1} style={{ flex: 1 }}>
              {addressRow.text}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
              <Text fontSize="text-sm" fontWeight="font-semibold" tone="brand">
                {addressRow.action}
              </Text>
              <ChevronRightIcon size={16} strokeWidth={1.5} color={color.brandText} />
            </View>
          </TouchableOpacity>
        ) : null}
        {addressSearchFailed ? (
          // Retry is its own button: a pressable span inside text is out of a
          // screen reader's reach and only as tall as its letters.
          <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: 4 }}>
            <Text fontSize="text-sm" tone="warning" accessibilityRole="alert">
              We couldn't update these results for this address.
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => void searchForAddress()}
              style={{ minHeight: MIN_TOUCH_TARGET, justifyContent: "center" }}
            >
              <Text fontSize="text-sm" fontWeight="font-bold" tone="brand">
                Retry
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Results */}
        <View
          style={[
            {
              flexDirection: "row",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 8,
            },
            LINK_TARGET,
          ]}
        >
          {filterOn && !(isLoading && products.length === 0) ? (
            // Two lines, as drawn: the count, then "N more for self pickup" as its own button.
            <View style={[{ flexShrink: 1 }, LINK_TARGET]}>
              <Text accessibilityRole="header" fontSize="text-sm" fontWeight="font-semibold">
                {deliverCountLine(split.deliver.length, split.pickup.length).shown}
              </Text>
              {split.pickup.length > 0 ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityHint="Shows self pickup too"
                  onPress={() => setDeliversToMe(false)}
                  style={[{ alignSelf: "flex-start" }, LINK_TARGET]}
                >
                  <Text fontSize="text-sm" fontWeight="font-semibold" tone="brand">
                    {deliverCountLine(split.deliver.length, split.pickup.length).more}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : (
            <Text
              accessibilityRole="header"
              fontSize="text-sm"
              fontWeight="font-semibold"
            >
              {isLoading && products.length === 0
                ? "Searching…"
                : pluralize(products.length, "result")}
            </Text>
          )}

          {isFilterActive() && (
            <TouchableOpacity accessibilityRole="button" onPress={clearFiltersAndSearch} style={LINK_TARGET}>
              <Text fontSize="text-sm" fontWeight="font-semibold" tone="brand">
                Clear filters
              </Text>
            </TouchableOpacity>
          )}
        </View>
        </View>

        {/* Products Grid */}

        <FlatList
          style={{ width: "100%" }}
          data={shown}
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
              plans={item.plans}
              width={cardWidth}
              isFavorite={favorites.some((fav) => fav.name === item.name)}
              tile
              // "How far away is it?" is the first question in peer-to-peer
              // rental, and the results grid was the one place it was missing.
              coordinates={item.coordinates}
              specFilters={specFilters}
              // The searched dates ride along, so Book now starts on them (ENG-172).
              dates={searchedDays(range)}
              businessVerified={item.owner?.business_verified}
              deliveryFacts={item}
            />
          )}
          // Searching and finding nothing are the same slot, so the skeleton
          // can cross-fade into whichever one arrives. The list itself stays
          // mounted, which keeps it the thing that owns scrolling.
          ListEmptyComponent={
            <CrossFade loading={isLoading} placeholder={<ResultsSkeleton width={cardWidth} />}>
              {filterOn && products.length > 0 && deliverTo ? (
                // Filter on and nobody delivers: say so, and show self pickup.
                // "Try another address" went in 2.1 (REVIEW, beyond the current
                // app): the address row's Change above does that.
                <View style={EMPTY_WRAP}>
                  <EmptyState
                    icon={<TruckIcon size={32} color={color.text} />}
                    title={nobodyDelivers(deliverTo).title}
                    body={nobodyDelivers(deliverTo).body ?? undefined}
                    actionLabel="Show self pickup too"
                    onAction={() => setDeliversToMe(false)}
                  />
                </View>
              ) : (
              <View>
                <View style={[EMPTY_WRAP, { marginBottom: BLOCK_GAP }]}>
                <EmptyState
                  icon={<MagnifyingGlassIcon size={32} color={color.text} />}
                  title="No matches"
                  body={
                    isFilterActive()
                      ? "Try widening your dates, price or location."
                      : "Try a broader word, or browse a category from Home."
                  }
                  actionLabel={isFilterActive() ? "Clear filters" : undefined}
                  onAction={isFilterActive() ? clearFiltersAndSearch : undefined}
                />
                </View>
                <Disclaimer mb={24} />
              </View>
              )}
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
        snapPoints={[filterSheetHeight(activeTab)]}
        isDark={isDark}
        scrollView={false}
      >
        <StyledBottomView className="w-full flex flex-col justify-between flex-1 ">
          <View className="flex-1 w-full ">
            <SheetHeader title="Filters" grabber={false} onClose={() => bottomSheetRef.current?.dismiss()} />
            {/* 2089:34679: a 38pt strip of tabs 20 apart from the gutter, the
                chosen one brand SemiBold over a 2pt underline, and a hairline. */}
            <View style={{ borderBottomWidth: 1, borderBottomColor: color.line }}>
              <ScrollView
                showsHorizontalScrollIndicator={false}
                horizontal={true}
                contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, gap: 20 }}
              >
                {tabs.map((tab) => {
                  const active = activeTab === tab;
                  return (
                    <TouchableOpacity
                      key={tab}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: active }}
                      onPress={() => setSelectedTab(tab)}
                      style={{ paddingTop: 8, gap: 8 }}
                    >
                      <Text
                        fontSize="text-sm"
                        fontWeight={active ? "font-semibold" : "font-medium"}
                        style={{ color: active ? color.brandText : color.textBody }}
                      >
                        {tab}
                        {tabHasValue(tab, filters) ? " •" : ""}
                      </Text>
                      <View style={{ height: 2, backgroundColor: active ? color.brand : "transparent" }} />
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
            <View className="flex-1">
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
              {activeTab === "Seller" && (
                <SellerFilter
                  verifiedOnly={filters.verifiedBusiness}
                  onToggle={handleVerifiedToggle}
                />
              )}
            </View>
          </View>

          {/* One persistent footer (the kit Sheet footer): "Show N results" with
              Reset under it. Each tab used to render its own "Show products"
              button, and only once something had been selected, so a sheet you
              had just opened had no action and a filter could not be cleared. */}
          <SheetFooter
            primary={{
              label: isLoading
                ? "Loading"
                : pendingCount == null
                ? // Counting. A number we know is out of date is worse than
                  // no number at all.
                  "Show results"
                : `Show ${pluralize(pendingCount, "result")}`,
              loading: isLoading,
              onPress: closeSheet,
            }}
            secondary={{ label: "Reset", disabled: !isFilterActive(), onPress: clearFiltersAndSearch }}
          />
        </StyledBottomView>
      </CustomBottomSheetModal>

      <AddressPickerSheet
        ref={addressSheet}
        savedOnly
        title="Where should we deliver?"
        description="We’ll show who delivers there and what it costs."
        selected={
          deliverTo
            ? {
                lat: deliverTo.coordinates.lat,
                long: deliverTo.coordinates.long,
                fullAddress: flatAndLandmark(deliverTo),
              }
            : undefined
        }
        onPick={(picked) => {
          if (picked.saved) deliveryAddress.choose(picked.saved);
        }}
      />

      {datesOpen && (
        <DateRangePicker
          startDate={range.startDate ? new Date(range.startDate) : undefined}
          endDate={range.endDate ? new Date(range.endDate) : undefined}
          onConfirm={confirmDates}
          onCancel={() => setDatesOpen(false)}
          maxDaysAhead={BOOKING_DAYS_AHEAD}
        />
      )}
    </NonScrollableContainer>
  );
}
