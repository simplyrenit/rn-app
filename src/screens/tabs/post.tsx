import { Button, Text } from "@/components/core";
import { useProfile } from "@/backend/profile";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import ProfilePreAuth from "@/components/profile/pre-auth/profile-pre-auth";
import { useGlobalContext } from "@/context/global-context";
import { useTypedNavigation } from "@/lib/types";
import { useState } from "react";
import { View } from "react-native";

export default function Post() {
  const { theme, authTokens, isAuthenticated, userDetails } = useGlobalContext();
  const { requestMerchantReview, loading: profileActionLoading } = useProfile();
  const navigation = useTypedNavigation();
  const isDarkMode = theme === "dark";
  const [requestReviewError, setRequestReviewError] = useState<string | null>(null);
  const merchantNeedsApproval =
    userDetails?.account_type === "merchant" &&
    userDetails?.merchant_approval_status !== "approved";

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
          // Normally unreachable: the tab's `tabPress` listener in nav.tsx
          // opens the listing flow instead of focusing this tab. A navigation
          // straight to MainTabs › Post still lands here, so offer the way in
          // rather than a blank tab — and do not auto-navigate, or Back from
          // the flow would bounce straight back into it.
          <View className="flex-1 px-gutter justify-center">
            <Button onPress={() => navigation.navigate("ListAddPhotos")}>
              List an item
            </Button>
          </View>
        )
      ) : (
        <ProfilePreAuth isDarkMode={isDarkMode} />
      )}
    </NonScrollableContainer>
  );
}
