import { Card, Text } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { useGlobalContext } from "@/context/global-context";
import { RouteProps, useTypedNavigation } from "@/lib/types";
import { useRoute } from "@react-navigation/native";
import React from "react";
import { Dimensions, FlatList, TouchableOpacity, View } from "react-native";
import { ArrowLeftIcon, ShareIcon } from "react-native-heroicons/outline";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";

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

      <FlatList
        style={{ width: "100%" }}
        data={products}
        ListHeaderComponent={(
          <View
            className={`flex-row justify-between py-4 border-b-[1px] px-5 ${isDarkMode ? "border-b-[#292929]" : "border-b-[#E6E6E6]"
              }`}
          >
            <Text fontSize="text-sm">Share entire catalogue</Text>

            <TouchableOpacity>
              <ShareIcon size={24} color={isDarkMode ? "#FFF" : "#000"} />
            </TouchableOpacity>
          </View>
        )}
        keyExtractor={(item) => item.name}
        numColumns={2}
        columnWrapperStyle={{
          justifyContent: "space-between",
          marginTop: 8,
          gap: 12,
        }}
        // Same fix as the search results grid: centring the content container
        // makes each row shrink-wrap, so the cards' "48.5%" resolved against a
        // collapsed row. columnWrapperStyle's space-between does the real work.
        contentContainerStyle={{ paddingBottom: hp("10%") }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <Card
            id={item.name}
            image={item.cover_image}
            title={item.title}
            location={item.location}
            price={item.rate}
            width='48.5%'
          />
        )}
      />
    </NonScrollableContainer>
  );
};

export default OwnersProductsScreen;
