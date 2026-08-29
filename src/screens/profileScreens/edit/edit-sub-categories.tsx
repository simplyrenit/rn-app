import { useProfile } from "@/backend/profile";
import { Text, Button } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { useGlobalContext } from "@/context/global-context";
import { RouteProps, Subcategory, useTypedNavigation } from "@/lib/types";
import { useRoute } from "@react-navigation/native";
import { Image } from "expo-image";
import { ActivityIndicator, FlatList, Platform, TouchableOpacity, View } from "react-native";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
} from "react-native-heroicons/outline";
import { heightPercentageToDP as hp } from "react-native-responsive-screen";

import { toast } from "@/lib/toast";
import { ink } from "@/lib/design-tokens";

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
          parent: category,
          title: subcategory.title,
        },
      });

      toast.success("Your product was updated!");
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
          
        >
          {category.title}
        </Text>
      </View>
      {/* Insert Tick Mark Icon here for the SubCategory theyve chosen */}
    </TouchableOpacity>
  );

  return (
    <NonScrollableContainer>
      <View style={{ flex: 1 }}>
        <View className="h-24 items-center justify-center">
          <Text fontSize="text-lg" fontWeight="font-bold">
            Edit Sub Category
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className={`flex-row items-center py-4 border-b px-gutter  ${theme === "dark" ? "border-b-line-dark" : "border-b-line-light"
            }`}
        >
          <View className="mt-1 pr-1 ">
            <ChevronLeftIcon
              className=""
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

        {/* <Button onPress={onPress}>
          {loading ? (
                <ActivityIndicator size="small" color="white" />
          ) : (
            <Text fontWeight="font-bold">Update Category and Subcategory</Text>
          )}
        </Button> */}
      </View>
    </NonScrollableContainer>
  );
}
