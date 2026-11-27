import { Button, SubpageHeader, Text } from "@/components/core";
import { Notice } from "@/components/booking/parts";
import { useProfile } from "@/backend/profile";
import { useRefreshDetailsOnFocus } from "@/backend/use-refresh-details";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import ProfilePreAuth from "@/components/profile/pre-auth/profile-pre-auth";
import { useGlobalContext } from "@/context/global-context";
import { SCREEN_GUTTER } from "@/lib/design-tokens";
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
  // The gate below opens once the admin approves: read the status again on each visit.
  useRefreshDetailsOnFocus(merchantNeedsApproval);

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

  const rejected = userDetails?.merchant_approval_status === "rejected";

  return (
    <NonScrollableContainer>
      {authTokens && isAuthenticated ? (
        merchantNeedsApproval ? (
          // The gate (2094:22718 pending, 2094:22770 rejected): the tab title, then the kit Notice card 16 into the
          // content on the 24 gutter, both sentences in its one body; the 52 Primary 16 below it.
          <>
            <SubpageHeader variant="tab-title" title="Post" />
            <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: 16 }}>
              <Notice tone={rejected ? "danger" : "warning"} title="Merchant approval required">
                {`Your merchant account is ${userDetails?.merchant_approval_status}. You can post listings once approval is complete.`}
                {rejected ? "\n\nYour merchant request was rejected. You can request review again." : null}
              </Notice>
              {rejected && (
                <>
                  <Button
                    className="mt-4"
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
          </>
        ) : (
          // Normally unreachable: the tab's `tabPress` listener in nav.tsx
          // opens the listing flow instead of focusing this tab. A navigation
          // straight to MainTabs › Post still lands here, so offer the way in
          // rather than a blank tab — and do not auto-navigate, or Back from
          // the flow would bounce straight back into it.
          // 2094:22828 draws no title but keeps the 56 bar's room, so the button centres in the content below it.
          <View style={{ flex: 1, paddingTop: 56, paddingHorizontal: SCREEN_GUTTER, justifyContent: "center" }}>
            <Button onPress={() => navigation.navigate("ListAddPhotos")}>
              List an item
            </Button>
          </View>
        )
      ) : (
        <>
          <SubpageHeader variant="tab-title" title="Post" />
          <ProfilePreAuth isDarkMode={isDarkMode} />
        </>
      )}
    </NonScrollableContainer>
  );
}
