import { Text } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { useGlobalContext } from "@/context/global-context";
import { RouteProps, Subcategory, useTypedNavigation } from "@/lib/types";
import { useRoute } from "@react-navigation/native";
import { Image } from "expo-image";
import { FlatList, Platform, TouchableOpacity, View } from "react-native";
import {
  ArrowLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "react-native-heroicons/outline";
import { ink } from "@/lib/design-tokens";
import { CategoryIcon, categoryDisplayName } from "@/lib/category-icons";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";

export default function UnavailabilitySubCatScreen() {
  const route = useRoute<RouteProps<"UnavailabilitySubCat">>();
  const navigation = useTypedNavigation();
  const { theme } = useGlobalContext();
  // const { saveDetails } = useProductContext();
  const router = useTypedNavigation();

  // Destructure the category and subcategories from route params
  const { category, subcategories } = route.params;

  const onPress = (subcategory: Subcategory) => {
    navigation.navigate("unavailabilityFormInputs", {
      category,
      subcategory: subcategory.title,
    });
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
          
        >
          {categoryDisplayName(item.title)}
        </Text>
      </View>
      <ChevronRightIcon
        size={20}
        color={ink.text(theme === "dark")}
      />
    </TouchableOpacity>
  );

  return (
    <NonScrollableContainer>
      <View style={{ flex: 1 }}>
        <View
          className="flex-row items-center justify-between px-gutter "
          style={{ paddingVertical: wp("5%") }}
        >
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back"
            onPress={() => router.goBack()}
            className="flex-1 items-start w-[10%]"
          >
            <ArrowLeftIcon
              size={26}
              color={ink.text(theme === "dark")}
            />
          </TouchableOpacity>
          <View className="items-center justify-center w-[80%]">
            <Text fontSize="text-xl" fontWeight="font-bold">
              Request an item
            </Text>
          </View>

          <View className="w-[10%]"></View>
        </View>
        <View className="px-gutter py-3">
          <Text fontSize="text-base" fontWeight="font-bold">
            Choose a SubCategory
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className={`flex-row items-center py-4 border-b px-gutter ${
            theme === "dark" ? "border-b-line-dark" : "border-b-line-light"
          }`}
        >
          <View className="mt-1 pr-1 ">
            <ChevronLeftIcon
              size={24}
              color={ink.text(theme === "dark")}
            />
          </View>
          <Text fontWeight="font-bold" fontSize="text-md">
            {category}
          </Text>
        </TouchableOpacity>

        <FlatList
          data={subcategories}
          renderItem={renderItem}
          keyExtractor={(item) => item.title}
          contentContainerStyle={{
            paddingHorizontal: 24,
            // Clear the floating bottom tab bar so the last row is fully
            // visible and scrollable. iOS only: Android's tab bar does not
            // overlap the list.
            paddingBottom: Platform.OS === "ios" ? hp("14%") : 0,
          }}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </NonScrollableContainer>
  );
}
