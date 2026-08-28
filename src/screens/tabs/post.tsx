import { Button, Text } from "@/components/core";
import { useProfile } from "@/backend/profile";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import Skeleton from "@/components/core/skeleton";
import { PostProductHeader } from "@/components/post/header";
import ProfilePreAuth from "@/components/profile/pre-auth/profile-pre-auth";
import { useGlobalContext } from "@/context/global-context";
import { useProductContext } from "@/context/product-context";
import { Category, useTypedNavigation } from "@/lib/types";
import { Image } from "expo-image";
import { useState } from "react";
import { FlatList, Platform, TouchableOpacity, View } from "react-native";
import {
  ChevronRightIcon,
  CubeIcon,
} from "react-native-heroicons/outline";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";
import { SvgUri } from "react-native-svg";

export default function Post() {
  const { saveDetails } = useProductContext();
  const { theme, categories, authTokens, isAuthenticated, userDetails } = useGlobalContext();
  const { requestMerchantReview, loading: profileActionLoading } = useProfile();
  const navigation = useTypedNavigation();
  const isDarkMode = theme === "dark";
  const [requestReviewError, setRequestReviewError] = useState<string | null>(null);
  const merchantNeedsApproval =
    userDetails?.account_type === "merchant" &&
    userDetails?.merchant_approval_status !== "approved";

  const onPress = (cat: Category) => {
    const category = {
      title: cat.title,
      name: cat.title,
      darkIcon: cat.dark_icon || "",
      lightIcon: cat.light_icon || "",
    };
    saveDetails({ category });
    navigation.navigate("PostSubCategories", {
      category: cat.title,
      subcategories: cat.subcategories,
    });
  };

  const renderItem = ({ item }: { item: Category }) => {
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
    </TouchableOpacity>;
  };

  const handleRequestReviewAgain = async () => {
    try {
      setRequestReviewError(null);
      await requestMerchantReview();
    } catch (error: any) {
      setRequestReviewError(
        error?.response?.data?.error ||
          "Unable to request review right now. Please try again."
      );
    }
  };

  return (
    <NonScrollableContainer>
      {authTokens && isAuthenticated ? (
        merchantNeedsApproval ? (
          <View className="flex-1 px-5 pt-6">
            <View
              className={`rounded-2xl border p-4 ${
                isDarkMode ? "border-[#292929] bg-[#0F0F0F]" : "border-[#e6e6e6] bg-white"
              }`}
            >
              <Text fontWeight="font-bold" fontSize="text-lg">
                Merchant approval required
              </Text>
              <Text
                className={`mt-2 ${isDarkMode ? "text-[#FFFFFFB2]" : "text-[#000000B2]"}`}
              >
                Your merchant account is {userDetails?.merchant_approval_status}.
                You can post listings once approval is complete.
              </Text>
              {userDetails?.merchant_approval_status === "rejected" && (
                <>
                  <Text
                    className={`mt-2 ${isDarkMode ? "text-[#FFFFFFB2]" : "text-[#000000B2]"}`}
                  >
                    Your merchant request was rejected. You can request review again.
                  </Text>
                  <Button
                    className="mt-3"
                    onPress={handleRequestReviewAgain}
                    disabled={profileActionLoading}
                  >
                    {profileActionLoading
                      ? "Requesting review..."
                      : "Request review again"}
                  </Button>
                  {requestReviewError && (
                    <Text className="mt-2 text-red-500">{requestReviewError}</Text>
                  )}
                </>
              )}
            </View>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
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
                  // Clear the floating bottom tab bar so the last category is
                  // fully visible and scrollable. iOS only: Android's tab bar
                  // does not overlap the list.
                  paddingBottom: Platform.OS === "ios" ? hp("7") : 0,
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
        )
      ) : (
        <ProfilePreAuth isDarkMode={isDarkMode} />
      )}
    </NonScrollableContainer>
  );
}
