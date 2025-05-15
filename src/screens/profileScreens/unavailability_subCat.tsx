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
        <View
          className="flex-row items-center justify-between px-5 "
          style={{ paddingVertical: wp("5%") }}
        >
          <TouchableOpacity
            onPress={() => router.goBack()}
            className="flex-1 items-start w-[10%]"
          >
            <ArrowLeftIcon
              size={20}
              color={`${theme === "dark" ? "#fff" : "#000"}`}
            />
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
            Choose a SubCategory
          </Text>
        </View>

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
