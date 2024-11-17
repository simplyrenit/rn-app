import { StaticContainer, Text } from "@/components/core";
import { PostProductHeader } from "@/components/post/header";
import { useGlobalContext } from "@/context/global-context";
import { useProductContext } from "@/context/product-context";
import { RouteProps, Subcategory, useTypedNavigation } from "@/lib/types";
import { useRoute } from "@react-navigation/native";
import { Image } from "expo-image";
import { FlatList, Platform, TouchableOpacity, View } from "react-native";
import { heightPercentageToDP as hp } from "react-native-responsive-screen";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
} from "react-native-heroicons/outline";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";

export default function PostSubCategories() {
  const route = useRoute<RouteProps<"PostSubCategories">>();
  const navigation = useTypedNavigation();
  const { theme } = useGlobalContext();
  const { saveDetails } = useProductContext();

  // Destructure the category and subcategories from route params
  const { category, subcategories } = route.params;

  const onPress = (subcategory: Subcategory) => {
    saveDetails({ subcategory });
    navigation.navigate("AboutProduct");
  };

  const renderItem = ({ item }: { item: Subcategory }) => (
    <TouchableOpacity
      className="flex-row justify-between items-center py-4"
      onPress={() => onPress(item)}
    >
      <View className="flex-row items-center space-x-5">
        <Image
          source={{
            uri:
              theme === "dark" ? item.dark_icon || "" : item.light_icon || "",
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
          paddingBottom: Platform.OS === "ios" ? hp("14%") : hp("0%"),
          flex: Platform.OS === "ios" ? 0 : 1,
        }}
      >
        <PostProductHeader heading="Choose a subcategory" percentage={10} />

        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className={`flex-row items-center py-4 border-b px-5 ${
            theme === "dark" ? "border-b-[#292929]" : "border-b-[#e6e6e6]"
          }`}
        >
          <View className="mt-1 pr-1 ">
            <ChevronLeftIcon
              size={24}
              color={theme === "dark" ? "white" : "black"}
            />
          </View>
          <Text fontWeight="font-bold" className="text-md">
            {category}
          </Text>
        </TouchableOpacity>

        <FlatList
          data={subcategories}
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
