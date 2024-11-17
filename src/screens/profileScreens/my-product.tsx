import { useProfile } from "@/backend/profile";
import { Text } from "@/components/core";
import { MyProductCard } from "@/components/core/my-product-card";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { useGlobalContext } from "@/context/global-context";
import { BackendProduct, useTypedNavigation } from "@/lib/types";
import { useFocusEffect } from "@react-navigation/native";
import React, { useState } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { ArrowLeftIcon, ShareIcon } from "react-native-heroicons/outline";
import { widthPercentageToDP as wp } from "react-native-responsive-screen";
import { Dimensions } from "react-native";

const { height } = Dimensions.get("window");

const MyProductScreen: React.FC = () => {
  const { theme } = useGlobalContext();
  const [myProducts, setMyProducts] = useState<BackendProduct[]>([]);

  const isDarkMode = theme === "dark";
  const router = useTypedNavigation();
  const { getMyProducts } = useProfile();

  const fetchProducts = async () => {
    try {
      const data = await getMyProducts();
      setMyProducts(data);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchProducts();
    }, [])
  );

  return (
    <NonScrollableContainer height={height > 700 ? 105 : 100}>
      <View
        className="flex-row items-center justify-between px-5"
        style={{ paddingVertical: wp("5%") }}
      >
        <TouchableOpacity
          onPress={() =>
            router.navigate("Profile", {
              screen: "profile",
            })
          }
          className="flex-1 items-start w-[10%]"
        >
          <ArrowLeftIcon size={26} color={isDarkMode ? "#FFF" : "#000"} />
        </TouchableOpacity>
        <View className="items-center justify-center w-[80%]">
          <Text fontSize="text-xl" fontWeight="font-bold">
            My products
          </Text>
        </View>

        <View className="w-[10%]"></View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1 }}>
        <View
          className={`flex-row justify-between py-4 border-b-[1px] px-5 ${
            isDarkMode ? "border-b-[#292929]" : "border-b-[#E6E6E6]"
          }`}
        >
          <Text fontSize="text-sm">Share entire catalogue</Text>

          <TouchableOpacity>
            <ShareIcon size={24} color={isDarkMode ? "#FFF" : "#000"} />
          </TouchableOpacity>
        </View>

        {/* Products */}
        <View
          className="flex-row flex-wrap justify-between p-5"
          // style={{ padding: itemMargin }}
        >
          {myProducts.map((item, index) => (
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
        </View>
      </ScrollView>
    </NonScrollableContainer>
  );
};

export default MyProductScreen;
