import { Text } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import IconButton from "@/components/profile/post-auth/profile-icon-button";
import { BackendProduct, RouteProps, useTypedNavigation } from "@/lib/types";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useRoute } from "@react-navigation/native";
import { Image } from "expo-image";
import { useRef, useState } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { ArrowLeftIcon, TrashIcon } from "react-native-heroicons/outline";
import * as React from "react";
import CustomBottomSheetModal from "@/components/core/custom-bottom-sheet-modal";
import { useGlobalContext } from "@/context/global-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import { useProfile } from "@/backend/profile";
import { useFocusEffect } from "@react-navigation/native";
import * as Progress from "react-native-progress";
import { Dimensions } from "react-native";

const { height } = Dimensions.get("window");

const EditProductScreen: React.FC = () => {
  const route = useRoute<RouteProps<"editProduct">>();
  const { theme } = useGlobalContext();
  const navigation = useTypedNavigation();

  const isDarkMode = theme === "dark";
  const router = useTypedNavigation();
  const { id } = route.params;
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const openBottomSheet = () => {
    bottomSheetRef.current?.present();
  };
  const [product, setProduct] = useState<BackendProduct | null>(null);
  const { getMyProductDetails, deleteMyProduct, loading } = useProfile();

  const getProductDetails = async () => {
    const product = await getMyProductDetails(id);

    setProduct(product);
  };

  useFocusEffect(
    React.useCallback(() => {
      getProductDetails();
    }, [])
  );

  const handleDelete = async () => {
    await deleteMyProduct(id);
    navigation.navigate("myProducts");
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NonScrollableContainer height={height > 700 ? 105 : 100}>
        <View className="flex-row items-center justify-between px-5 py-2">
          <TouchableOpacity
            onPress={() => router.goBack()}
            className="flex-1 items-start w-[10%]"
          >
            <ArrowLeftIcon
              size={26}
              color={isDarkMode ? "#FFF" : "#000"}
            />
          </TouchableOpacity>
          <View className="items-center justify-center w-[80%]">
            <Text
              fontSize="text-xl"
              fontWeight="font-bold"
            >
              Edit product
            </Text>
          </View>

          <View className="w-[10%]"></View>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
        >
          {product ? (
            <>
              <View
                className={`flex-row px-5 gap-5 py-4 border-b-[0.2px]  ${
                  isDarkMode ? "border-b-[#292929]" : "border-b-[#E6E6E6]"
                }`}
              >
                <View className="py-4 flex-1 ">
                  <Image
                    className="rounded-[16px]"
                    source={{ uri: product.cover_image }}
                    style={{ width: wp("40%"), height: wp("40%") }}
                  />
                </View>

                <View className="py-4 justify-between flex-1">
                  <View className="gap-y-[0.5]">
                    <Text
                      fontSize="text-lg"
                      fontWeight="font-bold"
                    >
                      {product.title}
                    </Text>
                    <Text
                      fontSize="text-sm"
                      className="text-gray-500"
                    >
                      {product.location}
                    </Text>
                    <View className="flex-row gap-1">
                      <Text
                        fontSize="text-sm"
                        fontWeight="font-bold"
                      >
                        ₹{Number(product.rate).toFixed(0)}
                      </Text>
                      <Text className="text-gray-500">per day</Text>
                    </View>
                  </View>
                  <View>
                    <TouchableOpacity
                      onPress={openBottomSheet}
                      className={`flex-row justify-center space-x-1 items-center border rounded-2xl h-11 ${
                        isDarkMode
                          ? "border-[#292929] text-white bg-[#1a1a1a]"
                          : "border-[#E6E6E6] text-black bg-white"
                      }`}
                    >
                      <TrashIcon
                        size={20}
                        color={"#E50914"}
                      />
                      <Text
                        fontSize="text-sm"
                        fontWeight="font-bold"
                        className="text-[#E50914]"
                      >
                        Delete
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
              <View className="px-4 py-0">
                <IconButton
                  onPress={() =>
                    navigation.navigate("EditProductAvailability", {
                      dates_blocked: product.booked!,
                      name: product.name,
                    })
                  }
                  leftIcon="CalendarIcon"
                  text="Availability"
                  isDarkMode={isDarkMode}
                />
                <IconButton
                  onPress={() =>
                    navigation.navigate("EditCategory", {
                      name: product.name,
                    })
                  }
                  leftIcon="ClipboardDocumentIcon"
                  text="Category"
                  isDarkMode={isDarkMode}
                />
                <IconButton
                  onPress={() =>
                    navigation.navigate("EditAboutProduct", {
                      data: product,
                    })
                  }
                  leftIcon="DocumentTextIcon"
                  text="Product Details"
                  isDarkMode={isDarkMode}
                />
                <IconButton
                  onPress={() =>
                    navigation.navigate("EditProductImages", {
                      images: product.images,
                      name: product.name,
                    })
                  }
                  leftIcon="Square3Stack3DIcon"
                  text="Product Images"
                  isDarkMode={isDarkMode}
                />
              </View>
            </>
          ) : (
            <View className="flex-1 items-center justify-center">
              <Text className="text-lg font-bold text-gray-400">
                Product not found!
              </Text>
            </View>
          )}
        </ScrollView>
      </NonScrollableContainer>

      <CustomBottomSheetModal
        ref={bottomSheetRef}
        snapPoints={["40%"]}
        isDark={isDarkMode}
      >
        <View className="flex items-center mb-4">
          <Text
            fontSize="text-xl"
            fontWeight="font-bold"
          >
            Delete product
          </Text>
        </View>
        {product && (
          <>
            <View className="flex-row px-5 gap-5 ">
              <View className="py-4 ">
                <Image
                  className="rounded-3xl"
                  source={{ uri: product.cover_image }}
                  style={{ width: wp("20%"), height: wp("20%") }}
                />
              </View>

              <View className="py-4 justify-between items-center">
                <View>
                  <Text
                    fontSize="text-lg"
                    fontWeight="font-bold"
                  >
                    {product.title}
                  </Text>
                  <Text
                    fontSize="text-sm"
                    className="text-gray-500"
                  >
                    {product.location}
                  </Text>
                  <View className="flex-row items-center mt-1 space-x-1">
                    <Text
                      fontSize="text-base"
                      fontWeight="font-bold"
                    >
                      ₹{Number(product.rate).toFixed(0)}
                    </Text>
                    <Text className="text-gray-500">per day</Text>
                  </View>
                </View>
              </View>
            </View>
          </>
        )}
        <View className="flex-row justify-between mt-6 gap-x-2 px-2">
          <TouchableOpacity
            onPress={() => bottomSheetRef.current?.close()}
            className={`border rounded-[12px] flex-1 items-center justify-center p-3  ${
              isDarkMode
                ? "border-[#292929] text-white bg-[#1a1a1a]"
                : "border-[#E6E6E6] text-black bg-white"
            }`}
          >
            <Text
              fontWeight="font-bold"
              fontSize="text-base"
              className="text-center"
            >
              Cancel
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleDelete}
            className="bg-[#E50914] p-3 rounded-[12px] flex-1  flex-row items-center justify-center"
          >
            {loading ? (
              <Progress.CircleSnail
                color={"white"}
                size={22}
              />
            ) : (
              <Text
                fontWeight="font-bold"
                fontSize="text-base"
                className="text-center"
              >
                Delete
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </CustomBottomSheetModal>
    </GestureHandlerRootView>
  );
};

export default EditProductScreen;
