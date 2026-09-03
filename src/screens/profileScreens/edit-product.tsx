import { BackButton, EmptyState, Text } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import IconButton from "@/components/profile/post-auth/profile-icon-button";
import { BackendProduct, RouteProps, useTypedNavigation } from "@/lib/types";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useRoute } from "@react-navigation/native";
import { Image } from "expo-image";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { TrashIcon } from "react-native-heroicons/outline";
import * as React from "react";
import CustomBottomSheetModal from "@/components/core/custom-bottom-sheet-modal";
import { useGlobalContext } from "@/context/global-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useProfile } from "@/backend/profile";
import { useFocusEffect } from "@react-navigation/native";

import { useGetMyDetails } from "@/services/userQueries";
import { MIN_TOUCH_TARGET, ink } from "@/lib/design-tokens";
import { toast } from "@/lib/toast";


const EditProductScreen: React.FC = () => {
  const route = useRoute<RouteProps<"editProduct">>();
  const { theme } = useGlobalContext();
  const navigation = useTypedNavigation();

  const isDarkMode = theme === "dark";
  const router = useTypedNavigation();
  const { id } = route.params;
  const { width: winW } = useWindowDimensions();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const openBottomSheet = () => {
    bottomSheetRef.current?.present();
  };
  const [product, setProduct] = useState<BackendProduct | null>(null);
  const { getMyProductDetails, deleteMyProduct, loading } = useProfile();
  const { data: userData } = useGetMyDetails()
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
    toast.success("Your product was deleted!");
    navigation.navigate("myProducts");
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NonScrollableContainer>
        <View className="flex-row items-center justify-between px-gutter py-2 pt-4">
          <View style={{ width: MIN_TOUCH_TARGET }}>
            <BackButton onPress={() => router.goBack()} />
          </View>
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text role="screenTitle">Edit product</Text>
          </View>
          <View style={{ width: MIN_TOUCH_TARGET }} />
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
        >
          {/* The product fetch used to leave this screen either blank or
              reading "Product not found" while it was still in flight — a
              network wait with no acknowledgement reads as a dead screen. */}
          {loading && !product ? (
            <View className="flex-1 items-center justify-center py-20">
              <ActivityIndicator size="large" color={ink.brandText(isDarkMode)} />
            </View>
          ) : product ? (
            <>
              <View
                className={`flex-row px-gutter space-x-5 py-4 border-b-[0.2px]  ${isDarkMode ? "border-b-line-dark" : "border-b-line-light"
                  }`}
              >
                <View className="py-0 flex-1 ">
                  <Image
                    className="rounded-group"
                    source={{ uri: product.cover_image }}
                    style={{ width: winW * 0.4, height: winW * 0.4 }}
                  />
                </View>

                <View className="py-0 justify-between flex-1">
                  <View style={{ gap: 2 }}>
                    <Text
                      fontSize="text-lg"
                      fontWeight="font-bold"
                    >
                      {product.title}
                    </Text>
                    <Text tone="body"
                      fontSize="text-sm"
                    >
                      {product.location}
                    </Text>
                    <View className="flex-row space-x-1">
                      <Text
                        fontSize="text-sm"
                        fontWeight="font-bold"
                      >
                        ₹{Number(product.rate).toFixed(0)}
                      </Text>
                      <Text tone="body">per day</Text>
                    </View>
                  </View>
                  <View>
                    <TouchableOpacity
                      onPress={openBottomSheet}
                      className={`flex-row justify-center space-x-1 items-center border rounded-group h-11 mt-2 ${isDarkMode
                        ? "border-line-dark bg-surface-dark"
                        : "border-line-light bg-surface-light"
                        }`}
                    >
                      <TrashIcon
                        size={20}
                        color={ink.danger(isDarkMode)}
                      />
                      <Text fontSize="text-sm" fontWeight="font-bold">
                        Delete
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
              <View className="px-gutter py-0">
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
                      data: { ...product, isOwnerContact: `${userData?.first_name} ${userData?.last_name}` === product.contact_name && userData?.phone === product.contact_number },
                    })
                  }
                  leftIcon="DocumentTextIcon"
                  text="Product Details"
                  isDarkMode={isDarkMode}
                />
                <IconButton
                  onPress={() => {
                    navigation.navigate("EditProductImages", {
                      images: product.images,
                      name: product.name,
                      coverImage: product.cover_image,
                    })
                  }
                  }
                  leftIcon="AdjustmentsHorizontalIcon"
                  text="Product Images"
                  isDarkMode={isDarkMode}
                />
                <IconButton
                  onPress={() =>
                    navigation.navigate("EditProductAvailability", {
                      dates_blocked: product.booked!,
                      name: product.name,
                    })
                  }
                  leftIcon="CalendarIcon"
                  text="Unavailability"
                  isDarkMode={isDarkMode}
                />
              </View>
            </>
          ) : (
            <EmptyState variant="error" title="Product not found" />
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
            <View className="flex-row px-gutter space-x-5 ">
              <View className="py-4 ">
                <Image
                  className="rounded-group"
                  source={{ uri: product.cover_image }}
                  style={{ width: winW * 0.2, height: winW * 0.2 }}
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
                  <Text tone="body"
                    fontSize="text-sm"
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
                    <Text tone="body">per day</Text>
                  </View>
                </View>
              </View>
            </View>
          </>
        )}
        <View className="flex-row justify-between mt-6 space-x-2 px-2">
          <TouchableOpacity
            onPress={() => bottomSheetRef.current?.close()}
            className={`border rounded-card flex-1 items-center justify-center p-3  ${isDarkMode
              ? "border-line-dark bg-surface-dark"
              : "border-line-light bg-surface-light"
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
            onPress={() => {
              handleDelete();
            }}
            className="bg-danger-light p-3 rounded-card flex-1  flex-row items-center justify-center"
          >
            {loading ? (
              // No `onDanger` token exists yet; `onBrand` is the nearest
              // available (theme-invariant white), same as the label it
              // stands in for below.
              <ActivityIndicator size="small" color={ink.onBrand()} />
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
