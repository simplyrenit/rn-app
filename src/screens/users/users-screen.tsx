import { useChat } from "@/backend/chat";
import useOwner from "@/backend/owner";
import useReviews from "@/backend/reviews";
import {
  Avatar,
  BackButton,
  Button,
  Card,
  CrossFade,
  SectionHeader,
  StaticContainer,
  Text,
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
import React, { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  CalendarIcon,
  CheckBadgeIcon,
  MapPinIcon,
  ShieldExclamationIcon,
  StarIcon,
  Squares2X2Icon,
} from "react-native-heroicons/outline";
import { CheckBadgeIcon as CheckBadgeSolid } from "react-native-heroicons/solid";

import { toast } from "@/lib/toast";
import {
  MIN_TOUCH_TARGET,
  SCREEN_GUTTER,
  density,
  radius,
} from "@/lib/design-tokens";
import { describeRating } from "@/lib/rating";
import { useTheme } from "@/lib/theme";

const RAIL_CARD_WIDTH = 158;
const RAIL_GAP = 14;

/**
 * Fields the owner object embedded in a listing carries but `PublicOwner` — the
 * shape returned by `owner-details/` — does not. `src/lib/types.ts` belongs to
 * another lane, so the extra fields are described here and read off the listing
 * payload the profile already fetches. See the handoff note.
 */
interface OwnerTrustFields {
  email_verified?: boolean;
  phone_verified?: boolean;
  account_type?: string;
  business_name?: string | null;
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
  // are the only part anyone reads.
  const joinedDateLabel = owner?.date_joined
    ? new Date(owner.date_joined).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
      })
    : "—";

  /**
   * The profile exists to make a renter comfortable handing over a deposit, and
   * offered three numbers to do it with. These are the rest of what the API
   * actually knows about this person: identity verification, whether they trade
   * as a business, and the area their listings are in. Nothing here is invented
   * — a signal the payload does not carry is simply not drawn.
   */
  const listedOwner = products[0]?.owner as
    | (NonNullable<BackendProduct["owner"]> & OwnerTrustFields)
    | undefined;
  const emailVerified = listedOwner?.email_verified;
  const phoneVerified = listedOwner?.phone_verified;
  const businessName =
    listedOwner?.account_type && listedOwner.account_type !== "user"
      ? listedOwner.business_name || null
      : null;

  // Where this person's listings are. A renter cares far more about "are they
  // near me" than about any badge, and the listings already say it.
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

  const trustRows: {
    key: string;
    icon: React.ReactNode;
    label: string;
    met: boolean;
  }[] = [];

  if (typeof emailVerified === "boolean") {
    trustRows.push({
      key: "email",
      icon: emailVerified ? (
        <CheckBadgeSolid size={18} color={color.success} />
      ) : (
        <ShieldExclamationIcon size={18} color={color.textDim} />
      ),
      label: emailVerified ? "Email verified" : "Email not verified",
      met: emailVerified,
    });
  }
  if (typeof phoneVerified === "boolean") {
    trustRows.push({
      key: "phone",
      icon: phoneVerified ? (
        <CheckBadgeSolid size={18} color={color.success} />
      ) : (
        <ShieldExclamationIcon size={18} color={color.textDim} />
      ),
      label: phoneVerified ? "Phone verified" : "Phone not verified",
      met: phoneVerified,
    });
  }
  if (primaryArea) {
    trustRows.push({
      key: "area",
      icon: <MapPinIcon size={18} color={color.textBody} />,
      label: `Lists in ${primaryArea}`,
      met: true,
    });
  }

  const stats = [
    {
      key: "rating",
      icon: (
        <StarIcon
          color={ratingDisplay.rated ? color.warning : color.textDim}
          size={22}
        />
      ),
      value: ratingDisplay.label,
      // "0.0" under the word "Rating" told every unrated host they were scored
      // zero out of five. A host with no reviews is New.
      caption: ratingDisplay.rated ? "Rating" : "Host",
    },
    {
      key: "listings",
      icon: <Squares2X2Icon color={color.textBody} size={22} />,
      value: `${products.length}`,
      caption: products.length === 1 ? "Listing" : "Listings",
    },
    {
      key: "joined",
      icon: <CalendarIcon color={color.textBody} size={22} />,
      value: joinedDateLabel,
      caption: "Member since",
    },
  ];

  const divider = (
    <View
      style={{
        marginVertical: density.section,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: color.line,
      }}
    />
  );

  return (
    <StaticContainer width={100}>
      {/* The back control and the title used to live inside the scroll, so both
          were gone the moment the customer moved a finger. */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 10,
          paddingVertical: 6,
        }}
      >
        <BackButton />
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text role="screenTitle" numberOfLines={1}>
            Owner
          </Text>
        </View>
        <View style={{ width: MIN_TOUCH_TARGET }} />
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <CrossFade loading={loading} placeholder={<OwnerSkeleton />}>
          <View style={{ paddingBottom: density.section * 3 }}>
            <View style={{ alignItems: "center", gap: 6 }}>
              <Avatar
                uri={owner?.image?.image_url}
                name={`${owner?.first_name ?? ""} ${owner?.last_name ?? ""}`.trim()}
                size={96}
              />
              <Text role="sectionTitle" style={{ marginTop: 6 }}>
                {owner?.first_name} {owner?.last_name}
              </Text>
              {businessName ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 5,
                    backgroundColor: color.brandWash,
                    borderRadius: radius.full,
                    paddingHorizontal: 9,
                    paddingVertical: 3,
                  }}
                >
                  <CheckBadgeIcon size={14} color={color.brandText} />
                  <Text fontSize="text-xs" fontWeight="font-semibold" tone="brand">
                    {businessName}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Same three-up strip the product detail and post review use. */}
            <View style={{ paddingTop: density.section }}>
              <SpecStrip
                dividers={false}
                items={stats.map((stat) => ({
                  icon: stat.icon,
                  value: stat.value,
                  label: stat.caption,
                }))}
              />
            </View>

            {trustRows.length ? (
              <View
                style={{
                  marginTop: density.section,
                  marginHorizontal: SCREEN_GUTTER,
                  padding: density.block,
                  gap: 10,
                  borderRadius: radius.group,
                  borderWidth: StyleSheet.hairlineWidth,
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
                      tone={row.met ? "hi" : "dim"}
                      numberOfLines={1}
                      style={{ flex: 1 }}
                    >
                      {row.label}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            {!isOwner && (
              <View style={{ paddingHorizontal: SCREEN_GUTTER, marginTop: density.section }}>
                <Button
                  onPress={handleStartChat}
                  loading={messaging}
                  disabled={messaging}
                >
                  {`Message ${owner?.first_name ?? "the owner"}`}
                </Button>
              </View>
            )}

            {divider}

            <SectionHeader
              title="Listings"
              subtitle={`${products.length} ${
                products.length === 1 ? "item" : "items"
              }`}
            />
            {products.length ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  paddingHorizontal: SCREEN_GUTTER,
                  gap: RAIL_GAP,
                }}
              >
                {products.slice(0, 4).map((item) => (
                  <View key={item.name} style={{ width: RAIL_CARD_WIDTH }}>
                    <Card
                      id={item.name}
                      image={item.cover_image}
                      title={item.title}
                      location={item.location}
                      price={item.rate.toString()}
                      coordinates={item.coordinates}
                    />
                  </View>
                ))}
              </ScrollView>
            ) : (
              <Text
                fontSize="text-sm"
                tone="body"
                style={{ paddingHorizontal: SCREEN_GUTTER }}
              >
                Nothing listed yet
              </Text>
            )}

            {products.length > 2 ? (
              <View style={{ paddingHorizontal: SCREEN_GUTTER }}>
                <Button
                  variant="outline"
                  size="compact"
                  style={{ marginTop: 12 }}
                  onPress={() =>
                    navigation.navigate("OwnersProducts", {
                      products: products,
                      name: owner?.first_name!,
                    })
                  }
                >
                  {`See all ${products.length} listings`}
                </Button>
              </View>
            ) : null}

            {divider}

            <SectionHeader
              title="Reviews"
              subtitle={
                ownerReviews.length
                  ? `${ownerReviews.length} ${
                      ownerReviews.length === 1 ? "review" : "reviews"
                    }`
                  : undefined
              }
            />
            {ownerReviews.length ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  paddingHorizontal: SCREEN_GUTTER,
                  gap: RAIL_GAP,
                }}
              >
                {ownerReviews.map((item) => (
                  <View key={item.id} style={{ width: 260 }}>
                    <ReviewCard
                      reviewText={item.comment}
                      reviewerName={`${item.reviewer.first_name} ${item.reviewer.last_name}`}
                      reviewDate={item.created_at}
                      reviewerImage={item.reviewer.image}
                    />
                  </View>
                ))}
              </ScrollView>
            ) : (
              <Text
                fontSize="text-sm"
                tone="body"
                style={{ paddingHorizontal: SCREEN_GUTTER }}
              >
                No reviews yet
              </Text>
            )}

            {ownerReviews.length > 1 ? (
              <View style={{ paddingHorizontal: SCREEN_GUTTER }}>
                <Button
                  onPress={() =>
                    navigation.navigate("OwnersReviewScreen", {
                      owner: owner!,
                      reviews: ownerReviews,
                    })
                  }
                  variant="outline"
                  size="compact"
                  style={{ marginTop: 12 }}
                >
                  {`See all ${ownerReviews.length} reviews`}
                </Button>
              </View>
            ) : null}
          </View>
        </CrossFade>
      </ScrollView>
    </StaticContainer>
  );
}

/** Mirrors the profile's own rhythm so the cross-fade does not move anything. */
function OwnerSkeleton() {
  return (
    <View style={{ alignItems: "center", gap: 12 }}>
      <Skeleton width={96} height={96} borderRadius={radius.full} />
      <Skeleton width={160} height={22} borderRadius={radius.button} />
      <View
        style={{
          flexDirection: "row",
          gap: 24,
          marginTop: density.section,
        }}
      >
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} width={72} height={54} borderRadius={radius.card} />
        ))}
      </View>
      <View style={{ width: "100%", paddingHorizontal: SCREEN_GUTTER, marginTop: density.section }}>
        <Skeleton width="100%" height={96} borderRadius={radius.group} />
      </View>
    </View>
  );
}
