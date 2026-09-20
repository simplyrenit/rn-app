import { useProfile } from "@/backend/profile";
import { StaticContainer, SubpageHeader, Text } from "@/components/core";
import { MyProductCard } from "@/components/core/my-product-card";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import {
  ListingStatusPill,
  resolveListingStatus,
} from "@/components/product/listing-status";
import { useGlobalContext } from "@/context/global-context";
import { BackendProduct, useTypedNavigation } from "@/lib/types";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { RefreshControl, Share } from "react-native";
import { EmptyState } from "@/components/core";
import {
  PencilSquareIcon,
  ShareIcon,
  Squares2X2Icon,
} from "react-native-heroicons/outline";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  TouchableOpacity,
  View,
} from "react-native";
import ProfilePreAuth from "@/components/profile/pre-auth/profile-pre-auth";
import { SCREEN_GUTTER, colors, density, radius } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";


const GRID_GAP = 14;
/** The frame's share row: 51pt with its hairline. */
const SHARE_ROW_HEIGHT = 51;
/** The frame's Edit button under each card. */
const EDIT_BUTTON_HEIGHT = 44;

/**
 * An exact column width. Two cards at "48.5%" plus a 14pt gap comes to more
 * than the row, so the right-hand card was clipped against the screen edge.
 */
const COLUMN_WIDTH =
  (Dimensions.get("window").width - SCREEN_GUTTER * 2 - GRID_GAP) / 2;

const MyProductScreen: React.FC = () => {
  const { authTokens, isAuthenticated } = useGlobalContext();
  const [myProducts, setMyProducts] = useState<BackendProduct[]>([]);
  const [nextProductLink, setNextProductLink] = useState<string | null>(null);
  const { color, isDark } = useTheme();
  const router = useTypedNavigation();
  const { getMyProducts } = useProfile();
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await fetchProducts();
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const fetchProducts = useCallback(async (link?: string) => {
    if (!isAuthenticated || isLoading) {
      return;
    }
    setIsLoading(true);
    try {
      const data = await getMyProducts(link);
      setMyProducts(prev => [...prev, ...(data.results ?? [])]);
      setNextProductLink(data.links.next);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setIsLoading(false)
    }
  }, [isLoading]);

  useFocusEffect(
    React.useCallback(() => {
      if (!isAuthenticated) {
        return;
      }
      setMyProducts([]);
      fetchProducts();
    }, [isAuthenticated])
  );

  const goToProfile = () =>
    router.navigate("MainTabs", {
      screen: "Profile",
    });

  const handleShare = async () => {
    const line = `My listings on Renit — ${myProducts.length} ${
      myProducts.length === 1 ? "item" : "items"
    } to rent`;
    try {
      await Share.share({ message: line });
    } catch {
      toast.error("Couldn’t open the share sheet");
    }
  };

  // "My Products", as the Profile row and the frame name it; this screen said
  // "My listings" at 28pt.
  const header = <SubpageHeader title="My Products" onBack={goToProfile} />;

  /**
   * The frame's row under the header: the action in words, the share glyph on the
   * right, and a hairline closing it. It replaces the bare glyph that sat in the
   * header, which said nothing about what it would share.
   */
  const shareRow = (
    <TouchableOpacity
      onPress={handleShare}
      accessibilityRole="button"
      accessibilityLabel="Share entire catalogue"
      accessibilityHint="Opens the system share sheet"
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        minHeight: SHARE_ROW_HEIGHT,
        paddingHorizontal: SCREEN_GUTTER,
        borderBottomWidth: 1,
        borderBottomColor: color.line,
      }}
    >
      <Text fontSize="text-md">Share entire catalogue</Text>
      <ShareIcon size={24} color={color.text} strokeWidth={1.5} />
    </TouchableOpacity>
  );

  if (!authTokens || !isAuthenticated) {
    return (
      <StaticContainer width={100}>
        {header}
        <ProfilePreAuth isDarkMode={isDark} />
      </StaticContainer>
    );
  }

  return (
    <NonScrollableContainer>
      {header}
      {shareRow}

      <FlatList
        style={{ width: "100%" }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={color.textBody}
            colors={[colors.dark.brand]}
          />
        }
        data={myProducts}
        ListEmptyComponent={
          <EmptyState
            icon={<Squares2X2Icon size={26} color={color.brandText} />}
            title="You haven't listed anything yet"
            body="List something you already own and it will show up here."
            actionLabel="List an item"
            onAction={() => router.navigate("MainTabs")}
          />
        }
        ListFooterComponent={nextProductLink ? () => isLoading ? (
          <View>
            <ActivityIndicator color={color.text} />
          </View>
        ) : <View>
          <Text>Load More</Text>
        </View> : undefined}
        onEndReached={nextProductLink ? () => fetchProducts(nextProductLink) : undefined}
        keyExtractor={(item, index) => `${index}_${item.name}`}
        numColumns={2}
        columnWrapperStyle={{
          justifyContent: "flex-start",
          paddingHorizontal: SCREEN_GUTTER,
          marginTop: 24,
          gap: GRID_GAP,
        }}
        contentContainerStyle={{ paddingBottom: density.listFooter }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          // Only the failing states were ever labelled, so a published listing
          // was told apart from a broken one by the absence of a badge. Every
          // row now says what state it is in, in one place and one language.
          //
          // `MyProductCard` still draws its own "Pending" chip over the photo,
          // so that one state reads twice until the chip is removed there — it
          // lives in `components/core`, which this lane does not own. Faking
          // `adminApproved` to suppress it would be worse than the repetition.
          const status = resolveListingStatus({
            moderationLabels: item.moderation_labels,
            adminApproved: item.admin_approved,
          });
          return (
            <View style={{ width: COLUMN_WIDTH }}>
              <MyProductCard
                id={item.name}
                image={item.cover_image}
                title={item.title}
                location={item.location}
                price={item.rate}
                isDarkMode={isDark}
                moderationLabels={item.moderation_labels}
                adminApproved={item.admin_approved}
                width="100%"
              />
              {status ? (
                <View style={{ marginTop: 6 }}>
                  <ListingStatusPill status={status} />
                </View>
              ) : null}
              {/* The frame's Edit button. The card already opens the editor on
                  tap; this says so in words, at the size of a button. */}
              <TouchableOpacity
                onPress={() => router.navigate("editProduct", { id: item.name })}
                accessibilityRole="button"
                accessibilityLabel={`Edit ${item.title}`}
                style={{
                  marginTop: 8,
                  height: EDIT_BUTTON_HEIGHT,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  borderRadius: radius.button,
                  borderWidth: 1,
                  borderColor: color.inputLine,
                }}
              >
                <PencilSquareIcon size={20} color={color.text} />
                <Text fontSize="text-md" fontWeight="font-bold">
                  Edit
                </Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />
    </NonScrollableContainer>
  );
};

export default MyProductScreen;
