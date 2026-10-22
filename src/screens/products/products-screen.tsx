import { useChat } from "@/backend/chat";
import { useProduct } from "@/backend/product";
import { useProfile } from "@/backend/profile";
import useSaved from "@/backend/useSaved";
import {
  BackButton,
  Button,
  Card,
  CrossFade,
  Text,
  useButtonLabelColor,
} from "@/components/core";
import { BookingFacts } from "@/components/booking/booking-facts";
import { DetailSection } from "@/components/product/detail-section";
import { ExpandableText } from "@/components/product/expandable-text";
import { ModerationBanner } from "@/components/product/moderation-banner";
import { HeldChange, ListingStatusPill } from "@/components/product/listing-status";
import { PendingEdit, readPendingEdit } from "@/lib/listing-edit";
import { ProductHero } from "@/components/product/product-hero";
import { SpecStrip } from "@/components/product/spec-strip";
import { ConditionRenderer } from "@/components/core/condition-renderer";
import { ProductMap } from "@/components/product/product-map";
import { AllSpecsSheet, SpecsCard } from "@/components/product/product-specs";
import { AboutOwner } from "@/components/product/product-owner";
import { ReviewCard } from "@/components/product/review-card";
import { Stars } from "@/components/product/stars";
import { useFocusedStatusBar } from "@/components/product/use-focused-status-bar";
import { useGlobalContext } from "@/context/global-context";
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
import { MIN_TOUCH_TARGET, SCREEN_GUTTER, radius } from "@/lib/design-tokens";
import { liveCopy } from "@/lib/booking";
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
const REVIEW_CARD_WIDTH = 285;
const SIMILAR_CARD_WIDTH = 163;

/** The pinned band's own height, below the safe-area inset. */
const BAND_HEIGHT = 56;

/**
 * The distance over which the header band takes over from the photo. The photo is
 * a full-width square below the safe area, so the band fills in only as the
 * photo's bottom edge reaches it (see `collapseEnd` in the screen).
 */
const COLLAPSE_SPAN = 48;

/**
 * The title block's inset. The design gives this block far more air than the
 * 26pt the rest of the page uses — it is the one place the page stops.
 */
const TITLE_PAD_V = 32;
/** Title to rating, and title column to share glyph. */
const TITLE_GAP = 12;

/**
 * Every glyph below the hero is 20pt in the design: the share mark, each of
 * the five rating stars, and the three specification icons.
 */
const GLYPH_SIZE = 20;

const CTA_RADIUS = radius.button;

/**
 * 44 tall at rest, so the bar measures the frame's 76. A floor, not a fixed
 * height, so the label can still grow the button at accessibility text sizes.
 */
const CTA_STYLE = {
  minHeight: MIN_TOUCH_TARGET,
  paddingVertical: 0,
  borderRadius: CTA_RADIUS,
} as const;

/**
 * The bar's upward lift: black at 5%, offset 0/-2, blur 16 — a Figma blur is
 * twice a Core Animation radius, so 8. Light only; on dark the top hairline
 * carries the separation on its own, exactly as `shadow.dark` does for cards.
 * The colour is taken from `color.text`, which is black on the only theme that
 * draws this.
 */
const BAR_LIFT = {
  shadowOpacity: 0.05,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: -2 },
  elevation: 12,
} as const;

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

/**
 * The bar's CTA label.
 *
 * The design sets it at 14 Bold; `Button` sets a plain string child at 16. A
 * node child keeps the design's size and still takes the colour the button has
 * already resolved for the state it is in, so the disabled treatment does not
 * have to be re-derived here.
 */
function CtaLabel({ children }: { children: string }) {
  const labelColor = useButtonLabelColor();
  return (
    <Text
      fontSize="text-sm"
      fontWeight="font-bold"
      style={{ color: labelColor }}
    >
      {children}
    </Text>
  );
}

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
  const { id, isFavorite, specFilters, dates } = route.params;
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
  // The hero is the safe-area inset plus a square as wide as the screen; the band
  // (inset + BAND_HEIGHT tall) is fully in once the photo's bottom edge reaches it.
  const collapseEnd = windowWidth - BAND_HEIGHT;
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
  // over the photo and its "1/2" badge. The band and the back control still fade as before.
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

  // Whether the owner is asked now, at their next opening, or cannot be booked.
  const booking = product ? liveCopy(product) : null;
  const barPlan = product ? smallestPlan(plansOf(product)) : null;

  /**
   * Book now opens the dates (BK-02), on the dates of the search when there was
   * one. Signed out, the customer is sent to sign in first: the booking, its
   * payment and the saved address all belong to an account. Signing in brings
   * them back to this listing with the same dates (`goAfterSignIn`).
   */
  const handleBook = () => {
    if (!product) return;
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
            borderBottomWidth: StyleSheet.hairlineWidth,
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
            // The page gutter, so the back control does not slide sideways as
            // the hero's — which sits on that gutter — fades out under it.
            paddingHorizontal: SCREEN_GUTTER,
            gap: 4,
          }}
        >
          {/* Always on screen: it floats over the photo with the scrim, and takes
              the page's own treatment once the band has filled in behind it. The
              photo draws no back control of its own, so there is never an offset
              with no way back. */}
          <BackButton onPhoto={!heroCovered} />

          <Animated.View
            pointerEvents="none"
            style={{ flex: 1, opacity: titleProgress }}
          >
            <Text
              role="sectionTitle"
              numberOfLines={1}
              style={{ textAlign: "center" }}
            >
              {product?.title ?? ""}
            </Text>
          </Animated.View>

          {/* Balances the back control so the title is centred on the screen. */}
          <View style={{ width: MIN_TOUCH_TARGET }} />
        </View>
      </View>

      {/* Animated.ScrollView, not ScrollView: a native-driven Animated.event
          has to be attached to an animated component or the plain one receives
          the event object where it expects a handler. */}
      <Animated.ScrollView
        className="flex-1"
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
        />

        {isOwner && isModerated && (
          <View style={{ paddingHorizontal: SCREEN_GUTTER }}>
            <ModerationBanner moderationLabels={product?.moderation_labels!} />
          </View>
        )}

        {/* The title block. It carries the page's one heading, the rating and
            the share affordance, and nothing else — which is why it is given
            the deepest inset on the page. */}
        <View
          style={{
            paddingTop: TITLE_PAD_V,
            // The breadcrumb's 44pt target already runs ~23pt below its text,
            // so the block gives up that much of its own inset (PDP-01 round 3).
            paddingBottom: subCategory ? TITLE_GAP : TITLE_PAD_V,
            paddingHorizontal: SCREEN_GUTTER,
            flexDirection: "row",
            gap: TITLE_GAP,
          }}
        >
          <View style={{ flex: 1, gap: TITLE_GAP }}>
            {/* H3, not the screen title role: the photograph above is what
                announces the listing, so the name is set to sit under it. */}
            <Text
              fontSize="text-lg"
              fontWeight="font-bold"
              // No line cap: the frame's title box hugs its text, and a listing's
              // full name is not shown anywhere else on the page (the pinned band
              // truncates it), so cutting it here would lose it.
            >
              {product?.title}
            </Text>

            {/* Only main specs the title does not already say, so the line is
                never the title again; absent when there are none left. */}
            {keySpecs ? (
              <Text fontSize="text-md" tone="body">
                {keySpecs}
              </Text>
            ) : null}

            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              {product?.review_count ? (
                <>
                  <Stars
                    rating={product?.average_rating!}
                    isDark={isDark}
                    size={GLYPH_SIZE}
                    tone="ink"
                    gap={0}
                    strokeWidth={1.25}
                  />
                  <Text fontSize="text-sm" tone="dim">
                    ({product?.review_count})
                  </Text>
                </>
              ) : (
                // Five hollow stars read as zero-out-of-five, which damages
                // exactly the new listings that need the help.
                <Text fontSize="text-sm" tone="dim">
                  Not yet rated
                </Text>
              )}
            </View>

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
                way. The label sits at the top of its 44pt target (PDP-01). */}
            {subCategory ? (
              <TouchableOpacity
                onPress={openSubCategory}
                accessibilityRole="button"
                accessibilityLabel={`${subCategory.parent}, ${subCategory.child}`}
                accessibilityHint={`Shows more listings in ${subCategory.child}`}
                style={{
                  minHeight: MIN_TOUCH_TARGET,
                  alignSelf: "flex-start",
                  flexDirection: "row",
                  alignItems: "flex-start",
                  gap: 4,
                }}
              >
                {/* Shrinks and wraps rather than pushing the chevron out of
                    the row on a 360pt screen. */}
                <Text
                  fontSize="text-sm"
                  fontWeight="font-bold"
                  tone="brand"
                  numberOfLines={2}
                  style={{ flexShrink: 1 }}
                >
                  {`${subCategory.parent} › ${subCategory.child}`}
                </Text>
                <ChevronRightIcon size={GLYPH_SIZE} color={color.brandText} />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* A bare glyph, top-aligned on the title. The design drops the
              outlined tile this used to sit in — and with it the iOS
              share-up-box glyph, in favour of the three-node one the rest of
              the design system uses. `IconButton` still makes the 20pt glyph
              up to a 44pt target in hitSlop. */}
          <IconButton
            onPress={handleShare}
            size={GLYPH_SIZE}
            style={{ alignSelf: "flex-start" }}
            accessibilityLabel={`Share ${product?.title ?? "this listing"}`}
            accessibilityHint="Opens the system share sheet"
          >
            <ShareIcon color={color.text} size={GLYPH_SIZE} strokeWidth={1.5} />
          </IconButton>
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
        <View style={{ paddingTop: 24 }}>
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
          <ExpandableText text={product?.description ?? ""} />
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
          />
          {/* Not in the frame, kept on purpose: the ring marker says "somewhere
              near here" but not that the address is withheld, and that promise
              is what makes a renter comfortable sharing a home location. It
              adds one 14pt line (~21pt) to the frame's 304pt block. */}
          <Text fontSize="text-sm" tone="body">
            Exact address shared once a booking is agreed
          </Text>
        </DetailSection>

        <DetailSection
          title="Product reviews"
          inset={false}
          meta={
            // The block already puts its heading stack on the gutter.
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
            >
              {product?.review_count ? (
                <>
                  {/* The score is set at heading size and weight, a step
                      quieter than the heading itself — as are the stars. */}
                  <Text fontWeight="font-bold" fontSize="text-lg" tone="body">
                    {product?.average_rating?.toFixed(1)}
                  </Text>
                  <Stars
                    rating={product?.average_rating!}
                    isDark={isDark}
                    size={GLYPH_SIZE}
                    tone="secondary"
                    gap={0}
                  />
                  <Text fontSize="text-sm" tone="dim">
                    ({product?.review_count})
                  </Text>
                </>
              ) : (
                <Text fontSize="text-sm" tone="dim">
                  No reviews yet — be the first to rent it.
                </Text>
              )}
            </View>
          }
        >
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
              <Button onPress={openAllReviews} variant="outline" size="compact">
                {`See all ${reviews.length} ${reviews.length === 1 ? "review" : "reviews"}`}
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
                gap: RAIL_GAP,
              }}
            >
              {similarProducts.map((item) => (
                <View key={item.name} style={{ width: SIMILAR_CARD_WIDTH }}>
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

      {/*
        The bar was h-[10%] with price and CTA both flex-1, so "₹25 per day"
        occupied half the width and left ~85pt of empty space beside it while
        the primary action was confined to the other half. The price takes the
        room it needs and the CTA takes the rest. The bottom inset is reserved
        here rather than by a SafeAreaView that declared only its top edge,
        which left the button 19pt off the screen edge.
      */}
      {product ? (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          // 16 + a 44pt button + 16 is the frame's 76pt bar.
          gap: 16,
          paddingHorizontal: SCREEN_GUTTER,
          paddingTop: 16,
          paddingBottom: 16 + insets.bottom,
          borderTopWidth: 1,
          borderTopColor: color.line,
          backgroundColor: color.canvas,
          shadowColor: color.text,
          ...(isDark ? null : BAR_LIFT),
        }}
      >
        {/* BK-01's bar: the smallest plan's price over the deposit (ENG-281). */}
        <View>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
            <Text fontWeight="font-bold" fontSize="text-lg">
              {formatCurrency(barPlan?.price ?? product?.rate)}
            </Text>
            <Text fontSize="text-sm" tone="body">
              {`a ${barPlan?.unit ?? "day"}`}
            </Text>
          </View>
          {Number(product?.security_deposit) > 0 ? (
            <Text fontSize="text-xs" tone="body">
              {`Deposit ${formatCurrency(product.security_deposit)}`}
            </Text>
          ) : null}
        </View>

        <View style={{ flex: 1 }}>
          {isOwner ? (
            // The one action in the bar, so it is the primary one. It was an
            // outlined secondary competing against nothing, in the same slot
            // where a visitor gets a filled button.
            <Button
              onPress={handleEditClick}
              style={CTA_STYLE}
              accessibilityLabel="Edit product"
            >
              <CtaLabel>Edit product</CtaLabel>
            </Button>
          ) : booking ? (
            // "Book now", or "Book for the morning" while the shop is closed.
            <Button
              onPress={handleBook}
              style={CTA_STYLE}
              accessibilityLabel={booking.button}
            >
              <CtaLabel>{booking.button}</CtaLabel>
            </Button>
          ) : (
            // Neither flag set: the contract says no Book now.
            <Text fontSize="text-sm" tone="dim" style={{ textAlign: "right" }}>
              Not taking bookings right now
            </Text>
          )}
        </View>
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
