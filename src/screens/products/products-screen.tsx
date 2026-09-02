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
} from "@/components/core";
import { ModerationBanner } from "@/components/product/moderation-banner";
import {
  ListingStatus,
  ListingStatusPill,
  resolveListingStatus,
} from "@/components/product/listing-status";
import { ProductImage } from "@/components/product/product-image";
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
import { MIN_TOUCH_TARGET, SCREEN_GUTTER, density, radius, shadow } from "@/lib/design-tokens";
import { useDistanceTo } from "@/lib/distance";
import { formatCurrency } from "@/lib/format";
import { useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";
import { IOSShareIcon } from "@/icons/share";
import { LinearGradient } from "expo-linear-gradient";
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
  ChevronDownIcon,
  ChevronUpIcon,
} from "react-native-heroicons/outline";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { ProductsSkeleton } from "./products-skeleton";

const MAX_CHARS = 150;

// A review card is wide enough to peek the next one, which is what makes a
// horizontal rail read as scrollable.
const itemWidth = Dimensions.get("window").width - SCREEN_GUTTER * 2 - 32;

/**
 * The pinned band's own height, below the safe-area inset. It matches the
 * hero's floating control row (40pt button at +8) so the back affordance does
 * not move as one treatment cross-fades into the other.
 */
const BAND_HEIGHT = 56;

/**
 * Where the band takes over from the hero.
 *
 * The hero's controls used to sit inside the scroll and the replacement band
 * only began to appear at 120pt — but a control at `insets.top + 8` has already
 * left the screen by ~100pt, so there was a stretch with no way back at all.
 * The band is fully there well before that.
 */
const COLLAPSE_START = 32;
const COLLAPSE_END = 84;

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
  // True once the pinned band, not the photograph, is what sits under the
  // status bar. Drives the bar's style and which back treatment takes taps.
  const [heroCovered, setHeroCovered] = useState(false);
  // Only the owner-facing endpoint knows whether a listing is approved, so this
  // is fetched separately and only for the owner.
  const [ownerStatus, setOwnerStatus] = useState<ListingStatus | null>(null);
  const distanceLabel = useDistanceTo(product?.coordinates);

  /**
   * Light glyphs while the hero is under the strip.
   *
   * This is not a guess about the photograph: the scrim below holds black at
   * α ≥ 0.55 across the whole glyph band, which puts white on at worst a
   * #737373 ground — 4.76:1, AA — even for a pure-white product shot. Deriving
   * the style from the image's own luminance would still leave a mixed-luminance
   * photo failing under half the clock; a scrim strong enough to carry light
   * glyphs is correct for every photograph, so the style is pinned to match it.
   */
  useFocusedStatusBar(
    heroCovered
      ? isDark
        ? "light-content"
        : "dark-content"
      : "light-content"
  );

  const bandProgress = scrollY.interpolate({
    inputRange: [COLLAPSE_START, COLLAPSE_END],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  const heroProgress = scrollY.interpolate({
    inputRange: [COLLAPSE_START, COLLAPSE_END],
    outputRange: [1, 0],
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
  // before: the collapsed style over an uncovered photograph.
  const showSkeleton = loading && !product;

  /**
   * Black at α ≥ 0.55 for the full height of the status bar, then a fall-off
   * that also carries the floating controls.
   *
   * The previous ramp reached 0.28 by the middle of the strip, so the lower half
   * of the clock sat at ~2.7:1. Holding 0.55 to `insets.top` puts a white glyph
   * on at worst #737373 — 4.76:1 — over even a pure-white photograph.
   */
  const scrimHeight = insets.top + 60;
  const scrimLocations = [
    0,
    Math.min(1, insets.top / scrimHeight),
    Math.min(1, (insets.top + 22) / scrimHeight),
    1,
  ] as const;

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
      {/* The hero bleeds to the top of the display with its controls floating
          over it. Reserving the top safe-area edge letterboxed the 1:1 image
          below a dead black band. */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: scrimHeight,
          zIndex: 2,
          opacity: heroProgress,
        }}
      >
        <LinearGradient
          colors={[
            "rgba(0,0,0,0.64)",
            "rgba(0,0,0,0.55)",
            "rgba(0,0,0,0.20)",
            "transparent",
          ]}
          locations={scrimLocations as unknown as number[]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* The pinned band. It used to be an empty canvas-coloured strip that
          existed only to hide content passing under it; it now carries the
          title and the back control the hero surrenders. */}
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
            paddingHorizontal: 10,
            gap: 4,
          }}
        >
          {/* Two treatments of one control, cross-faded in place, so the
              affordance never leaves and never jumps. */}
          <View
            style={{
              width: MIN_TOUCH_TARGET,
              height: MIN_TOUCH_TARGET,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Animated.View
              pointerEvents={heroCovered ? "none" : "auto"}
              style={{ position: "absolute", opacity: heroProgress }}
            >
              <BackButton onPhoto size={20} />
            </Animated.View>
            <Animated.View
              pointerEvents={heroCovered ? "auto" : "none"}
              style={{ position: "absolute", opacity: bandProgress }}
            >
              <BackButton />
            </Animated.View>
          </View>

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
        <View style={{ width: "100%", aspectRatio: 4 / 5, }}>
          <ProductImage
            images={product.images}
            coverImage={product.cover_image}
            name={id}
            isFavorite={isFavorite}
            showBack={false}
          />
        </View>

        {/* The info sheet overlaps the bottom of the hero photo, creating an
            iOS-native sheet-rise effect. The negative margin pulls it up; the
            rounded top corners and canvas background visually separate it from
            the photograph. */}
        <View
          style={{
            marginTop: -20,
            borderTopLeftRadius: radius.sheet,
            borderTopRightRadius: radius.sheet,
            backgroundColor: color.canvas,
            overflow: "hidden",
          }}
        >

        {isOwner && isModerated && (
          <View style={{ paddingHorizontal: SCREEN_GUTTER }}>
            <ModerationBanner moderationLabels={product?.moderation_labels!} />
          </View>
        )}

        <View style={sectionStyle}>
          <View className="flex flex-row items-center justify-between">
            <Text role="screenTitle" style={{ flex: 1 }}>
              {product?.title}
            </Text>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: radius.full,
                borderWidth: 1,
                borderColor: color.line,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
            <IconButton
              onPress={handleShare}
              accessibilityLabel={`Share ${product?.title ?? "this listing"}`}
              accessibilityHint="Opens the system share sheet"
            >
              <IOSShareIcon color={color.text} size={20} />
            </IconButton>
            </View>
          </View>
          <View className="flex flex-row items-center my-2">
            {product?.review_count ? (
              <>
                <Stars rating={product?.average_rating!} isDark={isDark} />
                <Text fontSize="text-sm" tone="body" className="ml-1">
                  ({product?.review_count})
                </Text>
              </>
            ) : (
              // Five hollow stars read as zero-out-of-five, which damages
              // exactly the new listings that need the help.
              <Text fontSize="text-sm" tone="body">
                Not yet rated
              </Text>
            )}
          </View>

          {/* Your own listing said nothing about whether renters could see it.
              "Live" is a fact the owner needs stated, not inferred. */}
          {isOwner && ownerStatus ? (
            <ListingStatusPill status={ownerStatus} withDetail />
          ) : null}
        </View>

        {/* Specifications.
            Was three centred columns with a decorative glyph over the VALUE
            over the LABEL — a monitor for "Laptop / Desktop", a banknote for
            the deposit, and a lightbulb for "Excellent" condition, which has no
            relationship to condition at all. People scan for the label to find
            the value, and these are arbitrary strings rather than a stat grid,
            so the label leads and the glyphs are gone. */}
        <View style={sectionStyle}>
          <View
            style={{
              backgroundColor: color.surfaceRaised,
              borderRadius: radius.card,
              padding: density.block,
            }}
          >
          {[
            { label: "Category", value: product?.category?.title },
            {
              label: "Security deposit",
              value: formatCurrency(product?.security_deposit),
            },
            {
              label: "Condition",
              value: product?.condition
                ? product.condition[0].toUpperCase() + product.condition.slice(1)
                : null,
            },
          ]
            .filter((row) => Boolean(row.value))
            .map((row, index) => (
              <View
                key={row.label}
                style={{
                  flexDirection: "row",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  gap: 16,
                  paddingTop: index === 0 ? 0 : 6,
                }}
              >
                <Text fontSize="text-md" tone="body">
                  {row.label}
                </Text>
                <Text
                  fontSize="text-md"
                  fontWeight="font-semibold"
                  numberOfLines={2}
                  style={{ flexShrink: 1, textAlign: "right" }}
                >
                  {row.value}
                </Text>
              </View>
            ))}
          </View>
        </View>

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
        {/* end sheet-overlap wrapper */}
        </View>
        ) : null}
        </CrossFade>
      </Animated.ScrollView>

      {/*
        The bar was h-[10%] with price and CTA both flex-1, so "₹25 per day"
        occupied half the width and left ~85pt of empty space beside it while
        the primary action was confined to the other half. The price now takes
        the room it needs and the CTA takes the rest. The bottom inset is
        reserved here rather than by a SafeAreaView that declared only its top
        edge, which left the button 19pt off the screen edge.
      */}
      {product ? (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 16,
          paddingHorizontal: SCREEN_GUTTER,
          paddingTop: 12,
          paddingBottom: 12 + insets.bottom,
          borderTopWidth: 1,
          borderTopColor: color.line,
          backgroundColor: color.surface,
          ...(isDark ? shadow.dark : shadow.light),
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
            <Button onPress={handleEditClick}>Edit product</Button>
          ) : (
            <Button
              onPress={handleStartChat}
              loading={startingChat}
              disabled={startingChat}
            >
              Chat with owner
            </Button>
          )}
        </View>
      </View>
      ) : null}
    </View>
  );
}
