import { Text } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { PostProductHeader } from "@/components/post/header";
import { useGlobalContext } from "@/context/global-context";
import { useProductContext } from "@/context/product-context";
import { Category, RouteProps, useTypedNavigation } from "@/lib/types";
import { Image } from "expo-image";
import { FlatList, Platform, TouchableOpacity, View } from "react-native";
import {
  ArrowLeftIcon,
  ChevronRightIcon,
} from "react-native-heroicons/outline";
import { heightPercentageToDP as hp } from "react-native-responsive-screen";
import { CategoryFilter } from "../../../components/search/category-filter";
import { useRoute } from "@react-navigation/native";

export default function EditCategory() {
  const { theme, categories } = useGlobalContext();
  const navigation = useTypedNavigation();

  const route = useRoute<RouteProps<"EditCategory">>();
  const { name } = route.params;

  const onPress = (cat: Category) => {
    const category = {
      title: cat.title,
      dark_icon: cat.dark_icon,
      light_icon: cat.light_icon,
      subcategories: cat.subcategories,
    };
    // saveDetails({ category });
    navigation.navigate("EditSubCategories", {
      name: name,
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
        <View className="flex-row items-center justify-between">
          <View className="w-[10%]">
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              className={`flex-row items-center py-4 px-6`}
            >
              <View className="mt-1 pr-1">
                <ArrowLeftIcon
                  className=""
                  size={20}
                  color={theme === "dark" ? "white" : "black"}
                />
              </View>
            </TouchableOpacity>
          </View>
          <View className="w-[80%]">
            <View className="h-24 items-center justify-center">
              <Text fontSize="text-lg" fontWeight="font-bold">
                Edit Category
              </Text>
            </View>
          </View>
          <View className="w-[10%]"></View>
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
