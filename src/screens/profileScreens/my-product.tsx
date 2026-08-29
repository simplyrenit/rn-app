import { useProfile } from "@/backend/profile";
import { StaticContainer, Text } from "@/components/core";
import { MyProductCard } from "@/components/core/my-product-card";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { useGlobalContext } from "@/context/global-context";
import { BackendProduct, useTypedNavigation } from "@/lib/types";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { RefreshControl } from "react-native";
import { EmptyState } from "@/components/core";
import { Squares2X2Icon } from "react-native-heroicons/outline";
import { colors } from "@/lib/design-tokens";
import { ActivityIndicator, TouchableOpacity, View } from "react-native";
import { ArrowLeftIcon } from "react-native-heroicons/outline";
import { IOSShareIcon } from "@/icons/share";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from "react-native-responsive-screen";
import { Dimensions } from "react-native";
import { FlatList } from "react-native";
import ProfilePreAuth from "@/components/profile/pre-auth/profile-pre-auth";
import { SCREEN_GUTTER, ink } from "@/lib/design-tokens";

const { height } = Dimensions.get("window");

const MyProductScreen: React.FC = () => {
  const { theme, authTokens, isAuthenticated } = useGlobalContext();
  const [myProducts, setMyProducts] = useState<BackendProduct[]>([]);
  const [nextProductLink, setNextProductLink] = useState<string | null>(null);
  const isDarkMode = theme === "dark";
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

  const fetchNextProducts = useCallback(() => { }, [])

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

  if (!authTokens || !isAuthenticated) {
    return (
      <StaticContainer width={100}>
        <View className="flex-row items-center justify-between px-gutter py-2 pt-4">
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back"
            onPress={() =>
              router.navigate("MainTabs", {
                screen: "Profile",
              })
            }
            className="flex-1 items-start w-[10%]"
          >
            <ArrowLeftIcon
              size={26}
              color={ink.text(isDarkMode)}
            />
          </TouchableOpacity>
          <View className=" justify-center w-[80%]">
            <Text
              fontSize="text-xl"
              fontWeight="font-bold"
            >
              My listings
            </Text>
          </View>

          <View className="w-[10%]"></View>
        </View>
        <ProfilePreAuth isDarkMode={isDarkMode} />
      </StaticContainer>
    );
  }

  return (
    <NonScrollableContainer height={height > 700 ? 105 : 100}>
      <View className="flex-row items-center justify-between px-gutter py-2 pt-4">
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back"
          onPress={() =>
            router.navigate("MainTabs", {
              screen: "Profile",
            })
          }
          className="flex-1 items-start w-[10%]"
        >
          <ArrowLeftIcon
            size={26}
            color={ink.text(isDarkMode)}
          />
        </TouchableOpacity>
        <View className="items-center justify-center w-[80%]">
          <Text
            fontSize="text-xl"
            fontWeight="font-bold"
          >
            My listings
          </Text>
        </View>

        <View className="w-[10%]"></View>
      </View>

      <FlatList
        style={{ width: "100%" }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={ink.body(isDarkMode)}
            colors={[colors.dark.brand]}
          />
        }
        data={myProducts}
        ListHeaderComponent={(
          <View
            className={`flex-row justify-between py-4 border-b-[1px] px-gutter ${isDarkMode ? "border-b-line-dark" : "border-b-line-light"
              }`}
          >
            <Text fontSize="text-sm">Share entire catalogue</Text>

            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Share">
              <IOSShareIcon size={22} color={ink.text(isDarkMode)} />
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            icon={<Squares2X2Icon size={26} color={ink.brandText(isDarkMode)} />}
            title="You haven't listed anything yet"
            body="List something you already own and it will show up here."
            actionLabel="List an item"
            onAction={() => router.navigate("MainTabs")}
          />
        }
        ListFooterComponent={nextProductLink ? () => isLoading ? (
          <View>
            <ActivityIndicator color={ink.text(isDarkMode)} />
          </View>
        ) : <View>
          <Text>Load More</Text>
        </View> : undefined}
        onEndReached={nextProductLink ? () => fetchProducts(nextProductLink) : undefined}
        keyExtractor={(item, index) => `${index}_${item.name}`}
        numColumns={2}
        // The grid's own gutter, matching every other product grid in the app.
        // `alignItems: center` on the content container made each row
        // shrink-wrap, which is how rows one and two ended up starting at
        // different offsets.
        columnWrapperStyle={{
          justifyContent: "flex-start",
          paddingHorizontal: SCREEN_GUTTER,
          marginTop: 16,
          gap: 14,
        }}
        contentContainerStyle={{ paddingBottom: hp("10%") }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <MyProductCard
            key={index}
            id={item.name}
            image={item.cover_image}
            title={item.title}
            location={item.location}
            price={item.rate}
            isDarkMode={isDarkMode}
            moderationLabels={item.moderation_labels}
            adminApproved={item.admin_approved}
            width="48.5%"
          />
        )}
      />
      {/* <View
          className="flex-row flex-wrap justify-between p-5"
        // style={{ padding: itemMargin }}
        >
          {myProducts?.map((item, index) => (
            <View
              key={item.name}
              style={{
                marginBottom: 12,
              }}
            >
              <MyProductCard
                id={item.name}
                image={item.cover_image}
                title={item.title}
                location={item.location}
                price={item.rate}
                isDarkMode={isDarkMode}
                moderationLabels={item.moderation_labels}
              />
            </View>
          ))}
        </View> */}
    </NonScrollableContainer>
  );
};

export default MyProductScreen;
