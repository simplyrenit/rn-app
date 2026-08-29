import { Card, Text } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { useGlobalContext } from "@/context/global-context";
import { RouteProps, useTypedNavigation } from "@/lib/types";
import { useRoute } from "@react-navigation/native";
import React from "react";
import { Dimensions, FlatList, TouchableOpacity, View } from "react-native";
import { ArrowLeftIcon } from "react-native-heroicons/outline";
import { IOSShareIcon } from "@/icons/share";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";
import { ink } from "@/lib/design-tokens";

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
        className="flex-row items-center justify-between px-gutter"
        style={{ paddingVertical: wp("5%") }}
      >
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back"
          onPress={() => router.goBack()}
          className="flex-1 items-start w-[10%]"
        >
          <ArrowLeftIcon size={26} color={ink.text(isDarkMode)} />
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
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Share this catalogue"
            className={`flex-row justify-between items-center px-gutter border-b-[1px] ${isDarkMode ? "border-b-line-dark" : "border-b-line-light"
              }`}
            style={{ minHeight: 44 }}
          >
            <Text fontSize="text-md">Share this catalogue</Text>
            <IOSShareIcon size={20} color={ink.body(isDarkMode)} />
          </TouchableOpacity>
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
