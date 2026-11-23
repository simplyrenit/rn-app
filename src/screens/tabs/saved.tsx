import useSaved from "@/backend/useSaved";
import {
  Card,
  EmptyState,
  NonScrollableContainer,
  ProductCardSkeleton,
  SubpageHeader,
} from "@/components/core";
import ProfilePreAuth from "@/components/profile/pre-auth/profile-pre-auth";
import { useGlobalContext } from "@/context/global-context";
import { SCREEN_GUTTER } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { BackendProduct, useTypedNavigation } from "@/lib/types";
import React from "react";
import { FlatList, RefreshControl, View, useWindowDimensions } from "react-native";
import { HeartIcon } from "react-native-heroicons/outline";

// The 2.1 Saved frames (2089:27772, 2089:27893): the kit Top bar's tab title,
// then 16 down to a two-column wrap of the 162 Listing card, 18 between columns
// and 24 between rows. A column is half of what is left after the gutters and
// the gap, which is exactly 162 on the 390pt frame and shrinks with a narrower
// phone instead of overflowing it; being a width rather than a flex fraction, a
// lone card in the last row stays one column wide. The empty state sits 156
// under the top bar, where the frame draws it.
const COLUMN_GAP = 18;
const ROW_GAP = 24;
const GRID_TOP = 16;
const EMPTY_TOP = 156;

export default function Saved() {
  const { favorites, loading, refreshing, refetch } = useSaved();
  const { authTokens, isAuthenticated } = useGlobalContext();
  const { color, isDark } = useTheme();
  const navigation = useTypedNavigation();
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = Math.floor(
    (screenWidth - 2 * SCREEN_GUTTER - COLUMN_GAP) / 2
  );

  const renderItem = ({ item }: { item: BackendProduct }) => (
    <View style={{ width: cardWidth }}>
      <Card
        id={`${item.name}`}
        image={item.cover_image}
        title={item.title}
        location={item.location}
        price={item.rate}
        plans={item.plans}
        isFavorite
        tile
      />
    </View>
  );

  return (
    <NonScrollableContainer>
      <SubpageHeader variant="tab-title" title="Saved" />
      {authTokens && isAuthenticated ? (
        <View
          style={{ flex: 1, paddingHorizontal: SCREEN_GUTTER }}
        >
          {loading ? (
            <FlatList
              data={[0, 1, 2, 3, 4, 5]}
              renderItem={() => (
                <View style={{ width: cardWidth }}>
                  <ProductCardSkeleton />
                </View>
              )}
              keyExtractor={(item) => item.toString()}
              numColumns={2}
              columnWrapperStyle={{ gap: COLUMN_GAP }}
              contentContainerStyle={{ gap: ROW_GAP, paddingTop: GRID_TOP }}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <FlatList
              // The empty state used to be drawn inline at rgba(165,165,165,0.7)
              // — 1.82:1 on white, effectively invisible — with a fontWeight iOS
              // silently ignored, and no route out of the screen.
              ListEmptyComponent={
                <EmptyState
                  icon={<HeartIcon color={color.text} strokeWidth={1.5} />}
                  title="Nothing saved yet"
                  body="Tap the heart on any listing and it will wait for you here."
                  actionLabel="Browse listings"
                  onAction={() => navigation.navigate("MainTabs")}
                />
              }
              data={favorites}
              renderItem={renderItem}
              keyExtractor={(item) => item.name}
              numColumns={2}
              columnWrapperStyle={
                favorites.length ? { gap: COLUMN_GAP } : undefined
              }
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => void refetch()}
                  tintColor={color.textBody}
                  colors={[color.brand]}
                />
              }
              // The tab bar is in the layout below this grid, so the scroll
              // already ends above it; bar-height padding doubled the gap.
              contentContainerStyle={{
                gap: ROW_GAP,
                paddingTop: favorites.length ? GRID_TOP : EMPTY_TOP,
                paddingBottom: 24,
              }}
            />
          )}
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <ProfilePreAuth isDarkMode={isDark} />
        </View>
      )}
    </NonScrollableContainer>
  );
}
