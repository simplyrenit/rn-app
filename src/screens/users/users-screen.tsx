import { useChat } from "@/backend/chat";
import { CHAT_ENABLED } from "@/lib/config";
import useOwner from "@/backend/owner";
import useReviews from "@/backend/reviews";
import useSaved from "@/backend/useSaved";
import {
  Avatar,
  Button,
  Card,
  CrossFade,
  SectionHeader,
  SubpageHeader,
  Text,
  VerifiedBusinessBadge,
} from "@/components/core";
import Skeleton from "@/components/core/skeleton";
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
import { ScrollView, View } from "react-native";
import {
  CalendarIcon,
  CheckIcon,
  CubeIcon,
  MapPinIcon,
  ShieldExclamationIcon,
  StarIcon,
} from "react-native-heroicons/outline";
import {
  ShieldCheckIcon,
  StarIcon as StarSolid,
} from "react-native-heroicons/solid";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SCREEN_GUTTER, radius } from "@/lib/design-tokens";
import { imageUrlOf } from "@/lib/image-url";
import { pluralize } from "@/lib/pluralize";
import { describeRating } from "@/lib/rating";
import { useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";

/**
 * "About the owner" — Figma 2089:36248 (verified business), 2089:36415 (the
 * same, scrolled) and 2089:36523 (a new host).
 *
 * A fixed kit Top bar over the scroll, then the identity, the facts strip
 * between two full-bleed hairlines, the trust block (the "Verified business"
 * panel and the email / phone / area card), and the products and reviews
 * sections, each a rail with its "View all" button under it.
 *
 * The business name and verification come from `owner-details/`, so an owner
 * with no listings still shows them; email and phone come from the listing
 * payload. A signal the payload does not carry is simply not drawn.
 */

/** Every glyph in the facts strip and the trust card is the frame's 20pt. */
const GLYPH_SIZE = 20;
/** The check rows inside the Verified business panel. */
const CHECK_SIZE = 16;
const PANEL_SHIELD = 28;
/**
 * Fields the owner object embedded in a listing carries. Email and phone are
 * read only from there; `account_type` and `business_name` are the fallback for
 * an API older than ENG-73, whose `owner-details/` does not return them.
 */
interface OwnerTrustFields {
  email_verified?: boolean;
  phone_verified?: boolean;
  account_type?: string;
  business_name?: string | null;
}

/**
 * What every verified business went through (ENG-73). The API does not say
 * whether a given merchant declared GST, so that line covers both cases.
 */
const VERIFIED_CHECKS = [
  "Business PAN",
  "GST registration (if registered)",
  "Owner’s identity through DigiLocker",
];

/** ENG-348: the registration a reviewer accepted, listed after the checks every business went through. */
const REGISTRATION_CHECK: Record<string, string> = {
  udyam: "Udyam registration",
  shop_licence: "Shops & Establishments licence",
};

/** The content's own 8 under the top bar, and 40 after the last section. */
const CONTENT_PAD_TOP = 8;
const CONTENT_PAD_BOTTOM = 40;
const AVATAR_SIZE = 72;
/**
 * The identity block: 8 above, 24 below. Its rows sit 8 apart with a business
 * line under the name and 12 apart without one (2089:36523).
 */
const IDENTITY_PAD_TOP = 8;
const IDENTITY_PAD_BOTTOM = 24;
const IDENTITY_GAP = 8;
const IDENTITY_GAP_SOLO = 12;
/** The trust block: 24 under the facts hairline, 16 between its cards. */
const TRUST_PAD_TOP = 24;
const TRUST_GAP = 16;
/** A section: 32 above its heading, 12 between heading, rail and button. */
const SECTION_PAD_TOP = 32;
const SECTION_GAP = 12;

/** Rails: the kit Listing card, and the detail review card at the frame's 285x182. */
const CARD_WIDTH = 162;
const REVIEW_CARD_WIDTH = 285;
const REVIEW_CARD_HEIGHT = 182;
const RAIL_GAP = 16;
/** The section button: the kit's neutral Secondary, 44 high. */
const BUTTON_HEIGHT = 44;

/** One block below the trust cards: the kit Section header, then its rail and button. */
function OwnerSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ paddingTop: SECTION_PAD_TOP, gap: SECTION_GAP }}>
      <SectionHeader title={title} flush />
      {children}
    </View>
  );
}

function SectionButton({
  label,
  onPress,
  loading,
  accessibilityHint,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  accessibilityHint?: string;
}) {
  return (
    <View style={{ paddingHorizontal: SCREEN_GUTTER }}>
      <Button
        variant="outline"
        tone="neutral"
        size="compact"
        onPress={onPress}
        loading={loading}
        disabled={loading}
        accessibilityHint={accessibilityHint}
      >
        {label}
      </Button>
    </View>
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

  /**
   * What the API actually knows about this person, for a renter deciding whether
   * to hand over a deposit: identity verification, whether they trade as a
   * business, and where their listings are. The frame does not draw these, so they
   * sit as one quiet card under the facts strip; a signal the payload does not
   * carry is simply not drawn.
   */
  const listedOwner = products[0]?.owner as
    | (NonNullable<BackendProduct["owner"]> & OwnerTrustFields)
    | undefined;
  // owner-details first (ENG-73); an older API only has it on a listing.
  const accountType = owner?.account_type ?? listedOwner?.account_type;
  const businessName =
    accountType && accountType !== "user"
      ? (owner?.business_name ?? listedOwner?.business_name) || null
      : null;

  const businessVerified = owner?.business_verified === true;
  const registrationCheck = REGISTRATION_CHECK[owner?.business_registration_kind ?? ""];
  const verifiedChecks = registrationCheck ? [...VERIFIED_CHECKS, registrationCheck] : VERIFIED_CHECKS;
  const verifiedOn = owner?.business_verified_at
    ? new Date(owner.business_verified_at).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  const primaryArea = (() => {
    const counts = new Map<string, number>();
    products.forEach((item) => {
      const place = item.location?.trim();
      if (place) counts.set(place, (counts.get(place) ?? 0) + 1);
    });
    const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    if (!ranked.length) return null;
    return ranked.length === 1
      ? ranked[0][0]
      : `${ranked[0][0]} and ${ranked.length - 1} other ${
          ranked.length === 2 ? "area" : "areas"
        }`;
  })();

  const verification = (
    key: string,
    verified: boolean | undefined,
    noun: string
  ) =>
    typeof verified === "boolean"
      ? [
          {
            key,
            icon: verified ? (
              <CheckIcon size={GLYPH_SIZE} color={color.success} strokeWidth={1.5} />
            ) : (
              <ShieldExclamationIcon size={GLYPH_SIZE} color={color.textDim} strokeWidth={1.5} />
            ),
            label: verified ? `${noun} verified` : `${noun} not verified`,
            met: verified,
          },
        ]
      : [];
  const trustRows: {
    key: string;
    icon: React.ReactNode;
    label: string;
    met: boolean;
  }[] = [
    ...verification("email", listedOwner?.email_verified, "Email"),
    ...verification("phone", listedOwner?.phone_verified, "Phone"),
    ...(primaryArea
      ? [
          {
            key: "area",
            icon: <MapPinIcon size={GLYPH_SIZE} color={color.textDim} strokeWidth={1.5} />,
            label: `Lists in ${primaryArea}`,
            met: true,
          },
        ]
      : []),
  ];

  const stats = [
    {
      key: "rating",
      // A filled star for a score; with none, the outline star dimmed, so the
      // column is not left looking rated.
      icon: ratingDisplay.rated ? (
        <StarSolid color={color.text} size={GLYPH_SIZE} />
      ) : (
        <StarIcon color={color.textDim} size={GLYPH_SIZE} strokeWidth={1.5} />
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
      icon: <CalendarIcon color={color.text} size={GLYPH_SIZE} strokeWidth={1.5} />,
      value: joinedDateLabel,
      caption: "User since",
    },
  ];

  const openAllProducts = () => {
    navigation.navigate("OwnersProducts", {
      products: products,
      name: owner?.first_name!,
      shopUrl: owner?.shop_url,
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

  const hairline = <View style={{ height: 1, backgroundColor: color.line }} />;
  const showChat = !isOwner && CHAT_ENABLED;

  return (
    <View style={{ flex: 1, backgroundColor: color.canvas, paddingTop: insets.top }}>
      <StatusBar style={isDark ? "light" : "dark"} />
      {/* A fixed kit Top bar: both frames, the scrolled one too, keep it on
          screen, so the way back is there at every offset and while loading. */}
      <SubpageHeader title="About the owner" />

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: CONTENT_PAD_TOP,
          paddingBottom: CONTENT_PAD_BOTTOM + insets.bottom,
        }}
      >
        <CrossFade loading={loading} placeholder={<OwnerSkeleton />}>
          <View>
            <View
              style={{
                alignItems: "center",
                gap: businessName ? IDENTITY_GAP : IDENTITY_GAP_SOLO,
                paddingTop: IDENTITY_PAD_TOP,
                paddingBottom: IDENTITY_PAD_BOTTOM,
                paddingHorizontal: SCREEN_GUTTER,
              }}
            >
              <Avatar
                uri={owner?.image?.image_url}
                name={`${owner?.first_name ?? ""} ${owner?.last_name ?? ""}`.trim()}
                size={AVATAR_SIZE}
              />
              <Text role="screenTitle" style={{ textAlign: "center" }}>
                {owner?.first_name} {owner?.last_name}
              </Text>
              {/* A brand pill with a check used to sit on every business
                  name, checked or not (D-26). Now only a business Renit
                  verified gets the mark; any other name is plain text. */}
              {businessName ? (
                businessVerified ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    {/* Shrinks so a long name wraps and the mark stays on screen. */}
                    <Text
                      fontSize="text-sm"
                      fontWeight="font-semibold"
                      tone="body"
                      style={{ flexShrink: 1, textAlign: "center" }}
                    >
                      {businessName}
                    </Text>
                    <VerifiedBusinessBadge verified iconSize={16} size="md" />
                  </View>
                ) : (
                  <Text fontSize="text-xs" tone="dim">
                    {businessName}
                  </Text>
                )
              ) : null}
            </View>

            {hairline}
            <SpecStrip
              variant="profile"
              dividers={false}
              items={stats.map((stat) => ({
                icon: stat.icon,
                value: stat.value,
                label: stat.caption,
              }))}
            />
            {hairline}

            {businessVerified || trustRows.length || showChat ? (
              <View
                style={{
                  paddingTop: TRUST_PAD_TOP,
                  paddingHorizontal: SCREEN_GUTTER,
                  gap: TRUST_GAP,
                }}
              >
                {businessVerified ? (
                  <View
                    accessible
                    accessibilityLabel={`Verified business. Checked by Renit${
                      verifiedOn ? ` on ${verifiedOn}` : ""
                    }: ${verifiedChecks.join(", ")}.`}
                    style={{
                      padding: 16,
                      gap: 12,
                      borderRadius: radius.card,
                      backgroundColor: color.brandPanel,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <ShieldCheckIcon size={PANEL_SHIELD} color={color.brandText} />
                      <View style={{ flex: 1 }}>
                        <Text fontSize="text-md" fontWeight="font-semibold">
                          Verified business
                        </Text>
                        <Text fontSize="text-xs" tone="dim">
                          {verifiedOn ? `Checked by Renit on ${verifiedOn}` : "Checked by Renit"}
                        </Text>
                      </View>
                    </View>
                    {verifiedChecks.map((check) => (
                      <View
                        key={check}
                        style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                      >
                        <CheckIcon size={CHECK_SIZE} color={color.brandText} strokeWidth={1.5} />
                        <Text fontSize="text-sm" tone="body" style={{ flex: 1 }}>
                          {check}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                {trustRows.length ? (
                  <View
                    style={{
                      padding: 16,
                      gap: 12,
                      borderRadius: radius.input,
                      borderWidth: 1,
                      borderColor: color.line,
                      backgroundColor: color.surface,
                    }}
                  >
                    {trustRows.map((row) => (
                      <View
                        key={row.key}
                        style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                      >
                        {row.icon}
                        <Text
                          fontSize="text-sm"
                          tone={row.met ? "body" : "dim"}
                          numberOfLines={2}
                          style={{ flex: 1 }}
                        >
                          {row.label}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                {/* Chat is off at launch (ENG-177); the button and `handleStartChat`
                    stay for the day it is switched back on. No frame draws it. */}
                {showChat ? (
                  <Button
                    variant="outline"
                    tone="neutral"
                    size="compact"
                    onPress={handleStartChat}
                    loading={messaging}
                    disabled={messaging}
                  >
                    {`Chat with ${owner?.first_name ?? "the owner"}`}
                  </Button>
                ) : null}
              </View>
            ) : null}

            <OwnerSection title={pluralize(products.length, "product")}>
              {products.length ? (
                // The rail starts on the gutter and runs to the screen edge, so
                // the next card is always visibly cut off — which is what makes
                // a rail read as scrollable without a control saying so.
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
                        plans={item.plans}
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
                <SectionButton
                  label="View all products"
                  onPress={openAllProducts}
                  accessibilityHint="Opens every listing from this owner"
                />
              ) : null}
            </OwnerSection>

            <OwnerSection title={`${ownerFirstName || "This owner"}’s reviews`}>
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
                    <ReviewCard
                      key={item.id}
                      variant="detail"
                      width={REVIEW_CARD_WIDTH}
                      height={REVIEW_CARD_HEIGHT}
                      reviewText={item.comment}
                      reviewerName={`${item.reviewer.first_name} ${item.reviewer.last_name}`}
                      reviewDate={item.created_at}
                      reviewerImage={imageUrlOf(item.reviewer.image)}
                      onShowMore={openAllReviews}
                      showMoreHint="Opens every review for this owner"
                    />
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
                <SectionButton
                  label="View all reviews"
                  onPress={openAllReviews}
                  accessibilityHint="Opens every review of this owner"
                />
              ) : null}
            </OwnerSection>
          </View>
        </CrossFade>
      </ScrollView>
    </View>
  );
}

/** Mirrors the profile's own rhythm so the cross-fade does not move anything. */
function OwnerSkeleton() {
  return (
    <View>
      <View
        style={{
          alignItems: "center",
          gap: IDENTITY_GAP_SOLO,
          paddingTop: IDENTITY_PAD_TOP,
          paddingBottom: IDENTITY_PAD_BOTTOM,
        }}
      >
        <Skeleton width={AVATAR_SIZE} height={AVATAR_SIZE} borderRadius={radius.full} />
        <Skeleton width={140} height={28} borderRadius={radius.button} />
      </View>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "center",
          gap: 24,
          // The facts strip's own 16 above and below its 64pt columns.
          paddingVertical: 16,
        }}
      >
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} width={72} height={64} borderRadius={radius.card} />
        ))}
      </View>
      <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: TRUST_PAD_TOP }}>
        <Skeleton width="100%" height={BUTTON_HEIGHT} borderRadius={radius.button} />
      </View>
    </View>
  );
}
