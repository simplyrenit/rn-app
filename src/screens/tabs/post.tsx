import { Text } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import Skeleton from "@/components/core/skeleton";
import { PostProductHeader } from "@/components/post/header";
import ProfilePreAuth from "@/components/profile/pre-auth/profile-pre-auth";
import { useGlobalContext } from "@/context/global-context";
import { useProductContext } from "@/context/product-context";
import { Category, useTypedNavigation } from "@/lib/types";
import { Image } from "expo-image";
import { FlatList, Platform, TouchableOpacity, View } from "react-native";
import {
  ArrowLeftIcon,
  ChevronRightIcon,
  CubeIcon,
} from "react-native-heroicons/outline";
import { heightPercentageToDP, heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";
import { SvgUri } from "react-native-svg";

export default function Post() {
  const { saveDetails } = useProductContext();
  const { theme, categories, authTokens, isAuthenticated } = useGlobalContext();
  const navigation = useTypedNavigation();
  const isDarkMode = theme === "dark";

  const onPress = (cat: Category) => {
    const category = {
      title: cat.title,
      dark_icon: cat.dark_icon,
      light_icon: cat.light_icon,
      subcategories: cat.subcategories,
    };
    saveDetails({ category });
    navigation.navigate("PostSubCategories", {
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
        {item.dark_icon || item.light_icon ? (
          <SvgUri
            width={20}
            height={20}
            uri={theme === "dark" ? item.dark_icon : item.light_icon}
          />
        ) : (
          <CubeIcon
            color={isDarkMode ? "white" : "black"}
            size={24}
          />
        )}
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
      {authTokens && isAuthenticated ? (
        <View
          style={{
            paddingBottom: Platform.OS === "ios" ? hp("7") : hp("0%"),
            flex: Platform.OS === "ios" ? 0 : 1,
          }}
        >
          <View className="flex-row items-center justify-between">
            {
              categories.length ?
                <PostProductHeader
                  percentage={10}
                  heading="Choose a category"
                  showBackArrow={false}
                /> :
                <View className="mt-2 gap-2 align-center" style={{ alignItems: 'center' }}>
                  <Skeleton
                    style={{
                      width: wp(30),
                      borderRadius: 8,
                      marginTop: 5,
                      height: 10,
                    }}
                  />
                  <Skeleton style={{
                    width: wp(5),
                    borderRadius: 8,
                    height: 4,
                  }} />
                </View>
            }
            <View className="w-[10%]"></View>
          </View>

          {categories.length ?

            <FlatList
              data={categories}
              renderItem={renderItem}
              keyExtractor={(item) => item.title}
              contentContainerStyle={{
                paddingHorizontal: 24,
              }}
              showsVerticalScrollIndicator={false}
            /> : <FlatList

              data={Array.from({ length: 12 })}
              renderItem={({ item, index }) => (
                <View className="p-6 flex-row gap-4">
                  <Skeleton style={{
                    width: 16,
                    borderRadius: 8,
                    height: 10,
                  }} />

                  <Skeleton style={{
                    flex: 1,
                    borderRadius: 8,
                    height: 10,
                  }} />
                  <View>
                    <View style={{ height: 12 }} />
                    <Skeleton style={{
                      width: 16,
                      borderRadius: 8,
                      height: 6,
                      marginLeft: 24,
                      alignSelf: 'flex-end',
                      marginTop: 8,
                    }} />
                  </View>

                </View>
              )}
            />
          }
        </View>
      ) : (
        <ProfilePreAuth isDarkMode={isDarkMode} />
      )}
    </NonScrollableContainer>
  );
}
