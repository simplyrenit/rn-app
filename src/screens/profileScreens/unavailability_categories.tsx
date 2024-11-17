import { Text } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { useGlobalContext } from "@/context/global-context";
import { useProductContext } from "@/context/product-context";
import { Category, useTypedNavigation } from "@/lib/types";
import { Image } from "expo-image";
import { useEffect } from "react";
import { FlatList, Platform, TouchableOpacity, View } from "react-native";
import {
  ArrowLeftIcon,
  ChevronRightIcon,
} from "react-native-heroicons/outline";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";

export default function UnavailabilityCategories() {
  const { saveDetails } = useProductContext();
  const { theme, categories } = useGlobalContext();
  const router = useTypedNavigation();
  const isDarkMode = theme === "dark";

  useEffect(() => {
    console.log("Categories---: ", categories);
  }, [categories]);

  const onPress = (cat: Category) => {
    router.navigate("UnavailabilitySubCat", {
      category: cat.title,
      subcategories: cat.subcategories,
    });
  };

  const renderItem = ({ item }: { item: Category }) => (
    <TouchableOpacity
      className="flex-row justify-between items-center py-4"
      onPress={() => onPress(item)}
    >
      <View className="flex-row items-center space-x-5">
        <Image
          source={{
            uri:
              theme === "dark"
                ? item.dark_icon ||
                  "https://d1xuzik8wqiepv.cloudfront.net/assets/2024/10/03/JdXQXQHo/trucktrailer.svg"
                : item.light_icon ||
                  "https://d1xuzik8wqiepv.cloudfront.net/assets/2024/10/04/hxvbdzSz/trucktrailer.svg",
          }}
          style={{ width: 20, height: 20 }}
        />
        <Text
          fontSize="text-base"
          className={`${theme === "dark" ? "text-white" : "text-black"}`}
        >
          {item.title}
        </Text>
      </View>
      <ChevronRightIcon
        size={20}
        color={theme === "dark" ? "white" : "black"}
      />
    </TouchableOpacity>
  );

  return (
    <NonScrollableContainer>
      <View
        style={{
          paddingBottom: Platform.OS === "ios" ? hp("7") : hp("0%"),
          flex: Platform.OS === "ios" ? 0 : 1,
        }}
      >
        <View
          className="flex-row items-center justify-between px-5 "
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
              Unavailability Form
            </Text>
          </View>

          <View className="w-[10%]"></View>
        </View>
        <View className="px-5 py-3">
          <Text fontSize="text-base" fontWeight="font-bold">
            Choose a category
          </Text>
        </View>

        <FlatList
          data={categories}
          renderItem={renderItem}
          keyExtractor={(item) => item.title}
          contentContainerStyle={{
            paddingHorizontal: 24,
          }}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </NonScrollableContainer>
  );
}
