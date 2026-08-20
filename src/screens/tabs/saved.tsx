import useSaved from "@/backend/useSaved";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Card, Text } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import Skeleton from "@/components/core/skeleton";
import ProfilePreAuth from "@/components/profile/pre-auth/profile-pre-auth";
import { useGlobalContext } from "@/context/global-context";
import { BackendProduct, useTypedNavigation } from "@/lib/types";
import React from "react";
import { FlatList, View, Dimensions } from "react-native";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";

const margin = wp(5.7);
const { height } = Dimensions.get("window");

export default function Saved() {
  const tabBarHeight = useBottomTabBarHeight();
  const { favorites, loading } = useSaved();
  const { authTokens, isAuthenticated, theme } = useGlobalContext();
  const isDarkMode = theme === "dark";

  const renderItem = ({ item }: { item: BackendProduct }) => (
    <Card
      id={`${item.name}`}
      image={item.cover_image}
      title={item.title}
      location={item.location}
      price={item.rate}
      isFavorite={true}
    />
  );

  const renderSkeleton = () => (
    <View>
      <Skeleton
        style={{
          width: wp("41.5%") > 163 ? 163 : wp("41.5%"),
          borderRadius: 8,
          height: wp("44.5%"),
        }}
      />
      <Skeleton
        style={{
          width: wp(20),
          borderRadius: 8,
          marginTop: 5,
          height: 10,
        }}
      />
      <Skeleton
        style={{
          width: wp(10),
          borderRadius: 8,
          marginTop: 5,
          height: 10,
        }}
      />
      <View className="flex-row mt-2 items-center space-x-2">
        <Skeleton
          style={{
            width: wp(10),
            borderRadius: 8,
            height: 10,
          }}
        />
        <Skeleton
          style={{
            width: wp(5),
            borderRadius: 8,
            height: 10,
          }}
        />
      </View>
    </View>
  );

  return (
    <NonScrollableContainer height={height > 700 ? 105 : 100}>
      {authTokens && isAuthenticated ? (
        <View
          className="mt-4 w-full flex-1"
          style={{ paddingHorizontal: margin }}
        >
          <Text
            fontSize="text-2xl"
            fontWeight="font-bold"
            className="mb-4"
          >
            Saved
          </Text>

          {(loading) ? (
            <FlatList
              data={[0, 1, 2, 3, 4, 5]}
              renderItem={renderSkeleton}
              keyExtractor={(item) => item.toString()}
              numColumns={2}
              columnWrapperStyle={{
                justifyContent: "space-between",
                marginBottom: hp("7%"),
              }}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <FlatList
              ListEmptyComponent={() => <View style={{ padding: 32, height: Dimensions.get('window').height * 0.6, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: 'rgba(165, 165, 165, 0.7)', fontSize: 18, fontWeight: '600' }}>
                  No Saved Product
                </Text>
              </View>
              }
              data={favorites}
              renderItem={renderItem}
              keyExtractor={(item) => item.name}
              numColumns={2}
              columnWrapperStyle={{ justifyContent: "space-between" }}
              showsVerticalScrollIndicator={false}
              // Measured rather than a fixed percentage: hp("10%") was less
              // than the iOS tab bar height, so the last row stayed clipped.
              contentContainerStyle={{ paddingBottom: tabBarHeight }}
            />
          )}
        </View>
      ) : (
        <View className="mt-4 w-full flex-1">
          <Text
            fontSize="text-2xl"
            fontWeight="font-bold"
            className="mb-4"
            style={{ paddingHorizontal: margin }}
          >
            Saved
          </Text>
          <ProfilePreAuth isDarkMode={isDarkMode} />
        </View>
      )}
    </NonScrollableContainer>
  );
}
