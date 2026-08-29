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
import { ink } from "@/lib/design-tokens";
import { CategoryIcon, categoryDisplayName } from "@/lib/category-icons";
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
        {/* The icon column was reserved and left empty here, while the same
            taxonomy carried photographs on Home and identical cubes in the
            listing flow. One glyph family, everywhere. */}
        <CategoryIcon
          name={item.title}
          size={22}
          color={ink.body(isDarkMode)}
        />
        <Text
          fontSize="text-base"
          
        >
          {categoryDisplayName(item.title)}
        </Text>
      </View>
      <ChevronRightIcon
        size={20}
        color={ink.text(isDarkMode)}
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
              color={ink.text(isDarkMode)}
            />
          </TouchableOpacity>
          <View className="items-center justify-center w-[80%]">
            <Text
              fontSize="text-xl"
              fontWeight="font-bold"
            >
              Request an item
            </Text>
          </View>

          <View className="w-[10%]"></View>
        </View>
        <View className="px-gutter py-3">
          <Text
            fontSize="text-base"
            fontWeight="font-bold"
          >
            Choose a category
          </Text>
        </View>

        <FlatList
          data={categories}
          renderItem={renderItem}
          keyExtractor={(item) => item.title}
          contentContainerStyle={{
            paddingHorizontal: 24,
            // Clear the floating bottom tab bar so the last row is fully
            // visible and scrollable. iOS only: Android's tab bar does not
            // overlap the list.
            paddingBottom: Platform.OS === "ios" ? hp("7") : 0,
          }}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </NonScrollableContainer>
  );
}
