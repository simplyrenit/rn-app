import { StaticContainer, Text } from "@/components/core";
import { PostProductHeader } from "@/components/post/header";
import { useGlobalContext } from "@/context/global-context";
import { useProductContext } from "@/context/product-context";
import { RouteProps, Subcategory, useTypedNavigation } from "@/lib/types";
import { useRoute } from "@react-navigation/native";
import { Image } from "expo-image";
import { FlatList, TouchableOpacity, View } from "react-native";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CubeIcon,
} from "react-native-heroicons/outline";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { SvgUri } from "react-native-svg";
import { SCREEN_GUTTER, ink } from "@/lib/design-tokens";
import { CategoryIcon, categoryDisplayName } from "@/lib/category-icons";
import { useTheme } from "@/lib/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function PostSubCategories() {
  const route = useRoute<RouteProps<"PostSubCategories">>();
  const navigation = useTypedNavigation();
  const { theme } = useGlobalContext();
  const { saveDetails } = useProductContext();
  const isDarkMode = theme === "dark";
  const { color } = useTheme();
  const insets = useSafeAreaInsets();

  // Destructure the category and subcategories from route params
  const { category, subcategories } = route.params;

  const onPress = (subcategory: Subcategory) => {
    saveDetails({ subcategory });
    navigation.navigate("AboutProduct");
  };

  const renderItem = ({ item }: { item: Subcategory }) => {
    const icon = theme === "dark" ? item.dark_icon : item.light_icon;

    return <TouchableOpacity
      className="flex-row justify-between items-center py-4"
      onPress={() => onPress(item)}
    >
      <View className="flex-row items-center space-x-5">
        {icon ? (
          icon.slice(-3).toLowerCase() === 'svg' ? (
            <SvgUri
              width={20}
              height={20}
              uri={icon}
            />
          ) : (
            <Image
              source={{ uri: icon }}
              style={{ width: 20, height: 20 }}
            />
          )
        ) : (
          <CategoryIcon name={item.title} size={22} color={color.textBody} />
        )}
        <Text fontSize="text-base">
          {categoryDisplayName(item.title)}
        </Text>
      </View>
      <ChevronRightIcon
        size={20}
        color={ink.text(isDarkMode)}
      />
    </TouchableOpacity>;
  };

  return (
    <NonScrollableContainer>
      <View style={{ flex: 1 }}>
        <PostProductHeader
          heading="Choose a subcategory"
          step={2}
          showBackArrow
        />

        {/* The category you are inside, stated as context rather than as a
            second, differently-shaped back control. */}
        <View
          style={{
            paddingHorizontal: SCREEN_GUTTER,
            paddingBottom: 12,
          }}
        >
          <Text fontSize="text-sm" tone="body">
            In {category}
          </Text>
        </View>

        <FlatList
          data={subcategories}
          renderItem={renderItem}
          keyExtractor={(item) => item.title}
          contentContainerStyle={{
            paddingHorizontal: 24,
            // Clear the floating bottom tab bar so the last subcategory is
            // fully visible and scrollable. iOS only: Android's tab bar does
            // not overlap the list.
            paddingBottom: insets.bottom,
          }}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </NonScrollableContainer>
  );
}
