import { Button, Text } from "@/components/core";
import { useProfile } from "@/backend/profile";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import Skeleton from "@/components/core/skeleton";
import { PostProductHeader } from "@/components/post/header";
import { TaxonomyList } from "@/components/post/taxonomy-list";
import ProfilePreAuth from "@/components/profile/pre-auth/profile-pre-auth";
import { useGlobalContext } from "@/context/global-context";
import { useProductContext } from "@/context/product-context";
import { Category, useTypedNavigation } from "@/lib/types";
import { useState } from "react";
import { FlatList, useWindowDimensions, View } from "react-native";
import { radius } from "@/lib/design-tokens";

export default function Post() {
  const { saveDetails } = useProductContext();
  const { theme, categories, authTokens, isAuthenticated, userDetails } = useGlobalContext();
  const { requestMerchantReview, loading: profileActionLoading } = useProfile();
  const navigation = useTypedNavigation();
  const isDarkMode = theme === "dark";
  const { width: winW } = useWindowDimensions();
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
          <View className="flex-1 px-gutter pt-6">
            <View
              className={`rounded-group border p-4 ${
                isDarkMode ? "border-line-dark bg-surface-dark" : "border-line-light bg-surface-light"
              }`}
            >
              <Text fontWeight="font-bold" fontSize="text-lg">
                Merchant approval required
              </Text>
              <Text
                className={`mt-2 ${isDarkMode ? "text-muted-dark" : "text-muted-light"}`}
              >
                Your merchant account is {userDetails?.merchant_approval_status}.
                You can post listings once approval is complete.
              </Text>
              {userDetails?.merchant_approval_status === "rejected" && (
                <>
                  <Text
                    className={`mt-2 ${isDarkMode ? "text-muted-dark" : "text-muted-light"}`}
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
                    <Text tone="danger" className="mt-2">{requestReviewError}</Text>
                  )}
                </>
              )}
            </View>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <View>
              {
                categories.length ?
                  <PostProductHeader
                    step={1}
                    heading="Choose a category"
                    showBackArrow={false}
                  /> :
                  <View className="mt-2 space-y-2 align-center" style={{ alignItems: 'center' }}>
                    <Skeleton
                      style={{
                        width: winW * 0.30,
                        borderRadius: radius.button,
                        marginTop: 5,
                        height: 10,
                      }}
                    />
                    <Skeleton style={{
                      width: winW * 0.05,
                      borderRadius: radius.button,
                      height: 4,
                    }} />
                  </View>
              }
            </View>

            {categories.length ?

              <TaxonomyList items={categories} onSelect={onPress} /> : <FlatList

                data={Array.from({ length: 12 })}
                renderItem={({ item, index }) => (
                  <View className="p-6 flex-row space-x-4">
                    <Skeleton style={{
                      width: 16,
                      borderRadius: radius.button,
                      height: 10,
                    }} />

                    <Skeleton style={{
                      flex: 1,
                      borderRadius: radius.button,
                      height: 10,
                    }} />
                    <View>
                      <View style={{ height: 12 }} />
                      <Skeleton style={{
                        width: 16,
                        borderRadius: radius.button,
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
