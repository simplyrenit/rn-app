import { useChat } from "@/backend/chat";
import { useProduct } from "@/backend/product";
import { useProfile } from "@/backend/profile";
import {
  BackButton,
  Button,
  Card,
  CrossFade,
  SectionHeader,
  Text,
  useButtonLabelColor,
} from "@/components/core";
import { ModerationBanner } from "@/components/product/moderation-banner";
import {
  ListingStatus,
  ListingStatusPill,
  resolveListingStatus,
} from "@/components/product/listing-status";
import { ProductHero } from "@/components/product/product-hero";
import { SpecStrip } from "@/components/product/spec-strip";
import { ConditionRenderer } from "@/components/core/condition-renderer";
import { ProductMap } from "@/components/product/product-map";
import { AboutOwner } from "@/components/product/product-owner";
import { ReviewCard } from "@/components/product/review-card";
import { Stars } from "@/components/product/stars";
import { useFocusedStatusBar } from "@/components/product/use-focused-status-bar";
import { useGlobalContext } from "@/context/global-context";
import {
  BackendProduct,
  BackendReview,
  RouteProps,
  useTypedNavigation,
} from "@/lib/types";
import { useFocusEffect, useRoute } from "@react-navigation/native";
import { MIN_TOUCH_TARGET, SCREEN_GUTTER } from "@/lib/design-tokens";
import { CategoryIcon } from "@/lib/category-icons";
import { useDistanceTo } from "@/lib/distance";
import { formatCurrency } from "@/lib/format";
import { useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";
import { IconButton } from "@/components/core/icon-button";
import { EmptyState } from "@/components/core/empty-state";
import React, { useCallback, useState } from "react";
import {
  Animated,
  Dimensions,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import {
  BanknotesIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  LightBulbIcon,
  ShareIcon,
} from "react-native-heroicons/outline";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { ProductsSkeleton } from "./products-skeleton";

const MAX_CHARS = 150;

// A review card is wide enough to peek the next one, which is what makes a
// horizontal rail read as scrollable.
const itemWidth = Dimensions.get("window").width - SCREEN_GUTTER * 2 - 32;

/** The pinned band's own height, below the safe-area inset. */
const BAND_HEIGHT = 56;

/**
 * Where the band takes over from the hero.
 *
 * The hero's back control sits 16 below the safe-area inset and is 44 tall, so
 * by 52pt of scroll it is entirely behind the band. The band has to be fully
 * there by then: the affordance may change treatment as the page scrolls, but
 * there must never be an offset with no way back on screen.
 */
const COLLAPSE_START = 16;
const COLLAPSE_END = 52;

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

/**
 * The bottom bar's button. The design draws a 12pt radius here where
 * `radius.button` is 11; the design system is being re-measured this phase, so
 * the frame wins locally rather than by moving a token every screen shares.
 */
const CTA_RADIUS = 12;

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
  const [showFullText, setShowFullText] = useState(false);
  const route = useRoute<RouteProps<"ProductDetail">>();
  const { isAuthenticated, userDetails } = useGlobalContext();
  const navigation = useTypedNavigation();
  const { fetchProduct, fetchSimilarProducts, fetchReviews } = useProduct();
  const { getMyProductDetails } = useProfile();
  const [product, setProduct] = useState<BackendProduct | null>(null);
  const [similarProducts, setSimilarProducts] = useState<BackendProduct[]>([]);
  const [isModerated, setIsModerated] = useState(false);
  const [reviews, setReviews] = useState<BackendReview[]>([]);
  const { id, isFavorite } = route.params;
  const { startChat } = useChat();
  const [startingChat, setStartingChat] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  // One resolved theme for the whole screen. It used to read `theme === "dark"`
  // from the global context in some places and `useTheme()` in others.
  const { color, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const scrollY = React.useRef(new Animated.Value(0)).current;
  // True once the pinned band, not the hero, owns the top of the screen. It is
  // what decides which of the two back controls takes a tap.
  const [heroCovered, setHeroCovered] = useState(false);
  // Only the owner-facing endpoint knows whether a listing is approved, so this
  // is fetched separately and only for the owner.
  const [ownerStatus, setOwnerStatus] = useState<ListingStatus | null>(null);
  const distanceLabel = useDistanceTo(product?.coordinates);

  /**
   * The theme's own glyphs, at every offset.
   *
   * This used to be pinned to `light-content` while the hero was on screen,
   * because a photograph ran under the status bar behind a scrim. Nothing does
   * any more: the hero is the canvas, so the bar takes the same style as every
   * other screen in the app.
   */
  useFocusedStatusBar(isDark ? "light-content" : "dark-content");

  const bandProgress = scrollY.interpolate({
    inputRange: [COLLAPSE_START, COLLAPSE_END],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  /** One inset, one vertical rhythm, one hairline, for every section. */
  const sectionStyle = {
    paddingHorizontal: SCREEN_GUTTER,
    // Bumped from density.section (20) for a calmer, more premium rhythm.
    paddingVertical: 26,
    borderBottomWidth: 1,
    borderBottomColor: color.line,
  } as const;

  /**
   * The share affordance in the title row was a TouchableOpacity with no
   * onPress at all — a dead control that looked alive, on the growth loop that
   * matters most to a marketplace.
   */
  const handleShare = async () => {
    if (!product) return;
    const line = `${product.title} — ${formatCurrency(product.rate)} per day on Renit`;
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
      const data = await fetchProduct(id);
      setProduct(data);
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
   * The public listing payload carries no approval state, so an owner looking
   * at their own listing could not tell whether renters could see it. Failure
   * here is silent: the status is additive and must not take the page down.
   */
  async function loadOwnerStatus(data: BackendProduct | null) {
    if (!data || !userDetails?.username) return;
    if (data.owner?.username !== userDetails.username) {
      setOwnerStatus(null);
      return;
    }
    try {
      const owned = await getMyProductDetails(data.name);
      setOwnerStatus(
        resolveListingStatus({
          moderationLabels: owned?.moderation_labels,
          adminApproved: owned?.admin_approved,
        })
      );
    } catch {
      setOwnerStatus(null);
    }
  }

  const handleEditClick = () => {
    if (!product?.name) return;
    navigation.navigate("editProduct", { id: product.name });
  };

  const isOwner = userDetails?.username === product?.owner?.username;

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

  const truncateAtNearestSpace = (text: string, maxLength: number) => {
    if (text?.length <= maxLength) return text;
    const truncated = text?.slice(0, maxLength);
    const lastSpaceIndex = truncated?.lastIndexOf(" ");
    return truncated?.slice(0, lastSpaceIndex) + "...";
  };

  const truncatedText = truncateAtNearestSpace(
    product?.description!,
    MAX_CHARS
  );
  const displayText = showFullText ? product?.description! : truncatedText;

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
          <Animated.View
            pointerEvents={heroCovered ? "auto" : "none"}
            style={{ opacity: bandProgress }}
          >
            <BackButton />
          </Animated.View>

          <Animated.View
            pointerEvents="none"
            style={{ flex: 1, opacity: bandProgress }}
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
                event.nativeEvent.contentOffset.y > COLLAPSE_END - 12;
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
            paddingVertical: TITLE_PAD_V,
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
              <ListingStatusPill status={ownerStatus} withDetail />
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

        {/* Bare-noun headings, the same rule on every screen in this flow. */}
        <View style={sectionStyle}>
          <SectionHeader title="Description" gutter={false} />
          <Text>{displayText}</Text>
          {product?.description.length! > MAX_CHARS && (
            <TouchableOpacity
              onPress={() => setShowFullText(!showFullText)}
              accessibilityRole="button"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <View className="flex flex-row items-center  mt-2 space-x-2">
                <Text fontWeight="font-bold">
                  {showFullText ? "Show less" : "Show more"}
                </Text>
                <View className=" mt-1">
                  {showFullText ? (
                    <ChevronUpIcon color={color.text} size={16} />
                  ) : (
                    <ChevronDownIcon color={color.text} size={16} />
                  )}
                </View>
              </View>
            </TouchableOpacity>
          )}
        </View>

        <View style={sectionStyle}>
          <SectionHeader title="Location" gutter={false} />
          {/* The map was a city-scale tile with an unlabelled blue dot: no
              address, no neighbourhood, and no distance. "How far away is it?"
              is the first question a renter asks. */}
          <View style={{ gap: 2 }}>
            {product?.location ? (
              <Text fontSize="text-md" tone="hi">
                {product.location}
              </Text>
            ) : null}
            {distanceLabel ? (
              <Text fontSize="text-sm" tone="body">
                {distanceLabel} · exact address shared once a booking is agreed
              </Text>
            ) : (
              <Text fontSize="text-sm" tone="body">
                Exact address shared once a booking is agreed
              </Text>
            )}
          </View>
          <View className="mt-3">
            <ProductMap
              latitude={product?.coordinates?.lat!}
              longitude={product?.coordinates?.long!}
              isDarkMode={isDark}
              placeName={product?.location}
            />
          </View>
        </View>

        {/* Product reviews */}
        <View style={[sectionStyle, { paddingHorizontal: 0 }]}>
          <SectionHeader title="Reviews" />

          <View
            className="flex flex-row items-center"
            style={{ paddingHorizontal: SCREEN_GUTTER }}
          >
            {product?.review_count ? (
              <>
                <Text
                  fontWeight="font-bold"
                  fontSize="text-lg"
                  tone="hi"
                  className="mr-3"
                >
                  {product?.average_rating?.toFixed(1)}
                </Text>
                <Stars rating={product?.average_rating!} isDark={isDark} />
                <Text fontSize="text-md" tone="body" className="ml-1">
                  ({product?.review_count})
                </Text>
              </>
            ) : (
              <Text fontSize="text-md" tone="body">
                No reviews yet — be the first to rent it.
              </Text>
            )}
          </View>

          {lessReviews.length > 0 ? (
            <ScrollView
              horizontal
              nestedScrollEnabled
              showsHorizontalScrollIndicator={false}
              style={{ width: '100%'}}
              contentContainerStyle={{
                paddingHorizontal: SCREEN_GUTTER,
                paddingTop: 12,
                gap: 14,
              }}
            >
              {lessReviews.map((item) => (
                <View key={item.user.username} style={{ width: itemWidth }}>
                  <ReviewCard
                    reviewText={item.comment}
                    reviewerName={`${item.user.first_name} ${item.user.last_name}`}
                    reviewDate={item.created_at}
                    reviewerImage={item.user?.image?.image_url}
                  />
                </View>
              ))}
            </ScrollView>
          ) : null}

          {/* A full-width 66pt button offering to show all of nothing. It
              only exists when there is something to show. */}
          {reviews.length > 0 ? (
            <View style={{ paddingHorizontal: SCREEN_GUTTER }}>
              <Button
                onPress={() =>
                  navigation.navigate("ReviewsScreen", {
                    reviews,
                    product: product!,
                    owner: product!.owner!,
                  })
                }
                variant="outline"
                size="compact"
                className="mt-3"
              >
                {`See all ${reviews.length} ${reviews.length === 1 ? "review" : "reviews"}`}
              </Button>
            </View>
          ) : null}
        </View>

        {/* Owner */}
        <View style={sectionStyle}>
          <SectionHeader title="Owner" gutter={false} />
          <View className="flex flex-row items-center ">
            <AboutOwner
              id={product?.owner?.username!}
              name={`${product?.owner?.first_name} ${product?.owner?.last_name}`}
              profilePic={product?.owner?.image?.image_url || ""}
              rating={product?.avg_rating ?? 0}
              products={product?.products_listed ?? 0}
              isDark={isDark}
            />
          </View>
        </View>

        {/* Similar products */}
        {similarProducts.length > 0 && (
          <View style={[sectionStyle, { paddingHorizontal: 0, borderBottomWidth: 0 }]}>
            <SectionHeader title="Similar products" />

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: SCREEN_GUTTER,
                gap: 14,
              }}
            >
              {similarProducts.map((item) => (
                <View key={item.name} style={{ width: 158 }}>
                  <Card
                    id={`${item.name}`}
                    image={item.cover_image}
                    title={item.title}
                    location={item.location}
                    price={item.rate}
                    coordinates={item.coordinates}
                  />
                </View>
              ))}
            </ScrollView>
          </View>
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
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
          <Text fontWeight="font-bold" fontSize="text-lg">
            {formatCurrency(product?.rate)}
          </Text>
          <Text fontSize="text-sm" tone="body">
            per day
          </Text>
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
          ) : (
            <Button
              onPress={handleStartChat}
              loading={startingChat}
              disabled={startingChat}
              style={CTA_STYLE}
              accessibilityLabel="Chat with owner"
            >
              <CtaLabel>Chat with owner</CtaLabel>
            </Button>
          )}
        </View>
      </View>
      ) : null}
    </View>
  );
}
