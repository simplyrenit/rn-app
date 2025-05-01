import { useProfile } from "@/backend/profile";
import { StaticContainer, Text } from "@/components/core";
import { MyProductCard } from "@/components/core/my-product-card";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { useGlobalContext } from "@/context/global-context";
import { BackendProduct, useTypedNavigation } from "@/lib/types";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, TouchableOpacity, View } from "react-native";
import { ArrowLeftIcon, ShareIcon } from "react-native-heroicons/outline";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from "react-native-responsive-screen";
import { Dimensions } from "react-native";
import { FlatList } from "react-native";
import ProfilePreAuth from "@/components/profile/pre-auth/profile-pre-auth";

const { height } = Dimensions.get("window");

const MyProductScreen: React.FC = () => {
  const { theme, authTokens, isAuthenticated } = useGlobalContext();
  const [myProducts, setMyProducts] = useState<BackendProduct[]>([]);
  const [nextProductLink, setNextProductLink] = useState<string | null>(null);
  const isDarkMode = theme === "dark";
  const router = useTypedNavigation();
  const { getMyProducts } = useProfile();
  const [isLoading, setIsLoading] = useState(false);

  const fetchNextProducts = useCallback(() => { }, [])

  const fetchProducts = useCallback(async (link?: string) => {
    if (isLoading) {
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
      setMyProducts([]);
      fetchProducts();
    }, [])
  );

  if (!authTokens || !isAuthenticated) {
    return (
      <StaticContainer width={100}>
        <View className="flex-row items-center justify-between px-5 py-2 pt-4">
          <TouchableOpacity
            onPress={() =>
              router.navigate("MainTabs", {
                screen: "Profile",
              })
            }
            className="flex-1 items-start w-[10%]"
          >
            <ArrowLeftIcon
              size={26}
              color={isDarkMode ? "#FFF" : "#000"}
            />
          </TouchableOpacity>
          <View className=" justify-center w-[80%]">
            <Text
              fontSize="text-xl"
              fontWeight="font-bold"
            >
              My products
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
      <View className="flex-row items-center justify-between px-5 py-2 pt-4">
        <TouchableOpacity
          onPress={() =>
            router.navigate("MainTabs", {
              screen: "Profile",
            })
          }
          className="flex-1 items-start w-[10%]"
        >
          <ArrowLeftIcon
            size={20}
            color={isDarkMode ? "#FFF" : "#000"}
          />
        </TouchableOpacity>
        <View className="items-center justify-center w-[80%]">
          <Text
            fontSize="text-xl"
            fontWeight="font-bold"
          >
            My products
          </Text>
        </View>

        <View className="w-[10%]"></View>
      </View>

      <ScrollView
        className="flex-1 pt-2"
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View
          className={`flex-row justify-between py-4 border-b-[1px] px-5 ${isDarkMode ? "border-b-[#292929]" : "border-b-[#E6E6E6]"
            }`}
        >
          <Text fontSize="text-sm">Share entire catalogue</Text>

          <TouchableOpacity>
            <ShareIcon
              size={24}
              color={isDarkMode ? "#FFF" : "#000"}
            />
          </TouchableOpacity>
        </View>

        {/* Products */}
        <FlatList
          style={{ width: '100%', }}
          data={myProducts}
          ListEmptyComponent={() => <View style={{ padding: 32, height: Dimensions.get('window').height * 0.6, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: 'rgba(165, 165, 165, 0.7)', fontSize: 18, fontWeight: '600' }}>
              No products
            </Text>
          </View>
          }
          ListFooterComponent={nextProductLink ? () => isLoading ? (
            <View>
              <ActivityIndicator color={isDarkMode ? '#fff' : '#000'} />
            </View>
          ) : <View>
            <Text>Load More</Text>
          </View> : undefined}
          onEndReached={nextProductLink ? () => fetchProducts(nextProductLink) : undefined}
          keyExtractor={(item, index) => `${index}_${item.name}`}
          numColumns={2}
          columnWrapperStyle={{
            justifyContent: "space-between",
            marginTop: 8,
            gap: 16,
          }}
          contentContainerStyle={{ paddingBottom: hp("10%"), justifyContent: 'flex-start', alignItems: 'center', width: '100%', }}
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
              width='48.5%'
              alignItems={index % 2 ? 'flex-start' : 'flex-end'}
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
      </ScrollView>
    </NonScrollableContainer>
  );
};

export default MyProductScreen;
