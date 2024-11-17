import { Card, Text } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { useGlobalContext } from "@/context/global-context";
import { RouteProps, useTypedNavigation } from "@/lib/types";
import { useRoute } from "@react-navigation/native";
import React from "react";
import { Dimensions, ScrollView, TouchableOpacity, View } from "react-native";
import { ArrowLeftIcon, ShareIcon } from "react-native-heroicons/outline";
import { widthPercentageToDP as wp } from "react-native-responsive-screen";

const { height } = Dimensions.get("window");

const OwnersProductsScreen: React.FC = () => {
  const { theme } = useGlobalContext();

  const { params } = useRoute<RouteProps<"OwnersProducts">>();
  const { products, name } = params;

  const isDarkMode = theme === "dark";
  const router = useTypedNavigation();

  return (
    <NonScrollableContainer height={height > 700 ? 105 : 100}>
      <View
        className="flex-row items-center justify-between px-5"
        style={{ paddingVertical: wp("5%") }}
      >
        <TouchableOpacity
          onPress={() => router.goBack()}
          className="flex-1 items-start w-[10%]"
        >
          <ArrowLeftIcon size={26} color={isDarkMode ? "#FFF" : "#000"} />
        </TouchableOpacity>
        <View className="items-center justify-center w-[80%]">
          <Text fontSize="text-xl" fontWeight="font-bold">
            {name}'s products
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
          {products.map((item, index) => (
            <View
              key={item.name}
              style={{
                marginBottom: 12,
              }}
            >
              <Card
                id={item.name}
                image={item.cover_image}
                title={item.title}
                location={item.location}
                price={item.rate}
                isDarkMode={isDarkMode}
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </NonScrollableContainer>
  );
};

export default OwnersProductsScreen;
