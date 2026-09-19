import { useChat } from "@/backend/chat";
import useOwner from "@/backend/owner";
import useReviews from "@/backend/reviews";
import useSaved from "@/backend/useSaved";
import {
  Avatar,
  Button,
  Card,
  CrossFade,
  Text,
  useButtonLabelColor,
} from "@/components/core";
import { IconButton } from "@/components/core/icon-button";
import Skeleton from "@/components/core/skeleton";
import { DetailSection } from "@/components/product/detail-section";
import { ReviewCard } from "@/components/product/review-card";
import { SpecStrip } from "@/components/product/spec-strip";
import { useGlobalContext } from "@/context/global-context";
import {
  BackendProduct,
  OwnerReview,
  PublicOwner,
  RouteProps,
  useTypedNavigation,
} from "@/lib/types";
import { useRoute } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import { Animated, ScrollView, StyleSheet, View } from "react-native";
import {
  ArrowLeftIcon as ArrowLeftMini,
  CalendarIcon as CalendarMini,
  ChevronRightIcon as ChevronRightMini,
} from "react-native-heroicons/mini";
import { CubeIcon, StarIcon } from "react-native-heroicons/outline";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  MIN_TOUCH_TARGET,
  SCREEN_GUTTER,
  density,
  radius,
} from "@/lib/design-tokens";
import { pluralize } from "@/lib/pluralize";
import { describeRating } from "@/lib/rating";
import { useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";

/**
 * "About the owner" — Figma 1:21984.
 *
 * The page is a stack of ruled blocks, the same construction the product detail
 * page uses, so the blocks below the profile are `DetailSection` at its
 * `profile` rhythm rather than a second set of section primitives.
 *
 * Deliberately not drawn any more: the verification card (email/phone verified,
 * "Lists in <area>") and the business-name pill a previous pass added. Neither
 * is in the frame and neither could be placed inside it without breaking the
 * profile block's 16pt rhythm. Both were derived from the listing payload
 * rather than from `owner-details/`, so nothing is lost on the API side — the
 * markup is in this file's history if the signals come back.
 */

/** The frame's header row and, with it, the back control's target. */
const HEADER_HEIGHT = MIN_TOUCH_TARGET;
/** The back control sits on the screen edge's 16, not on the page's 24 gutter. */
const HEADER_INSET = 16;

/**
 * Where the scrolled header hands over to the pinned one.
 *
 * The frame has no pinned bar: the title and the back arrow are content and
 * scroll away with it. A page with no way back at most of its offsets is not
 * shippable, so a copy of the header sits over the scroll and fades in exactly
 * as the real one leaves — same glyph, same 16pt inset, same 44pt target, so
 * the arrow simply appears to stop moving. This is the treatment Product
 * Details already ships for the same problem.
 */
const BAND_FADE_END = 24;
/** The pinned copy takes the taps a little before it is fully opaque. */
const BAND_TAKEOVER = 16;

/** Every glyph on this page is the frame's 20pt. */
const GLYPH_SIZE = 20;
/** The chevron in a block's button is drawn in a 24pt box. */
const CHEVRON_SIZE = 24;
/** Label to chevron. */
const CHEVRON_GAP = 4;

const AVATAR_SIZE = 72;
/** Avatar to name. */
const NAME_GAP = 8;
/** Avatar group to facts strip. */
const FACTS_GAP = 8;
/** Header to profile block, and before the chat button. */
const PROFILE_GAP = 16;
/** Below the chat button, before the first hairline. The blocks' own inset. */
const PROFILE_PAD_BOTTOM = 24;

/** Rails: the Home tile at the Home tile's width, and the detail review card. */
const CARD_WIDTH = 163;
const REVIEW_CARD_WIDTH = 285;
const RAIL_GAP = 16;

/**
 * The frame's block action. 56 tall as a floor rather than a height, so the
 * label can still grow it at accessibility text sizes, and a 12pt radius where
 * `radius.button` is 11 — the design system is being re-measured this phase, so
 * the frame wins locally rather than by moving a token every screen shares.
 * (Product Details' bottom-bar CTA carries the same local 12.)
 */
const BUTTON_HEIGHT = 56;
const BUTTON_RADIUS = 12;

/**
 * The header, drawn twice: once in the scroll as the frame has it, once pinned
 * over it. The title is centred on the screen rather than on the space beside
 * the arrow, which is why the back control is laid over the row instead of
 * sitting in it.
 */
function OwnerHeader({ interactive }: { interactive: boolean }) {
  const { color } = useTheme();
  const navigation = useTypedNavigation();

  return (
    // box-none, and the title none: the pinned copy of this header sits over the
    // scrolled copy's arrow at rest, and a plain View here swallowed the tap
    // (iOS hit-tests ignore opacity), so back was dead until the page was scrolled.
    <View
      pointerEvents="box-none"
      style={{ height: HEADER_HEIGHT, justifyContent: "center" }}
    >
      <Text
        accessibilityRole="header"
        fontSize="text-lg"
        fontWeight="font-bold"
        numberOfLines={1}
        style={{
          textAlign: "center",
          pointerEvents: "none",
          // Reserve the arrow's box on both sides so a long title never runs
          // under it.
          paddingHorizontal: HEADER_INSET + MIN_TOUCH_TARGET,
        }}
      >
        About the owner
      </Text>

      <View
        pointerEvents={interactive ? "auto" : "none"}
        style={{ position: "absolute", left: HEADER_INSET }}
      >
        {/* The frame draws heroicons' *mini* arrow — a filled 20pt glyph, not
            the outline `BackButton` uses on pushed screens — so this composes
            `IconButton` directly, exactly as the product hero does. It keeps
            the two things `BackButton` exists to guarantee: a 44pt target and
            a required label. */}
        <IconButton
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
          accessibilityHint="Returns to the previous screen"
        >
          <ArrowLeftMini size={GLYPH_SIZE} color={color.text} />
        </IconButton>
      </View>
    </View>
  );
}

/**
 * A block's label, inside a live `Button`.
 *
 * The frame sets it at 14 Bold where `Button` sets a plain string child at 16,
 * and puts a chevron after it. A node child keeps the frame's size and still
 * takes the colour the button has already resolved for the state it is in, so
 * the disabled treatment is not re-derived here.
 */
function BlockButtonLabel({
  children,
  chevron,
}: {
  children: string;
  chevron?: boolean;
}) {
  const labelColor = useButtonLabelColor();
  return (
    <View
      style={{ flexDirection: "row", alignItems: "center", gap: CHEVRON_GAP }}
    >
      <Text
        fontSize="text-sm"
        fontWeight="font-bold"
        style={{ color: labelColor }}
      >
        {children}
      </Text>
      {chevron ? (
        <ChevronRightMini size={CHEVRON_SIZE} color={labelColor} />
      ) : null}
    </View>
  );
}

/**
 * The one control this page uses: full width, 56 tall, a 1pt edge and the
 * light theme's faint lift.
 *
 * The frame draws that edge at `color.line`. It ships at `color.inputLine` —
 * which is what `Button`'s outline variant already uses — because a hairline
 * fails WCAG 1.4.11 (3:1) as the edge of an interactive control, and
 * design-tokens.ts states that rule explicitly. One step darker on light is
 * the whole difference.
 */
function BlockButton({
  label,
  onPress,
  chevron,
  loading,
  accessibilityHint,
}: {
  label: string;
  onPress: () => void;
  chevron?: boolean;
  loading?: boolean;
  accessibilityHint?: string;
}) {
  const { shadow } = useTheme();
  return (
    <Button
      variant="outline"
      onPress={onPress}
      loading={loading}
      disabled={loading}
      // A node child carries no label of its own.
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      style={[
        { minHeight: BUTTON_HEIGHT, paddingVertical: 0, borderRadius: BUTTON_RADIUS },
        // Black at ~5%, light only; `shadow.dark` is transparent by design.
        shadow,
      ]}
    >
      <BlockButtonLabel chevron={chevron}>{label}</BlockButtonLabel>
    </Button>
  );
}

export default function UsersDetails() {
  const route = useRoute<RouteProps<"UserDetail">>();
  const { isAuthenticated, userDetails } = useGlobalContext();

  const navigation = useTypedNavigation();
  const { id } = route.params;
  const { startChat } = useChat();
  const { getReviews } = useReviews();
  const [products, setProducts] = useState<BackendProduct[]>([]);
  const [owner, setOwner] = useState<PublicOwner | null>(null);
  const [ownerReviews, setOwnerReviews] = useState<OwnerReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [messaging, setMessaging] = useState(false);

  const { color, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const scrollY = React.useRef(new Animated.Value(0)).current;
  // True once the pinned copy of the header, rather than the scrolled one,
  // owns the top of the screen. It is what decides which of the two back
  // controls takes a tap — and which one VoiceOver is allowed to reach.
  const [headerCovered, setHeaderCovered] = useState(false);
  // The rail draws the Home tile, whose heart has to start in the right state.
  // One shared, cached query — the same one every `FavouriteButton` already
  // subscribes to.
  const { favorites } = useSaved();

  const isOwner = userDetails?.username === owner?.username;

  const { getOwnerDetails, getOwnerProducts } = useOwner();

  const fetchOwnerDetails = async () => {
    setLoading(true);
    try {
      const data = await getOwnerDetails(id);
      const products = (await getOwnerProducts(id)) as BackendProduct[];
      const owner_reviews = await getReviews(id);

      setOwner(data);
      setProducts(products);
      setOwnerReviews(owner_reviews || []);
    } finally {
      setLoading(false);
    }
  };

  const handleStartChat = async () => {
    if (messaging) return;
    if (!isAuthenticated) {
      toast.error("Sign in to Renit to message owners");
      return;
    }

    setMessaging(true);
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
          userId: owner?.username!,
          firebaseUid: owner?.firebase_uid!,
          username: owner?.first_name! + " " + owner?.last_name!,
          profilePicture: owner?.image?.image_url
            ? owner?.image?.image_url
            : "",
        },
        {
          title: "",
          location: "",
          image: "",
          rate: "",
          type: "",
          text: "Hello, I am interested in your products!",
        }
      );

      if (success) {
        navigation.navigate("ChatDetails", { id: content });
      }
    } finally {
      setMessaging(false);
    }
  };

  React.useEffect(() => {
    fetchOwnerDetails();
  }, [id]);

  const ownerRating = owner?.average_rating ?? 0;
  const ratingDisplay = describeRating(ownerRating, ownerReviews.length);
  // Was "Jul 22, '26" — an apostrophe year and day-level precision on a
  // "member since" fact, in en-US on a rupee marketplace. The month and year
  // are the only part anyone reads. (The frame prints the day and the
  // apostrophe year; this is the one place the page keeps its own answer.)
  const joinedDateLabel = owner?.date_joined
    ? new Date(owner.date_joined).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
      })
    : "—";

  const ownerFirstName = owner?.first_name ?? "";

  const stats = [
    {
      key: "rating",
      icon: (
        <StarIcon
          // Primary, as every other glyph on the page — except with no score,
          // where the column is dimmed rather than left looking rated.
          color={ratingDisplay.rated ? color.text : color.textDim}
          size={GLYPH_SIZE}
          strokeWidth={1.5}
        />
      ),
      value: ratingDisplay.label,
      // "0.0" under the word "Rating" told every unrated host they were scored
      // zero out of five. A host with no reviews is New.
      caption: ratingDisplay.rated ? "Rating" : "Host",
    },
    {
      key: "listings",
      icon: <CubeIcon color={color.text} size={GLYPH_SIZE} strokeWidth={1.5} />,
      value: `${products.length}`,
      caption: products.length === 1 ? "Product" : "Products",
    },
    {
      key: "joined",
      icon: <CalendarMini color={color.text} size={GLYPH_SIZE} />,
      value: joinedDateLabel,
      caption: "User since",
    },
  ];

  const openAllProducts = () => {
    navigation.navigate("OwnersProducts", {
      products: products,
      name: owner?.first_name!,
    });
  };

  /**
   * The rail's review cards are a fixed height so a row of them lines up, so a
   * review that is cut off opens the full list rather than expanding in place.
   * It is also what the button below the rail does.
   */
  const openAllReviews = () => {
    if (!owner) return;
    navigation.navigate("OwnersReviewScreen", {
      owner,
      reviews: ownerReviews,
    });
  };

  const bandProgress = scrollY.interpolate({
    inputRange: [0, BAND_FADE_END],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  return (
    <View style={{ flex: 1, backgroundColor: color.canvas }}>
      {/* `StaticContainer` used to carry this; the page now lays itself out
          from the safe area so its content can scroll under the top inset. */}
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* The pinned copy of the header. Invisible at rest — the scrolled
          header is the one on screen — and solid from 24pt of scroll on. */}
      <View
        pointerEvents="box-none"
        style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 4 }}
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
        <Animated.View
          pointerEvents="box-none"
          // Both copies are mounted at all times, so exactly one of them is
          // offered to VoiceOver — otherwise the screen announces its title
          // and its back button twice.
          accessibilityElementsHidden={!headerCovered}
          importantForAccessibility={
            headerCovered ? "auto" : "no-hide-descendants"
          }
          style={{ marginTop: insets.top, opacity: bandProgress }}
        >
          <OwnerHeader interactive={headerCovered} />
        </Animated.View>
      </View>

      {/* Animated.ScrollView, not ScrollView: a native-driven Animated.event
          has to be attached to an animated component or the plain one receives
          the event object where it expects a handler. */}
      <Animated.ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top,
          paddingBottom: density.section * 3 + insets.bottom,
        }}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          {
            useNativeDriver: true,
            listener: (event: any) => {
              const covered =
                event.nativeEvent.contentOffset.y > BAND_TAKEOVER;
              setHeaderCovered((current) =>
                current === covered ? current : covered
              );
            },
          }
        )}
      >
        {/* Outside the cross-fade: the way back has to be there while the
            profile is still loading. */}
        <View
          accessibilityElementsHidden={headerCovered}
          importantForAccessibility={
            headerCovered ? "no-hide-descendants" : "auto"
          }
        >
          <OwnerHeader interactive={!headerCovered} />
        </View>

        <CrossFade loading={loading} placeholder={<OwnerSkeleton />}>
          <View>
            <View
              style={{
                paddingTop: PROFILE_GAP,
                paddingBottom: PROFILE_PAD_BOTTOM,
                gap: PROFILE_GAP,
                borderBottomWidth: 1,
                borderBottomColor: color.line,
              }}
            >
              {/* The frame keeps the avatar group and the facts strip 8pt apart
                  and puts the 16pt gap only before the chat button. */}
              <View style={{ gap: FACTS_GAP }}>
              <View
                style={{
                  alignItems: "center",
                  gap: NAME_GAP,
                  paddingHorizontal: SCREEN_GUTTER,
                }}
              >
                <Avatar
                  uri={owner?.image?.image_url}
                  name={`${owner?.first_name ?? ""} ${owner?.last_name ?? ""}`.trim()}
                  size={AVATAR_SIZE}
                />
                {/* The frame sets the name at body-small bold, not at heading
                    size: the page is already titled, and the photograph above
                    is what announces the person. */}
                <Text fontSize="text-sm" fontWeight="font-bold">
                  {owner?.first_name} {owner?.last_name}
                </Text>
              </View>

              {/* The same three-up strip the product detail and the post
                  wizard's review step use, at this page's own metrics. */}
              <SpecStrip
                variant="profile"
                dividers={false}
                items={stats.map((stat) => ({
                  icon: stat.icon,
                  value: stat.value,
                  label: stat.caption,
                }))}
              />
              </View>

              {!isOwner && (
                <View style={{ paddingHorizontal: SCREEN_GUTTER }}>
                  <BlockButton
                    label={`Chat with ${owner?.first_name ?? "the owner"}`}
                    onPress={handleStartChat}
                    loading={messaging}
                  />
                </View>
              )}
            </View>

            <DetailSection
              variant="profile"
              title={pluralize(products.length, "product")}
              // The rail starts on the gutter and runs to the screen edge, so
              // the next card is always visibly cut off — which is what makes
              // a rail read as scrollable without a control saying so.
              inset={false}
            >
              {products.length ? (
                <ScrollView
                  horizontal
                  nestedScrollEnabled
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{
                    paddingHorizontal: SCREEN_GUTTER,
                    gap: RAIL_GAP,
                  }}
                >
                  {products.slice(0, 4).map((item) => (
                    <View key={item.name} style={{ width: CARD_WIDTH }}>
                      <Card
                        id={item.name}
                        image={item.cover_image}
                        title={item.title}
                        location={item.location}
                        price={item.rate.toString()}
                        coordinates={item.coordinates}
                        isFavorite={favorites.some(
                          (fav) => fav.name === item.name
                        )}
                        tile
                      />
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <Text
                  fontSize="text-sm"
                  tone="dim"
                  style={{ paddingHorizontal: SCREEN_GUTTER }}
                >
                  Nothing listed yet
                </Text>
              )}

              {/* Only when the rail is holding something back: with two
                  listings there is nothing behind this control. */}
              {products.length > 2 ? (
                <View style={{ paddingHorizontal: SCREEN_GUTTER }}>
                  <BlockButton
                    label="View all products"
                    chevron
                    onPress={openAllProducts}
                    accessibilityHint="Opens every listing from this owner"
                  />
                </View>
              ) : null}
            </DetailSection>

            {/* The last block on the page rules no line under itself. */}
            <DetailSection
              variant="profile"
              title={`${ownerFirstName || "This owner"}’s reviews`}
              inset={false}
              divider={false}
            >
              {ownerReviews.length ? (
                <ScrollView
                  horizontal
                  nestedScrollEnabled
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{
                    paddingHorizontal: SCREEN_GUTTER,
                    gap: RAIL_GAP,
                  }}
                >
                  {ownerReviews.map((item) => (
                    <View key={item.id} style={{ width: REVIEW_CARD_WIDTH }}>
                      <ReviewCard
                        variant="detail"
                        reviewText={item.comment}
                        reviewerName={`${item.reviewer.first_name} ${item.reviewer.last_name}`}
                        reviewDate={item.created_at}
                        reviewerImage={item.reviewer.image}
                        onShowMore={openAllReviews}
                      showMoreHint="Opens every review for this owner"
                      />
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <Text
                  fontSize="text-sm"
                  tone="dim"
                  style={{ paddingHorizontal: SCREEN_GUTTER }}
                >
                  No reviews yet
                </Text>
              )}

              {ownerReviews.length > 1 ? (
                <View style={{ paddingHorizontal: SCREEN_GUTTER }}>
                  <BlockButton
                    label="View all reviews"
                    chevron
                    onPress={openAllReviews}
                    accessibilityHint="Opens every review of this owner"
                  />
                </View>
              ) : null}
            </DetailSection>
          </View>
        </CrossFade>
      </Animated.ScrollView>
    </View>
  );
}

/** Mirrors the profile's own rhythm so the cross-fade does not move anything. */
function OwnerSkeleton() {
  return (
    <View style={{ paddingTop: PROFILE_GAP, gap: PROFILE_GAP }}>
      <View style={{ gap: FACTS_GAP }}>
        <View style={{ alignItems: "center", gap: NAME_GAP }}>
          <Skeleton
            width={AVATAR_SIZE}
            height={AVATAR_SIZE}
            borderRadius={radius.full}
          />
          <Skeleton width={140} height={21} borderRadius={radius.button} />
        </View>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            gap: 24,
            // The facts row's own 16 top and bottom.
            paddingVertical: 16,
          }}
        >
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} width={72} height={69} borderRadius={radius.card} />
          ))}
        </View>
      </View>
      <View style={{ paddingHorizontal: SCREEN_GUTTER }}>
        <Skeleton
          width="100%"
          height={BUTTON_HEIGHT}
          borderRadius={BUTTON_RADIUS}
        />
      </View>
    </View>
  );
}
