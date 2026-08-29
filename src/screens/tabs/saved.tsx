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
import { FlatList, RefreshControl, View } from "react-native";
import { HeartIcon } from "react-native-heroicons/outline";
import { Text } from "@/components/core";

const COLUMN_GAP = 14;

export default function Saved() {
  const tabBarHeight = useBottomTabBarHeight();
  const { favorites, loading, refreshing, refetch } = useSaved();
  const { authTokens, isAuthenticated } = useGlobalContext();
  const { color, isDark } = useTheme();
  const navigation = useTypedNavigation();

  const renderItem = ({ item }: { item: BackendProduct }) => (
    // flex so the card fills its column, maxWidth so a lone card in a
    // two-column grid stays a column wide instead of stretching full-bleed.
    <View style={{ flex: 1, maxWidth: "48.5%" }}>
      <Card
        id={`${item.name}`}
        image={item.cover_image}
        title={item.title}
        location={item.location}
        price={item.rate}
        isFavorite
      />
    </View>
  );

  const heading = (
    <Text
      accessibilityRole="header"
      fontSize="text-2xl"
      fontWeight="font-bold"
      style={{ marginBottom: 16 }}
    >
      Saved
    </Text>
  );

  return (
    <NonScrollableContainer>
      {authTokens && isAuthenticated ? (
        <View
          style={{ flex: 1, marginTop: 16, paddingHorizontal: SCREEN_GUTTER }}
        >
          {heading}

          {loading ? (
            <FlatList
              data={[0, 1, 2, 3, 4, 5]}
              renderItem={() => (
                <View style={{ flex: 1, maxWidth: "48.5%" }}>
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
              // Saved passed no width to Card, so it fell back to a hard 163pt
              // cap inside a 181pt column and left dead space in every gutter.
              // The cards now fill the column they are given.
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
        <View style={{ flex: 1, marginTop: 16 }}>
          <View style={{ paddingHorizontal: SCREEN_GUTTER }}>{heading}</View>
          <ProfilePreAuth isDarkMode={isDark} />
        </View>
      )}
    </NonScrollableContainer>
  );
}
