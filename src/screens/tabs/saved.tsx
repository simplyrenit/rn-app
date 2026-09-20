import useSaved from "@/backend/useSaved";
import {
  Card,
  EmptyState,
  NonScrollableContainer,
  ProductCardSkeleton,
} from "@/components/core";
import ProfilePreAuth from "@/components/profile/pre-auth/profile-pre-auth";
import { useGlobalContext } from "@/context/global-context";
import { SCREEN_GUTTER } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { BackendProduct, useTypedNavigation } from "@/lib/types";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import React from "react";
import { FlatList, RefreshControl, View, useWindowDimensions } from "react-native";
import { HeartIcon } from "react-native-heroicons/outline";
import { Text } from "@/components/core";

// Measured off the Figma Saved frame: a two-column wrap of the same 163pt tile the
// Home rails use, 16 between columns and 24 between rows, under a 61pt topbar
// (16 padding, an H2 title). A column is half of what is left after the gutters
// and the gap, which is exactly 163 on the 390pt frame and shrinks with a narrower
// phone instead of overflowing it; being a width rather than a flex fraction, a
// lone card in the last row stays one column wide.
const COLUMN_GAP = 16;
const TOPBAR_PADDING = 16;

export default function Saved() {
  const tabBarHeight = useBottomTabBarHeight();
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
        isFavorite
        tile
      />
    </View>
  );

  const heading = (
    <Text
      accessibilityRole="header"
      role="screenTitle"
      // The frame's topbar: H2 with 16 above and below it.
      style={{ paddingVertical: TOPBAR_PADDING }}
    >
      Saved
    </Text>
  );

  return (
    <NonScrollableContainer>
      {authTokens && isAuthenticated ? (
        <View
          style={{ flex: 1, paddingHorizontal: SCREEN_GUTTER }}
        >
          {heading}

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
              contentContainerStyle={{ gap: 24 }}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <FlatList
              // The empty state used to be drawn inline at rgba(165,165,165,0.7)
              // — 1.82:1 on white, effectively invisible — with a fontWeight iOS
              // silently ignored, and no route out of the screen.
              ListEmptyComponent={
                <EmptyState
                  icon={<HeartIcon size={26} color={color.brandText} />}
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
              // Measured rather than a fixed percentage: hp("10%") was less
              // than the iOS tab bar height, so the last row stayed clipped.
              contentContainerStyle={{
                gap: 24,
                paddingBottom: tabBarHeight,
                flexGrow: favorites.length ? 0 : 1,
                justifyContent: favorites.length ? "flex-start" : "center",
              }}
            />
          )}
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <View style={{ paddingHorizontal: SCREEN_GUTTER }}>{heading}</View>
          <ProfilePreAuth isDarkMode={isDark} />
        </View>
      )}
    </NonScrollableContainer>
  );
}
