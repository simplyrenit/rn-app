import { useProfile } from "@/backend/profile";
import { Text, Button } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { useGlobalContext } from "@/context/global-context";
import { RouteProps, Subcategory, useTypedNavigation } from "@/lib/types";
import { useRoute } from "@react-navigation/native";
import { Image } from "expo-image";
import { FlatList, Platform, TouchableOpacity, View } from "react-native";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
} from "react-native-heroicons/outline";
import { heightPercentageToDP as hp } from "react-native-responsive-screen";
import * as Progress from "react-native-progress";
import Toast from "react-native-toast-message";

export default function EditSubCategories() {
  const route = useRoute<RouteProps<"EditSubCategories">>();
  const navigation = useTypedNavigation();
  const { theme } = useGlobalContext();
  const { name, category, subcategories } = route.params;
  const { updateMyProductDetails, loading } = useProfile();

  const onPress = async (subcategory: Subcategory) => {
    try {
      const response = await updateMyProductDetails(name, {
        category: {
          parent: category as unknown as { title: string },
          title: subcategory.title,
        },
      });

      Toast.show({
        type: "customToast",
        position: "bottom",
        text1: "Your product was updated!",
        text2: "success",
        visibilityTime: 4000,
        autoHide: true,
        bottomOffset: 20,
      });
      navigation.navigate("editProduct", { id: name });
    } catch (error) {
      console.error("Failed to update product details:", error);
    }
  };

  const renderItem = ({ item: category }: { item: Subcategory }) => (
    <TouchableOpacity
      className="flex-row justify-between items-center py-4"
      onPress={() => onPress(category)}
    >
      <View className="flex-row items-center space-x-5">
        <Image
          source={{
            uri:
              theme === "dark"
                ? category.dark_icon || ""
                : category.light_icon || "",
          }}
          style={{ width: 20, height: 20 }}
        />
        <Text
          fontSize="text-base"
          className={`${theme === "dark" ? "text-white" : "text-black"}`}
        >
          {category.title}
        </Text>
      </View>
      {/* Insert Tick Mark Icon here for the SubCategory theyve chosen */}
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
        <View className="h-24 items-center justify-center">
          <Text fontSize="text-lg" fontWeight="font-bold">
            Edit Sub Category
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className={`flex-row items-center py-4 border-b px-5  ${theme === "dark" ? "border-b-[#292929]" : "border-b-[#e6e6e6]"
            }`}
        >
          <View className="mt-1 pr-1 ">
            <ChevronLeftIcon
              className=""
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

        {/* <Button onPress={onPress}>
          {loading ? (
                <Progress.CircleSnail color={"white"} size={22} />
          ) : (
            <Text fontWeight="font-bold">Update Category and Subcategory</Text>
          )}
        </Button> */}
      </View>
    </NonScrollableContainer>
  );
}
