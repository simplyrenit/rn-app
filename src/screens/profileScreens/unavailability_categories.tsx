import { BackButton, Text } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { useGlobalContext } from "@/context/global-context";
import { useProductContext } from "@/context/product-context";
import { Category, useTypedNavigation } from "@/lib/types";
import { Image } from "expo-image";
import { useEffect } from "react";
import { FlatList, TouchableOpacity, View } from "react-native";
import { ChevronRightIcon } from "react-native-heroicons/outline";
import { ink, MIN_TOUCH_TARGET, SCREEN_GUTTER } from "@/lib/design-tokens";
import { CategoryIcon, categoryDisplayName } from "@/lib/category-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function UnavailabilityCategories() {
  const { saveDetails } = useProductContext();
  const { theme, categories } = useGlobalContext();
  const router = useTypedNavigation();
  const isDarkMode = theme === "dark";
  const insets = useSafeAreaInsets();

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
          className="flex-row items-center px-gutter"
          style={{ paddingVertical: SCREEN_GUTTER }}
        >
          <BackButton />
          <View className="flex-1 items-center justify-center">
            <Text role="sectionTitle" fontWeight="font-bold">
              Request an item
            </Text>
          </View>
          <View style={{ width: MIN_TOUCH_TARGET }} />
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
            paddingBottom: insets.bottom,
          }}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </NonScrollableContainer>
  );
}
