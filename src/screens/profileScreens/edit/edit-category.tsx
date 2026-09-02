import { BackButton, Text } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { PostProductHeader } from "@/components/post/header";
import { useGlobalContext } from "@/context/global-context";
import { useProductContext } from "@/context/product-context";
import { Category, RouteProps, useTypedNavigation } from "@/lib/types";
import { Image } from "expo-image";
import { FlatList, TouchableOpacity, View } from "react-native";
import { ChevronRightIcon } from "react-native-heroicons/outline";
import { CategoryFilter } from "../../../components/search/category-filter";
import { useRoute } from "@react-navigation/native";
import { CategoryIcon, categoryDisplayName } from "@/lib/category-icons";
import { MIN_TOUCH_TARGET, ink } from "@/lib/design-tokens";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function EditCategory() {
  const { theme, categories } = useGlobalContext();
  const navigation = useTypedNavigation();
  const insets = useSafeAreaInsets();

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
        {/* The icon column was reserved and left empty here, while the same
            taxonomy carried photographs on Home and identical cubes in the
            listing flow. One glyph family, everywhere. */}
        <CategoryIcon
          name={item.title}
          size={22}
          color={ink.body(theme === "dark")}
        />
        <Text fontSize="text-base">
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
        <View className="flex-row items-center justify-between">
          <View style={{ width: MIN_TOUCH_TARGET }}>
            <BackButton />
          </View>
          <View className="flex-1 items-center">
            <Text role="sectionTitle" fontSize="text-lg">
              Edit Category
            </Text>
          </View>
          <View style={{ width: MIN_TOUCH_TARGET }} />
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
