import { useChat } from "@/backend/chat";
import { useProduct } from "@/backend/product";
import { useProfile } from "@/backend/profile";
import useSaved from "@/backend/useSaved";
import { useCart } from "@/backend/cart";
import { CartButton, RequestedLine } from "@/components/cart/parts";
import {
  BackButton,
  BottomBar,
  Button,
  Card,
  CrossFade,
  Text,
} from "@/components/core";
import { BookingFacts } from "@/components/booking/booking-facts";
import { DetailSection } from "@/components/product/detail-section";
import { ExpandableText } from "@/components/product/expandable-text";
import { ModerationBanner } from "@/components/product/moderation-banner";
import { HeldChange, ListingStatusPill } from "@/components/product/listing-status";
import { PendingEdit, readPendingEdit } from "@/lib/listing-edit";
import { GALLERY_HEIGHT, ProductHero } from "@/components/product/product-hero";
import { SpecStrip } from "@/components/product/spec-strip";
import { ConditionRenderer } from "@/components/core/condition-renderer";
import { ProductMap } from "@/components/product/product-map";
import { AllSpecsSheet, SpecsCard } from "@/components/product/product-specs";
import { AboutOwner } from "@/components/product/product-owner";
import { ReviewCard } from "@/components/product/review-card";
import { Stars } from "@/components/product/stars";
import { useFocusedStatusBar } from "@/components/product/use-focused-status-bar";
import { useGlobalContext } from "@/context/global-context";
import { track } from "@/lib/events";
import {
  BackendProduct,
  BackendReview,
  RootStackParamList,
  RouteProps,
  useTypedNavigation,
} from "@/lib/types";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import {
  useFocusEffect,
  useIsFocused,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SCREEN_GUTTER } from "@/lib/design-tokens";
import { liveCopy, shopNameOf } from "@/lib/booking";
import { apiError } from "@/lib/api-error";
import { addFailure, cartLine, cartSize, rememberSearchDates } from "@/lib/cart";
import { CategoryIcon } from "@/lib/category-icons";
import { CHAT_ENABLED } from "@/lib/config";
import { useDistanceTo } from "@/lib/distance";
import { formatCurrency } from "@/lib/format";
import { aUnitLabel, plansOf, smallestPlan } from "@/lib/plans";
import { FlagReason, ListingStatus, resolveListingStatus, waitsText } from "@/lib/listing-status";
import { getDiscoveryLocationData } from "@/lib/location";
import { keySpecLine, specMatchesFilters } from "@/lib/product-specs";
import { rememberReturnTo } from "@/lib/return-to";
import { useDeliveryAddress } from "@/context/delivery-address";
import { addressTitle } from "@/lib/addresses";
import { useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";
import { IconButton } from "@/components/core/icon-button";
import { EmptyState } from "@/components/core/empty-state";
import React, { useCallback, useEffect, useState } from "react";
import {
  Animated,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import {
  BanknotesIcon,
  InformationCircleIcon,
  LightBulbIcon,
  ShareIcon,
} from "react-native-heroicons/outline";
import { ChevronRightIcon } from "react-native-heroicons/mini";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { ProductsSkeleton } from "./products-skeleton";

/**
 * The rails below the facts row. Both start on the page gutter and run to the
 * screen edge, so the next card is always visibly cut off — which is what
 * makes a rail read as scrollable without a control saying so.
 *
 * The similar-products tile is the Home rails' tile, at the Home rails' width;
 * a second size for the same component is how two surfaces drift apart.
 */
const RAIL_GAP = 16;
const SIMILAR_GAP = 18;
const REVIEW_CARD_WIDTH = 285;

/** The pinned band's own height, below the safe-area inset. */
const BAND_HEIGHT = 56;

/**
 * The distance over which the header band takes over from the hero. The gallery
 * is a fixed 390 below the safe area, so the band fills in only as the gallery's
 * bottom edge reaches it (see `collapseEnd` in the screen).
 */
const COLLAPSE_SPAN = 48;

/** The title block's inset and the gap between its lines (04 2083:15682). */
const TITLE_PAD = 24;
const TITLE_GAP = 8;
/** The share glyph's box (2083:15685). */
const SHARE_SIZE = 24;

/** The three specification icons are 20pt in the design (2083:15706). */
const GLYPH_SIZE = 20;

/**
 * "★★★★☆ 4.0 · 24 reviews" (04 2083:15688): five flush 16pt ink stars, 6 to the
 * score and count at 70%. With no reviews, the words say so: five hollow stars
 * read as zero-out-of-five, which damages exactly the new listings that need help.
 */
function RatingLine({ rating, count, isDark }: { rating?: number | null; count?: number | null; isDark: boolean }) {
  if (!count) {
    return (
      <Text fontSize="text-sm" tone="dim">
        Not yet rated
      </Text>
    );
  }
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <Stars rating={rating ?? 0} isDark={isDark} size={16} tone="ink" gap={0} strokeWidth={1.5} />
      <Text fontSize="text-sm" tone="body">
        {`${(rating ?? 0).toFixed(1)} · ${count} ${count === 1 ? "review" : "reviews"}`}
      </Text>
    </View>
  );
}

/**
 * The condition glyph — the design's lightbulb-with-a-bolt, which is what the
 * app already draws for "Excellent".
 *
 * `ConditionRenderer` knows the three conditions the post flow can set and
 * returns nothing at all for anything else, so a listing carrying an
 * unexpected string left this column with a hole where its icon should be.
 */
function ConditionIcon({
  condition,
  color,
}: {
  condition: string;
  color: string;
}) {
  const known = ["excellent", "good", "bad"].includes(condition.toLowerCase());
  return known ? (
    <ConditionRenderer condition={condition} size={GLYPH_SIZE} color={color} />
  ) : (
    <LightBulbIcon size={GLYPH_SIZE} color={color} strokeWidth={1.5} />
  );
}

/** The dev-only seed a design fixture passes (ENG-429). */
type ProductDesign = { scrollY?: number; open?: "specs" | "photo" };

export default function DetailsScreen() {
  const [loading, setLoading] = React.useState(true);
  const route = useRoute<RouteProps<"ProductDetail">>();
  const { isAuthenticated, userDetails } = useGlobalContext();
  const navigation = useTypedNavigation();
  const { fetchProduct, fetchSimilarProducts, fetchReviews } = useProduct();
  const { getMyProductDetails } = useProfile();
  const [product, setProduct] = useState<BackendProduct | null>(null);
  const [similarProducts, setSimilarProducts] = useState<BackendProduct[]>([]);
  const [isModerated, setIsModerated] = useState(false);
  const [reviews, setReviews] = useState<BackendReview[]>([]);
  const { id, isFavorite, specFilters, dates, add: addAfterSignIn } = route.params;
  // Dev only (ENG-429, the ENG-428 route-param seed): a design fixture's scroll offset and open sheet or viewer, and the
  // neutral map. Release builds constant-fold `__DEV__`, so the seed is never read there.
  const design = __DEV__ ? (route.params as { design?: ProductDesign } | undefined)?.design : undefined;
  const scrollRef = React.useRef<ScrollView>(null);
  const seededScroll = React.useRef(false);
  const viewportHeight = React.useRef(0);
  const contentHeight = React.useRef(0);
  const allSpecsRef = React.useRef<BottomSheetModal>(null);
  // The root native stack, for its typed `push`; `useTypedNavigation` is the
  // generic navigation prop, which has no `push`.
  const stack =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  // The breadcrumb awaits a location lookup before it pushes; a second tap in
  // that window would push the results twice.
  const openingSubCategory = React.useRef(false);
  const { startChat } = useChat();
  const [startingChat, setStartingChat] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  // One resolved theme for the whole screen. It used to read `theme === "dark"`
  // from the global context in some places and `useTheme()` in others.
  const { color, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  // The hero is the safe-area inset plus the 390 gallery; the band (inset +
  // BAND_HEIGHT tall) is fully in once the gallery's bottom edge reaches it.
  const collapseEnd = GALLERY_HEIGHT - BAND_HEIGHT;
  const scrollY = React.useRef(new Animated.Value(0)).current;
  // True once the pinned band, not the hero, owns the top of the screen. It is
  // what decides which of the two back controls takes a tap.
  const [heroCovered, setHeroCovered] = useState(false);
  // Only the owner-facing endpoint knows what state a listing is in, so this
  // is fetched separately and only for the owner.
  const [ownerStatus, setOwnerStatus] = useState<{
    status: ListingStatus;
    reasons: FlagReason[];
    pending: PendingEdit | null;
    waits: string | null;
  } | null>(null);
  const distanceLabel = useDistanceTo(product?.coordinates);
  // ENG-284: the product answers whether its shop delivers to the session's
  // address; every focus refetches, so a change made on BK-02 is followed.
  const { address: deliveryAddress } = useDeliveryAddress();
  const deliveryAddressRef = React.useRef(deliveryAddress);
  deliveryAddressRef.current = deliveryAddress;
  /** The address `product.delivery` answers for; another one's answer is not shown under this name. */
  const [deliveryFor, setDeliveryFor] = useState<number | null>(null);
  const focused = useIsFocused();
  const deliveryId = deliveryAddress?.id ?? null;
  // The addresses can arrive after the first fetch (a cold start on this
  // page): ask again for the delivery answer, quietly, without the skeleton.
  useEffect(() => {
    if (!focused || !product || deliveryFor === deliveryId) return;
    let live = true;
    fetchProduct(id, deliveryId)
      .then((data) => {
        if (!live) return;
        setProduct(data);
        setDeliveryFor(deliveryId);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused, deliveryId, product?.name, deliveryFor]);
  // The similar-products rail draws the Home tile, whose heart has to start in
  // the right state. One shared, cached query — the same one every
  // `FavouriteButton` on the page already subscribes to.
  const { favorites } = useSaved();

  /**
   * The theme's own glyphs, at every offset: the photo starts below the status
   * bar, so the bar always sits on the canvas or the header band.
   */
  useFocusedStatusBar(isDark ? "light-content" : "dark-content");

  const bandProgress = scrollY.interpolate({
    inputRange: [collapseEnd - COLLAPSE_SPAN, collapseEnd],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  // The title comes in only once the band is nearly filled in behind it (test run D-15): at half way it was half-visible
  // over the gallery. The band still fades as before.
  const titleProgress = bandProgress.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [0, 0, 1],
  });

  /**
   * The share affordance in the title row was a TouchableOpacity with no
   * onPress at all — a dead control that looked alive, on the growth loop that
   * matters most to a marketplace.
   */
  const handleShare = async () => {
    if (!product) return;
    const plan = smallestPlan(plansOf(product));
    const line = plan ? `${product.title} — ${aUnitLabel(plan)} on Renit` : `${product.title} on Renit`;
    try {
      await Share.share({ message: line, title: product.title });
    } catch {
      toast.error("Couldn’t open the share sheet");
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchProductDetails();
    } finally {
      setRefreshing(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      fetchProductDetails();
    }, [id])
  );

  // The specs sheet is presented in a portal above the navigator: it closes with the screen's focus, so it never
  // stays over the next screen (a deep link or a notification opened from it).
  useFocusEffect(
    useCallback(() => () => allSpecsRef.current?.dismiss(), [])
  );

  async function fetchProductDetails() {
    setLoading(true);
    setLoadError(false);
    try {
      // The ref, not this render's value: the focus callback that calls this
      // was made on the first render, and the address may have changed on
      // BK-02 since (ENG-284 D12).
      const forAddress = deliveryAddressRef.current?.id ?? null;
      const data = await fetchProduct(id, forAddress);
      setProduct(data);
      setDeliveryFor(forAddress);
      const similarProducts = await fetchSimilarProducts(id);
      const reviews = await fetchReviews(id);
      setSimilarProducts(similarProducts);
      setReviews(reviews);
      setIsModerated(data?.moderation_labels?.length > 0);
      await loadOwnerStatus(data);
    } catch (error: any) {
      // Swallowing this left the screen showing the "not available" state for a
      // listing that exists, with nothing saying the request failed.
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  /**
   * The public listing payload carries no status, so an owner looking at their
   * own listing could not tell whether renters could see it. Failure here is
   * silent: the status is additive and must not take the page down.
   */
  async function loadOwnerStatus(data: BackendProduct | null) {
    if (!data || !userDetails?.username) return;
    if (data.owner?.username !== userDetails.username) {
      setOwnerStatus(null);
      return;
    }
    try {
      const owned = await getMyProductDetails(data.name);
      const status = resolveListingStatus(owned?.status);
      setOwnerStatus(status ? { status, reasons: owned?.flag_reasons ?? [], pending: readPendingEdit(owned?.pending_edit), waits: waitsText(owned?.waits_for_text) } : null);
    } catch {
      setOwnerStatus(null);
    }
  }

  const handleEditClick = () => {
    if (!product?.name) return;
    navigation.navigate("editProduct", { id: product.name });
  };

  const isOwner = userDetails?.username === product?.owner?.username;

  // The cart (cart plan §3.1). Add to cart shows only for a shop that takes cart
  // lines now (`can_add_to_cart`, D28); a 409 `shop_not_ready` takes it away for
  // this visit, as the shop lost that since the page loaded.
  const { cart, query: cartQuery, add } = useCart();
  const [cartRefused, setCartRefused] = useState(false);
  const [adding, setAdding] = useState(false);
  // The bar's height, so the cart's toasts sit just above it instead of over its buttons (FIXES-r1 B1 row 22).
  const [barHeight, setBarHeight] = useState(0);
  const aboveBar = barHeight ? { bottomOffset: barHeight + 8 } : null;
  const inCart = product ? Boolean(cartLine(cart, product.name)) : false;
  const canAdd = Boolean(product?.can_add_to_cart) && !cartRefused && !isOwner;
  /** `cart_opened`: `toast` from a toast's View cart, `product` from the bar's In cart. The band's bag sends its own. */
  const openCart = (from: "product" | "toast") => {
    track("cart_opened", { from });
    navigation.navigate("Cart");
  };

  // Dev seed: the scroll offset, once everything has loaded and laid out, so the band follows the real scroll value. A
  // seed past the end (a crop of the page's end on a taller screen) stops at the end, as a hard swipe would.
  useEffect(() => {
    const y = design?.scrollY;
    if (!y || seededScroll.current || loading || !product) return;
    const timer = setTimeout(() => {
      const end = Math.max(0, contentHeight.current - viewportHeight.current);
      const to = Math.min(y, end);
      seededScroll.current = true;
      scrollRef.current?.scrollTo({ y: to, animated: false });
      setHeroCovered(to > collapseEnd - 12);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [design?.scrollY, loading, product?.name]);

  // Dev seed: the specifications sheet open (04 2083:16201), once the page and its sheet are mounted.
  useEffect(() => {
    if (design?.open !== "specs" || !product?.specs?.length) return;
    const timer = setTimeout(() => allSpecsRef.current?.present(), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [design?.open, product?.name]);

  // Checkout starts on the dates of the search when nothing was booked yet (D5).
  useEffect(() => {
    rememberSearchDates(dates);
  }, [dates?.first_day, dates?.last_day]);

  /** The add itself, signed in. The cart changes at once and goes back if rn-api refuses (`useCart`). */
  const addToCart = async () => {
    if (!product?.owner) return;
    const shop = {
      key: product.owner.username,
      name: shopNameOf(product),
      locality: product.shop?.locality ?? "",
      delivers: Boolean(product.shop?.delivers),
      verified: Boolean(product.owner.business_verified),
    };
    setAdding(true);
    try {
      const answer = await add({
        product: {
          name: product.name,
          title: product.title,
          cover_image: product.cover_image ?? null,
          rate: product.rate ?? null,
          deposit: product.security_deposit ?? "0",
        },
        shop,
      });
      // "Not booked yet": adding holds nothing (FIXES-r1 B1 row 9).
      toast.success("Added to cart", {
        ...aboveBar,
        message: `${cartSize(answer)} · not booked yet`,
        action: { label: "View cart", onPress: () => openCart("toast") },
      });
    } catch (error) {
      const failure = addFailure(apiError(error), shop.name);
      if (failure.refused) setCartRefused(true);
      toast[failure.severity](failure.title, {
        ...aboveBar,
        message: failure.message,
        action:
          failure.action === "retry"
            ? { label: "Retry", onPress: () => void addToCart() }
            : failure.action === "view_cart"
              ? { label: "View cart", onPress: () => openCart("toast") }
              : undefined,
      });
    } finally {
      setAdding(false);
    }
  };

  /**
   * Add to cart. Signed out, the customer signs in first, as for Book now and
   * the heart (D3); coming back, the page adds it (below). Only that sign-in
   * adds: `add` rides on the return-to target, not on a later sign-in.
   */
  const handleAdd = () => {
    if (!product || adding) return;
    if (!isAuthenticated) {
      rememberReturnTo({ name: "ProductDetail", params: { id: product.name, dates, add: true } });
      // Not raised above the bar: it shows over Welcome, which has none.
      toast.info("Sign in to add to cart", { message: "You'll come back to this listing and it will be added." });
      navigation.navigate("Welcome");
      return;
    }
    track("product_cta_tapped", { product: product.name, cta: "add_to_cart" });
    void addToCart();
  };

  // Back from the sign-in Add to cart asked for: add once, then forget it. The
  // cart is read first, so an item already in it is not added (or toasted) again.
  useEffect(() => {
    if (!addAfterSignIn || !product || !isAuthenticated || !cartQuery.isFetched) return;
    navigation.setParams({ add: undefined } as never);
    if (canAdd && !inCart) void addToCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addAfterSignIn, product?.name, isAuthenticated, cartQuery.isFetched]);

  // Once per visit, not per focus: coming back from the dates is the same visit. Only
  // signed in, as rn-api takes no events from a signed-out phone (cart plan D50).
  const viewed = React.useRef<string | null>(null);
  useEffect(() => {
    if (!product || isOwner || !isAuthenticated || viewed.current === product.name) return;
    viewed.current = product.name;
    track("product_viewed", { product: product.name });
  }, [product, isOwner, isAuthenticated]);

  // Whether the owner is asked now, at their next opening, or cannot be booked.
  const booking = product ? liveCopy(product) : null;
  // The cart's bar (CT-01) once the item can go in a cart or is in one; else BK-01's bar as it was.
  const cartBar = !isOwner && (canAdd || inCart);
  const barPlan = product ? smallestPlan(plansOf(product)) : null;

  /**
   * Book now opens the dates (BK-02), on the dates of the search when there was
   * one. Signed out, the customer is sent to sign in first: the booking, its
   * payment and the saved address all belong to an account. Signing in brings
   * them back to this listing with the same dates (`goAfterSignIn`).
   */
  const handleBook = () => {
    if (!product) return;
    if (isAuthenticated) track("product_cta_tapped", { product: product.name, cta: "book_now" });
    if (!isAuthenticated) {
      rememberReturnTo({ name: "ProductDetail", params: { id: product.name, dates } });
      toast.info("Sign in to book", { message: "You'll come back to this listing." });
      navigation.navigate("Welcome");
      return;
    }
    navigation.navigate("BookingDates", { product: product.name, ...dates });
  };

  const handleStartChat = async () => {
    if (startingChat) {
      return;
    }
    if (!isAuthenticated) {
      toast.info("Sign in to message owners", {
        message: "It takes a moment and keeps your conversations in one place.",
      });
      return;
    }
    setStartingChat(true);
    try {

      const { success, content } = await startChat(
        {
          userId: userDetails?.username!,
          firebaseUid: userDetails?.firebase_uid!,
          username: userDetails?.name!,
          profilePicture: userDetails?.image
            ? userDetails?.image
            : "",
        },
        {
          userId: product?.owner?.username!,
          firebaseUid: product?.owner?.firebase_uid!,
          username:
            product?.owner?.first_name! + " " + product?.owner?.last_name!,
          profilePicture: product?.owner?.image?.image_url
            ? product?.owner?.image?.image_url
            : "",
        },
        {
          title: product?.title!,
          location: product?.location!,
          image: product?.cover_image!,
          rate: product?.rate!,
          type: "product",
          text: "",
          id: product?.name ?? '',
        }
      );

      if (success) {
        navigation.navigate("ChatDetails", { id: content });
      }
    } catch (error) {
      console.error("Unable to start chat:", error);
      toast.error("Couldn’t start the chat", {
        message: "Check your connection and try again.",
      });
    } finally {
      setStartingChat(false);
    }
  };

  const lessReviews = reviews.slice(0, 4);

  // Older API responses carry no specs; they render as a listing without any.
  const specs = product?.specs ?? [];
  const keySpecs = product ? keySpecLine(product.title, specs) : "";
  // Only said when a value on the page really matched, so a filter this
  // listing carries no spec for cannot make the line claim otherwise.
  const specMatched = specs.some((spec) => specMatchesFilters(spec, specFilters));
  const subCategory = product?.category?.parent?.title
    ? { parent: product.category.parent.title, child: product.category.title }
    : null;

  /**
   * The breadcrumb opens that sub-category's results. Pushed, not navigated: a
   * renter who came here from results has a SearchResults screen below, and
   * `navigate` would pop back to it with its old filters still applied.
   */
  const openSubCategory = async () => {
    if (!subCategory || openingSubCategory.current) return;
    openingSubCategory.current = true;
    try {
      const locationData = await getDiscoveryLocationData();
      stack.push("SearchResults", {
        category: subCategory.parent,
        subCategory: subCategory.child,
        selectedItem: subCategory.child,
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
    } finally {
      openingSubCategory.current = false;
    }
  };

  /**
   * The rail's cards cannot grow — they are a fixed height so a row of them
   * lines up — so a review that is cut off opens the full list rather than
   * expanding in place. It is also what the "See all" control below does.
   */
  const openAllReviews = () => {
    if (!product) return;
    navigation.navigate("ReviewsScreen", {
      reviews,
      product,
      owner: product.owner!,
    });
  };

  /** The cart's price row and what booking it allows (04 2089:23515), above the kit bar. */
  const priceRow = product ? (
    <>
      <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
          <Text fontWeight="font-bold" fontSize="text-lg" lineHeight={28}>
            {formatCurrency(barPlan?.price ?? product.rate)}
          </Text>
          <Text fontSize="text-sm" tone="body">
            {`/${barPlan?.unit ?? "day"}`}
          </Text>
        </View>
        {Number(product.security_deposit) > 0 ? (
          <Text fontSize="text-sm" tone="body">
            {`Deposit ${formatCurrency(product.security_deposit)}`}
          </Text>
        ) : null}
      </View>
      {booking?.kind === "morning" ? (
        <Text fontSize="text-sm" tone="body">
          {booking.body}
        </Text>
      ) : !booking ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <InformationCircleIcon size={16} color={color.textBody} strokeWidth={1.5} />
          <Text fontSize="text-sm" tone="body" style={{ flex: 1 }}>
            Not taking bookings right now
          </Text>
        </View>
      ) : null}
    </>
  ) : null;

  // D28: the customer already has a live booking of this item.
  const requestedLine =
    product?.requested && !isOwner ? (
      <RequestedLine
        requested={product.requested}
        onView={() => navigation.navigate("Booking", { number: product.requested!.number })}
      />
    ) : null;
  const topBlock =
    requestedLine || cartBar ? (
      <>
        {requestedLine}
        {cartBar ? priceRow : null}
      </>
    ) : null;

  const bookAction = booking
    ? {
        label: booking.button,
        onPress: handleBook,
        accessibilityLabel: booking.button,
        // "Book for the morning" at half width (the cart bar) is 14/20 in the 52 box (2089:23201); beside the
        // summary it has the full 240 and stays 16/24 (2089:22295).
        labelSize: booking.kind === "morning" && cartBar ? ("compact" as const) : undefined,
      }
    : undefined;
  /** The kit bar (REVIEW b3-01): Summary+CTA, Secondary+Primary or Full CTA, as the frames draw each state. */
  const bar: React.ComponentProps<typeof BottomBar> = isOwner
    ? {
        layout: "summary-cta",
        ...summary(),
        primary: { label: "Edit product", onPress: handleEditClick, accessibilityLabel: "Edit product" },
      }
    : cartBar
      ? inCart
        ? {
            layout: "secondary-primary",
            secondary: {
              label: "✓ In cart · View",
              onPress: () => openCart("product"),
              accessibilityLabel: "In your cart. View your cart",
            },
            primary: bookAction,
          }
        : booking
          ? {
              layout: "secondary-primary",
              secondary: { label: "Add to cart", onPress: handleAdd, loading: adding, accessibilityLabel: "Add to cart" },
              primary: bookAction,
            }
          : {
              layout: "full-cta",
              primary: { label: "Add to cart", onPress: handleAdd, loading: adding, accessibilityLabel: "Add to cart" },
            }
      : {
          layout: "summary-cta",
          ...summary(),
          // Neither flag set: the contract says no Book now (2089:22597).
          ...(bookAction ? { primary: bookAction } : { note: "Not taking bookings right now" }),
        };

  /** BK-01's summary: the smallest plan's price over the deposit (ENG-281). */
  function summary() {
    return {
      value: formatCurrency(barPlan?.price ?? product?.rate),
      unit: `/${barPlan?.unit ?? "day"}`,
      subLine: Number(product?.security_deposit) > 0 ? `Deposit ${formatCurrency(product!.security_deposit)}` : undefined,
    };
  }

  // Only the very first load gets a skeleton. A refetch — pull-to-refresh, or
  // the refetch this screen runs every time it regains focus — used to swap the
  // whole screen for the skeleton, which unmounted the scroll view and left it
  // remounted at offset 0 while `heroCovered` still held the value it had
  // before: the collapsed treatment over an uncollapsed hero.
  const showSkeleton = loading && !product;

  if (!product && !showSkeleton) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: color.canvas }}>
        <EmptyState
          variant="error"
          title={
            loadError
              ? "We couldn’t load this listing"
              : "This listing isn’t available"
          }
          body={
            loadError
              ? "Check your connection and try again."
              : "It may have been removed, or the link may be out of date."
          }
          actionLabel={loadError ? "Try again" : "Go back"}
          onAction={loadError ? fetchProductDetails : () => navigation.goBack()}
          secondaryActionLabel={loadError ? "Go back" : undefined}
          onSecondaryAction={loadError ? () => navigation.goBack() : undefined}
        />
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: color.canvas }}>
      {/* The pinned band.
          The design draws no header at all, and the hero's own back control
          scrolls away with it. That would leave the page with no way back for
          most of its length, so the band stays: it fades in exactly as the
          hero's control leaves, carrying the title and a back button. It no
          longer cross-fades two treatments of the same control, because there
          is no longer a photograph under the status bar for one of them to
          float over. */}
      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 4,
        }}
      >
        <Animated.View
          pointerEvents="none"
          style={{
            ...StyleSheet.absoluteFillObject,
            backgroundColor: color.canvas,
            borderBottomWidth: 1,
            borderBottomColor: color.line,
            opacity: bandProgress,
          }}
        />
        <View
          pointerEvents="box-none"
          style={{
            marginTop: insets.top,
            height: BAND_HEIGHT,
            flexDirection: "row",
            alignItems: "center",
            // The kit Top bar · Back+Title (04 2089:23485): the back 16 from the
            // edge, the title 12 after it (x72), the trailing bag on the 16.
            paddingHorizontal: 16,
            gap: 12,
          }}
        >
          {/* Always on screen, plain as the frames draw it (the gallery is on the
              canvas, so it never sits on a photograph). The gallery draws no back
              control of its own, so there is never an offset with no way back. */}
          <BackButton />

          <Animated.View
            pointerEvents="none"
            style={{ flex: 1, opacity: titleProgress }}
          >
            <Text role="sectionTitle" numberOfLines={1}>
              {product?.title ?? ""}
            </Text>
          </Animated.View>

          {/* The cart (D29): signed in, and only once there is a cart to see or
              this item can go in one, so a shop without the cart shows no empty
              bag. Over the gallery it sits left of the hero's heart (x274, 04
              2089:22896); once the band owns the top it is the bar's trailing
              control (x330, 2089:23201). The title is left-aligned, so nothing
              balances it when there is no bag. */}
          {isAuthenticated && ((cart?.count ?? 0) > 0 || canAdd) ? (
            <View style={{ marginRight: heroCovered ? 0 : 56 }}>
              <CartButton from="product" />
            </View>
          ) : null}
        </View>
      </View>

      {/* Animated.ScrollView, not ScrollView: a native-driven Animated.event
          has to be attached to an animated component or the plain one receives
          the event object where it expects a handler. */}
      <Animated.ScrollView
        ref={scrollRef as never}
        className="flex-1"
        onLayout={(event) => {
          viewportHeight.current = event.nativeEvent.layout.height;
        }}
        onContentSizeChange={(_, height) => {
          contentHeight.current = height;
        }}
        contentContainerStyle={{ flexGrow: 1, backgroundColor: color.canvas }}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          {
            useNativeDriver: true,
            listener: (event: any) => {
              const covered =
                event.nativeEvent.contentOffset.y > collapseEnd - 12;
              setHeroCovered((current) =>
                current === covered ? current : covered
              );
            },
          }
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={color.textBody}
            colors={[color.brand]}
          />
        }
      >
        {/* The skeleton used to be swapped for the real screen in a single
            frame, which reads as a flicker rather than as arrival. */}
        <CrossFade loading={showSkeleton} placeholder={<ProductsSkeleton />}>
        {product ? (
        <View>
        <ProductHero
          images={product.images}
          coverImage={product.cover_image}
          productId={id}
          title={product.title}
          isFavorite={isFavorite}
          initialViewerOpen={design?.open === "photo"}
        />

        {isOwner && isModerated && (
          // 04 2089:24420 "Moderation banner wrap": 24 above and at the sides.
          <View style={{ paddingTop: 24, paddingHorizontal: SCREEN_GUTTER }}>
            <ModerationBanner moderationLabels={product?.moderation_labels!} />
          </View>
        )}

        {/* The title block (04 2083:15682): 24 all round, 8 between its lines.
            It carries the page's one heading, the rating and the share
            affordance, and, for the owner, the listing's status. */}
        <View style={{ padding: TITLE_PAD, gap: TITLE_GAP }}>
          <View style={{ flexDirection: "row", gap: 16 }}>
            <Text
              fontSize="text-lg"
              fontWeight="font-bold"
              style={{ flex: 1 }}
              // No line cap: the frame's title box hugs its text, and a listing's
              // full name is not shown anywhere else on the page (the pinned band
              // truncates it), so cutting it here would lose it.
            >
              {product?.title}
            </Text>
            {/* A bare 24 glyph, top-aligned on the title; `IconButton` makes it
                up to a 44pt target in hitSlop. */}
            <IconButton
              onPress={handleShare}
              size={SHARE_SIZE}
              style={{ alignSelf: "flex-start" }}
              accessibilityLabel={`Share ${product?.title ?? "this listing"}`}
              accessibilityHint="Opens the system share sheet"
            >
              <ShareIcon color={color.text} size={SHARE_SIZE} strokeWidth={1.5} />
            </IconButton>
          </View>

          {/* Only main specs the title does not already say, so the line is
              never the title again; absent when there are none left. */}
          {keySpecs ? (
            <Text fontSize="text-sm" tone="body">
              {keySpecs}
            </Text>
          ) : null}

          <RatingLine rating={product?.average_rating} count={product?.review_count} isDark={isDark} />

          {/* Your own listing said nothing about whether renters could see
              it. "Live" is a fact the owner needs stated, not inferred. */}
          {isOwner && ownerStatus ? (
            <ListingStatusPill
              status={ownerStatus.status}
              reasons={ownerStatus.reasons}
              waitsText={ownerStatus.waits}
              withDetail
            />
          ) : null}
          {isOwner && ownerStatus?.pending ? <HeldChange pending={ownerStatus.pending} /> : null}

          {/* Shown with or without specs: "more like this" is useful either
              way. 24 high with 4 above the label (2083:15701); the hitSlop
              makes the target up to 44. */}
          {subCategory ? (
            <TouchableOpacity
              onPress={openSubCategory}
              accessibilityRole="button"
              accessibilityLabel={`${subCategory.parent}, ${subCategory.child}`}
              accessibilityHint={`Shows more listings in ${subCategory.child}`}
              hitSlop={{ top: 10, bottom: 10, left: 0, right: 12 }}
              style={{
                alignSelf: "flex-start",
                flexDirection: "row",
                alignItems: "center",
                paddingTop: 4,
                gap: 2,
              }}
            >
              {/* Shrinks and wraps rather than pushing the chevron out of
                  the row on a 360pt screen. */}
              <Text
                fontSize="text-sm"
                fontWeight="font-semibold"
                tone="brand"
                numberOfLines={2}
                style={{ flexShrink: 1 }}
              >
                {`${subCategory.parent} › ${subCategory.child}`}
              </Text>
              <ChevronRightIcon size={16} color={color.brandText} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Specifications. The design's three-up strip; see spec-strip.tsx for
            why this layout replaced the label-led rows that were here. */}
        <SpecStrip
          variant="detail"
          items={[
            {
              // The bundled glyph for the category, not the per-theme icon URL
              // the API ships. That URL is frequently absent, which is how the
              // strip came to read as two icons and one bare word — and a
              // remote round trip for a 20pt monochrome mark is not worth it.
              icon: product?.category?.title ? (
                <CategoryIcon
                  name={product.category.title}
                  size={GLYPH_SIZE}
                  color={color.text}
                  strokeWidth={1.5}
                />
              ) : null,
              value: product?.category?.title,
              label: "Category",
            },
            {
              icon: <BanknotesIcon color={color.text} size={GLYPH_SIZE} />,
              value: product?.security_deposit
                ? formatCurrency(product.security_deposit)
                : null,
              label: "Deposit",
            },
            {
              icon: product?.condition ? (
                <ConditionIcon
                  condition={product.condition}
                  color={color.text}
                />
              ) : null,
              value: product?.condition
                ? product.condition[0].toUpperCase() + product.condition.slice(1)
                : null,
              label: "Condition",
            },
          ]}
        />

        {/* BK-01: "Live booking", how the item changes hands and the handover
            hours, between the facts strip and the long sections (ENG-172). */}
        {/* Its own 24/32 padding; the hairline under it is the frame's Divider. */}
        <View style={{ borderBottomWidth: 1, borderBottomColor: color.line }}>
          <BookingFacts
            copy={booking}
            shop={product.shop}
            notDelivered={product.not_delivered}
            delivery={deliveryFor === deliveryId ? product.delivery : null}
            addressName={deliveryAddress ? addressTitle(deliveryAddress) : null}
            deliveryFrom={product.delivery_from}
            rate={product.rate}
            plans={product.plans}
            monthlyBilling={product.monthly_billing}
            deposit={product.security_deposit}
          />
        </View>

        {/* Straight after the strip, where a renter decides (ENG-35); absent,
            dividers and all, when the listing has no specs (PDP-04b). */}
        {specs.length > 0 ? (
          <DetailSection
            title="Specifications"
            meta={
              specMatched ? (
                <Text
                  fontSize="text-sm"
                  fontWeight="font-bold"
                  tone="brand"
                  accessibilityLabel="Matches your filters"
                >
                  ✓ Matches your filters
                </Text>
              ) : null
            }
          >
            <SpecsCard
              specs={specs}
              specFilters={specFilters}
              onSeeAll={() => allSpecsRef.current?.present()}
            />
          </DetailSection>
        ) : null}

        {/* The frame's headings, which name the thing rather than the field:
            "About the product", not "Description". */}
        <DetailSection title="About the product">
          {/* 16/24 at 70%, three lines, then the brand "Show more" (2083:15794). */}
          <ExpandableText text={product?.description ?? ""} tone="body" />
        </DetailSection>

        <DetailSection title="Product’s location">
          {/* The map was a city-scale tile with an unlabelled blue dot: no
              address, no neighbourhood, and no distance. The place name and
              the distance now ride in the card's own caption — the frame's
              block is the heading and the card, with no line between them. */}
          <ProductMap
            variant="detail"
            latitude={product?.coordinates?.lat!}
            longitude={product?.coordinates?.long!}
            isDarkMode={isDark}
            placeName={product?.location}
            distanceLabel={distanceLabel}
            placeholder={Boolean(design)}
          />
          {/* Not in the frame, kept on purpose: the ring marker says "somewhere
              near here" but not that the address is withheld, and that promise
              is what makes a renter comfortable sharing a home location. It
              adds one 14pt line (~21pt) to the frame's 304pt block. */}
          <Text fontSize="text-sm" tone="body">
            Exact address shared once a booking is agreed
          </Text>
        </DetailSection>

        <DetailSection title="Product reviews" inset={false}>
          {/* The score sits under the heading at the block's own 12 (2083:15820). */}
          <View style={{ paddingHorizontal: SCREEN_GUTTER }}>
            {product?.review_count ? (
              <RatingLine rating={product?.average_rating} count={product?.review_count} isDark={isDark} />
            ) : (
              <Text fontSize="text-sm" tone="dim">
                No reviews yet — be the first to rent it.
              </Text>
            )}
          </View>
          {lessReviews.length > 0 ? (
            <ScrollView
              horizontal
              nestedScrollEnabled
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: SCREEN_GUTTER,
                gap: RAIL_GAP,
              }}
            >
              {lessReviews.map((item) => (
                <View key={item.user.username} style={{ width: REVIEW_CARD_WIDTH }}>
                  <ReviewCard
                    variant="detail"
                    reviewText={item.comment}
                    reviewerName={`${item.user.first_name} ${item.user.last_name}`}
                    reviewDate={item.created_at}
                    reviewerImage={item.user?.image?.image_url}
                    onShowMore={openAllReviews}
                  />
                </View>
              ))}
            </ScrollView>
          ) : null}

          {/* Not in the frame, which has no way out of the rail at all. A
              review that is short enough to fit shows no "Show more", so
              without this there are listings whose later reviews cannot be
              reached. It only exists when there is something to show. */}
          {reviews.length > 0 ? (
            <View style={{ paddingHorizontal: SCREEN_GUTTER }}>
              {/* 2083:15854 draws ENG-427's neutral outline (white, #E6E6E6, black
                  label); until that tone lands this is the kit outline. */}
              <Button onPress={openAllReviews} variant="outline" size="compact">
                {`See all ${reviews.length} ${reviews.length === 1 ? "review" : "reviews"}`}
              </Button>
            </View>
          ) : isAuthenticated && userDetails && !isOwner && product && !product.review_count ? (
            // ENG-342: with no reviews there is no "See all", and that list was
            // the only way into the form, so the first review had no way in.
            // The API still decides who may write one (`not_rented`).
            // `review_count`, not only `reviews`: the list loads after the
            // product, and a listing with reviews must not flash this first.
            // `userDetails`: until it loads, the owner would not read as one.
            <View style={{ paddingHorizontal: SCREEN_GUTTER }}>
              <Button
                onPress={() =>
                  navigation.navigate("WriteReviews", { product, owner: product.owner! })
                }
                variant="outline"
                size="compact"
              >
                Write a review
              </Button>
            </View>
          ) : null}
        </DetailSection>

        {/* The last block on the page rules no line under itself: the bottom
            bar's own top border would sit right beneath it. */}
        <DetailSection
          title="About the owner"
          divider={similarProducts.length > 0}
        >
          <AboutOwner
            variant="detail"
            id={product?.owner?.username!}
            name={`${product?.owner?.first_name} ${product?.owner?.last_name}`}
            profilePic={product?.owner?.image?.image_url || ""}
            rating={product?.avg_rating ?? 0}
            products={product?.products_listed ?? 0}
            isDark={isDark}
            businessVerified={product?.owner?.business_verified}
          />
          {/* ENG-352: told only to a business customer (null for anyone else). */}
          {product?.gst_invoice ? (
            <Text fontSize="text-sm" tone="dim">
              GST invoice available
            </Text>
          ) : null}
          {/* Chat is off at launch (ENG-177, decision T-01): the bar's button is
              Book now, and this entry point is not drawn. `handleStartChat` and
              the chat screens are untouched, for the day it is switched back on. */}
          {CHAT_ENABLED && !isOwner ? (
            <Button
              variant="outline"
              onPress={handleStartChat}
              loading={startingChat}
              disabled={startingChat}
              accessibilityLabel="Chat with owner"
            >
              Chat with owner
            </Button>
          ) : null}
        </DetailSection>

        {similarProducts.length > 0 && (
          <DetailSection title="Similar products" inset={false} divider={false}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: SCREEN_GUTTER,
                // The section ends 40 below the rail, 8 more than the block's 32 (2083:15882).
                paddingBottom: 8,
                gap: SIMILAR_GAP,
              }}
            >
              {similarProducts.map((item) => (
                <View
                  key={item.name}
                  // The kit Listing card, 162 wide at 390 with 18 between
                  // (2083:15886), and a 6pt peek of the third card at any width.
                  style={{ width: Math.floor((windowWidth - SCREEN_GUTTER - 2 * SIMILAR_GAP - 6) / 2) }}
                >
                  {/* The Home rails' tile, not a second one: same width, same
                      8pt photo radius, same bare corner heart. */}
                  <Card
                    id={`${item.name}`}
                    image={item.cover_image}
                    title={item.title}
                    location={item.location}
                    price={item.rate}
                    plans={item.plans}
                    coordinates={item.coordinates}
                    isFavorite={favorites.some((fav) => fav.name === item.name)}
                    tile
                  />
                </View>
              ))}
            </ScrollView>
          </DetailSection>
        )}
        </View>
        ) : null}
        </CrossFade>
      </Animated.ScrollView>

      {/* The bottom of the screen: one wrapper, so the cart's toasts are still
          raised above whatever it holds (FIXES-r1 B1 row 22). Above the kit bar
          sits the local block the kit has no slot for: the requested line (D28)
          and, in the cart's bar, the price row (04 2089:23515). That block draws
          the top hairline and the bar drops its own; the bar's 16 top padding
          is the frame's gap under it. */}
      {product ? (
        <View onLayout={(event) => setBarHeight(event.nativeEvent.layout.height)}>
          {topBlock ? (
            <View
              style={{
                borderTopWidth: 1,
                borderTopColor: color.line,
                backgroundColor: color.canvas,
                paddingTop: 16,
                paddingHorizontal: SCREEN_GUTTER,
                gap: 4,
              }}
            >
              {topBlock}
            </View>
          ) : null}
          <BottomBar
            {...bar}
            style={topBlock ? { borderTopWidth: 0 } : undefined}
          />
        </View>
      ) : null}

      {specs.length > 0 ? (
        <AllSpecsSheet
          ref={allSpecsRef}
          specs={specs}
          specFilters={specFilters}
          onClose={() => allSpecsRef.current?.dismiss()}
        />
      ) : null}
    </View>
  );
}
