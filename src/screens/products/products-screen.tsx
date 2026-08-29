import { useChat } from "@/backend/chat";
import { useProduct } from "@/backend/product";
import { Button, Card, Text } from "@/components/core";
import { ModerationBanner } from "@/components/product/moderation-banner";
import { ProductImage } from "@/components/product/product-image";
import { ProductMap } from "@/components/product/product-map";
import { AboutOwner } from "@/components/product/product-owner";
import { ReviewCard } from "@/components/product/review-card";
import { Stars } from "@/components/product/stars";
import { useGlobalContext } from "@/context/global-context";
import {
  BackendProduct,
  BackendReview,
  RouteProps,
  useTypedNavigation,
} from "@/lib/types";
import { useFocusEffect, useRoute } from "@react-navigation/native";
import { SCREEN_GUTTER, density, ink } from "@/lib/design-tokens";
import { useDistanceTo } from "@/lib/distance";
import { formatCurrency } from "@/lib/format";
import { useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";
import { IOSShareIcon } from "@/icons/share";
import { CategoryIcon } from "@/lib/category-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { IconButton } from "@/components/core/icon-button";
import { EmptyState } from "@/components/core/empty-state";
import React, { useCallback, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  RefreshControl,
  ScrollView,
  Share,
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
import { SvgUri } from "react-native-svg";

import { ProductsSkeleton } from "./products-skeleton";

const MAX_CHARS = 150;

// A review card is wide enough to peek the next one, which is what makes a
// horizontal rail read as scrollable.
const itemWidth = Dimensions.get("window").width - SCREEN_GUTTER * 2 - 32;

export default function DetailsScreen() {
  const [loading, setLoading] = React.useState(true);
  const [showFullText, setShowFullText] = useState(false);
  const route = useRoute<RouteProps<"ProductDetail">>();
  const { theme, isAuthenticated, userDetails } = useGlobalContext();
  const isDark = theme === "dark";
  const navigation = useTypedNavigation();
  const { fetchProduct, fetchSimilarProducts, fetchReviews } = useProduct();
  const [product, setProduct] = useState<BackendProduct | null>(null);
  const [similarProducts, setSimilarProducts] = useState<BackendProduct[]>([]);
  const [isModerated, setIsModerated] = useState(false);
  const [reviews, setReviews] = useState<BackendReview[]>([]);
  const { id, isFavorite } = route.params;
  const { startChat } = useChat();
  const [startingChat, setStartingChat] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const { color, isDark: isDarkTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const scrollY = React.useRef(new Animated.Value(0)).current;
  // Drives the status-bar style. Light glyphs are correct while the hero (and
  // its gradient scrim) is under the strip; once the canvas scrim covers it the
  // strip is app chrome again and follows the theme.
  const [heroCovered, setHeroCovered] = useState(false);
  const distanceLabel = useDistanceTo(product?.coordinates);

  /** One inset, one vertical rhythm, one hairline, for every section. */
  const sectionStyle = {
    paddingHorizontal: SCREEN_GUTTER,
    // Was 24 top and bottom. A one-line "About the product" cost 180pt and an
    // empty reviews section cost 200pt to say there was nothing in it.
    paddingVertical: density.section,
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
    } catch (error: any) {
      // Swallowing this left the screen showing the "not available" state for a
      // listing that exists, with nothing saying the request failed.
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <ProductsSkeleton />;
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
  const categoryIconUri =
    theme === "dark"
      ? product?.category?.dark_icon
      : product?.category?.light_icon;
  const categoryIconIsSvg =
    categoryIconUri?.slice(-3)?.toLowerCase() === "svg";
  const displayText = showFullText ? product?.description! : truncatedText;
  if (!product) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: color.canvas }}>
        <EmptyState
          variant="error"
          title="This listing isn’t available"
          body="It may have been removed, or the link may be out of date."
          actionLabel="Go back"
          onAction={() => navigation.goBack()}
        />
      </SafeAreaView>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: color.canvas }}>
      {/* The hero bleeds to the top of the display with its controls floating
          over it. Reserving the top safe-area edge letterboxed the 1:1 image
          below a dead black band. */}
      {/* The status bar sits directly on the photograph at scroll 0, and its
          style follows the app theme rather than the image behind it. In dark
          mode over a bright product shot the clock and battery rendered white
          on white and were unreadable; in light mode over a dark shot the same
          failure occurs inverted.

          A permanent gradient scrim under the status bar makes light glyphs
          correct over any photograph, and the status bar is pinned to "light"
          for as long as the hero is the thing underneath it. */}
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(0,0,0,0.55)", "rgba(0,0,0,0.28)", "transparent"]}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: insets.top + 52,
          zIndex: 2,
        }}
      />
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: insets.top,
          zIndex: 3,
          backgroundColor: color.canvas,
          opacity: scrollY.interpolate({
            inputRange: [0, 120, 220],
            outputRange: [0, 0, 1],
            extrapolate: "clamp",
          }),
        }}
      />
      <StatusBar style={heroCovered ? (isDark ? "light" : "dark") : "light"} />
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
              const covered = event.nativeEvent.contentOffset.y > 170;
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
        <View style={{ width: "100%", aspectRatio: 1, }}>
          <ProductImage
            images={product!.images}
            coverImage={product!.cover_image}
            name={id}
            isFavorite={isFavorite}
          />
        </View>

        {isOwner && isModerated && (
          <View style={{ paddingHorizontal: SCREEN_GUTTER }}>
            <ModerationBanner moderationLabels={product?.moderation_labels!} />
          </View>
        )}

        <View style={sectionStyle}>
          <View className="flex flex-row items-center justify-between">
            <Text
              fontSize="text-xl"
              fontWeight="font-bold"
              style={{ flex: 1 }}
            >
              {product?.title}
            </Text>
            <IconButton
              onPress={handleShare}
              accessibilityLabel={`Share ${product?.title ?? "this listing"}`}
              accessibilityHint="Opens the system share sheet"
            >
              <IOSShareIcon color={color.text} size={22} />
            </IconButton>
          </View>
          <View className="flex flex-row items-center my-2">
            {product?.review_count ? (
              <>
                <Stars rating={product?.average_rating!} isDark={isDarkTheme} />
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
        </View>

        {/* Specifications.
            Was three centred columns with a decorative glyph over the VALUE
            over the LABEL — a monitor for "Laptop / Desktop", a banknote for
            the deposit, and a lightbulb for "Excellent" condition, which has no
            relationship to condition at all. People scan for the label to find
            the value, and these are arbitrary strings rather than a stat grid,
            so the label leads and the glyphs are gone. */}
        <View style={sectionStyle}>
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

        {/* About the product */}
        <View style={sectionStyle}>
          <View className="flex flex-row items-center justify-between">
            <Text
              fontWeight="font-bold"
              fontSize="text-lg"
              accessibilityRole="header"
            >
              Description
            </Text>
          </View>
          <Text className="mt-2">{displayText}</Text>
          {product?.description.length! > MAX_CHARS && (
            <TouchableOpacity onPress={() => setShowFullText(!showFullText)}>
              <View className="flex flex-row items-center  mt-2 space-x-2">
                <Text
                  fontWeight="font-bold"
                  className={isDark ? "text-white" : "text-black"}
                >
                  {showFullText ? "Show less" : "Show more"}
                </Text>
                <View className=" mt-1">
                  {showFullText ? (
                    <ChevronUpIcon
                      color={ink.text(isDark)}
                      size={16}
                    />
                  ) : (
                    <ChevronDownIcon
                      color={ink.text(isDark)}
                      size={16}
                    />
                  )}
                </View>
              </View>
            </TouchableOpacity>
          )}
        </View>

        <View style={sectionStyle}>
          <View className="flex flex-row items-center justify-between">
            <Text
              fontWeight="font-bold"
              fontSize="text-lg"
              accessibilityRole="header"
            >
              Location
            </Text>
          </View>
          {/* The map was a city-scale tile with an unlabelled blue dot: no
              address, no neighbourhood, and no distance. "How far away is it?"
              is the first question a renter asks. */}
          <View style={{ marginTop: 2, gap: 2 }}>
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
            />
          </View>
        </View>

        {/* Product reviews` */}
        <View style={[sectionStyle, { paddingHorizontal: 0 }]}>
          <View className="flex flex-row items-center justify-between" style={{ paddingHorizontal: SCREEN_GUTTER }}>
            <Text
              fontWeight="font-bold"
              fontSize="text-lg"
              accessibilityRole="header"
            >
              Reviews
            </Text>
          </View>

          <View
            className="flex flex-row items-center mt-1"
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
                <Stars rating={product?.average_rating!} isDark={isDarkTheme} />
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

        {/* About the owner */}
        <View style={sectionStyle}>
          <View className="flex flex-row items-center justify-between">
            <Text
              fontWeight="font-bold"
              fontSize="text-lg"
              accessibilityRole="header"
            >
              Owner
            </Text>
          </View>
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
            <View className="flex flex-row items-center justify-between mb-4" style={{ paddingHorizontal: SCREEN_GUTTER }}>
              <Text
                fontWeight="font-bold"
                fontSize="text-xl"
              >
                Similar products
              </Text>
            </View>

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
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        )}
      </Animated.ScrollView>

      {/*
        The bar was h-[10%] with price and CTA both flex-1, so "₹25 per day"
        occupied half the width and left ~85pt of empty space beside it while
        the primary action was confined to the other half. The price now takes
        the room it needs and the CTA takes the rest. The bottom inset is
        reserved here rather than by a SafeAreaView that declared only its top
        edge, which left the button 19pt off the screen edge.
      */}
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
            // The owner variant used to be a raw TouchableOpacity at h-full,
            // so the two states of one bar had different button heights.
            <Button variant="outline" onPress={handleEditClick}>
              Edit product
            </Button>
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
    </View>
  );
}
