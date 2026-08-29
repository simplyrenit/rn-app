import { Button, Text } from "@/components/core";
import { useProfile } from "@/backend/profile";
import { useGlobalContext } from "@/context/global-context";
import { useTypedNavigation } from "@/lib/types";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import React, { useRef, useState } from "react";
import { TouchableOpacity, View } from "react-native";
import IconButton from "./profile-icon-button";
import ProfileImgContainer from "./profile-img";
import AppearanceSheet from "./sheets/AppearanceSheet";
import { CurrencySheet } from "./sheets/currency-sheet";
import PersonalDetailsSheet from "./sheets/PersonaldetailsSheet";
import { density } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";

interface ProfilePostAuthProps {
  isDarkMode: boolean;
  handleLogout: () => void;
}

const ProfilePostAuth: React.FC<ProfilePostAuthProps> = ({
  isDarkMode,
  handleLogout,
}) => {
  const router = useTypedNavigation();
  const { theme, userDetails } = useGlobalContext();
  const { requestMerchantReview, loading: profileActionLoading } = useProfile();
  const isDark = theme === "dark";
  const isMerchant = userDetails?.account_type === "merchant";
  const merchantStatus = userDetails?.merchant_approval_status;
  const [requestReviewError, setRequestReviewError] = useState<string | null>(null);
  const appearanceSheetRef = useRef<BottomSheetModal>(null);
  const personalDetailsSheetRef = useRef<BottomSheetModal>(null);
  const currencySheetRef = useRef<BottomSheetModal>(null);
  const { color } = useTheme();

  const sectionStyle = {
    // Three group headers introduced one row each; header, padding and row cost
    // 150pt to expose a single link.
    paddingTop: density.sectionHeaderGap + 4,
    paddingBottom: density.sectionHeaderGap,
    borderBottomWidth: 1,
    borderBottomColor: color.line,
  } as const;


  const handleCurrencyModal = () => {
    currencySheetRef.current?.present();
  };

  const handleAppeareanceModal = () => {
    appearanceSheetRef.current?.present();
  };

  const handlePersonalDetailsSheetPress = () => {
    personalDetailsSheetRef.current?.present();
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
    <>
      <View className="">
        <View
          style={{ borderBottomWidth: 1, borderBottomColor: color.line }}
        >
          <View className="px-gutter">
            <ProfileImgContainer
              isDarkMode={isDarkMode}
              handlePersonalDetailsSheetPress={handlePersonalDetailsSheetPress}
            />
            {isMerchant && (
              <View
                className={`mb-4 rounded-card border px-3 py-2 ${
                  isDark ? "border-line-dark bg-surface-dark" : "border-line-light bg-surface-light"
                }`}
              >
                <Text fontWeight="font-semibold">
                  Merchant status: {merchantStatus}
                </Text>
                {merchantStatus !== "approved" && (
                  <Text
                    className={`mt-1 ${isDark ? "text-muted-dark" : "text-muted-light"}`}
                  >
                    Listings will be enabled after merchant approval.
                  </Text>
                )}
                {merchantStatus === "rejected" && (
                  <>
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
            )}
          </View>
        </View>

        {/* Account */}
        <View
          style={sectionStyle}
        >
          <View className="px-gutter">
            <Text
              fontSize="text-xs"
              fontWeight="font-semibold"
              tone="dim"
              accessibilityRole="header"
              className="pb-2"
              style={{ letterSpacing: 0.6 }}
            >
              Account
            </Text>
            <IconButton
              onPress={() => {
                router.navigate("myProducts");
              }}
              leftIcon="Squares2X2Icon"
              text="My listings"
              divider={false}
              isDarkMode={isDarkMode}
            />
          </View>
        </View>

        {/* App */}
        <View
          style={sectionStyle}
        >
          <View className="px-gutter">
            <Text
              fontSize="text-xs"
              fontWeight="font-semibold"
              tone="dim"
              accessibilityRole="header"
              className="pb-2"
              style={{ letterSpacing: 0.6 }}
            >
              App
            </Text>
            <IconButton
              onPress={handleAppeareanceModal}
              leftIcon="MoonIcon"
              text="Appearance"
              divider={false}
              isDarkMode={isDarkMode}
            />
            {/* <IconButton
              onPress={handleCurrencyModal}
              leftIcon="BanknotesIcon"
              text="Currency"
              isDarkMode={isDarkMode}
            /> */}
          </View>
        </View>

        {/* Support */}
        <View
          style={sectionStyle}
        >
          <View className="px-gutter">
            <Text
              fontSize="text-xs"
              fontWeight="font-semibold"
              tone="dim"
              accessibilityRole="header"
              className="pb-2"
              style={{ letterSpacing: 0.6 }}
            >
              Support
            </Text>
            <IconButton
              onPress={() => {
                router.navigate("faq");
              }}
              leftIcon="QuestionMarkCircleIcon"
              text="FAQs"
              isDarkMode={isDarkMode}
            />
            <IconButton
              onPress={() => {
                router.navigate("ReportAProblem");
              }}
              leftIcon="ExclamationTriangleIcon"
              text="Report a problem"
              isDarkMode={isDarkMode}
            />
            <IconButton
              onPress={() => {
                router.navigate("feedback");
              }}
              leftIcon="ChatBubbleLeftEllipsisIcon"
              text="Send feedback"
              isDarkMode={isDarkMode}
            />
            <IconButton
              onPress={() => {
                router.navigate("contactUs");
              }}
              leftIcon="EnvelopeIcon"
              text="Contact us"
              isDarkMode={isDarkMode}
            />
            <IconButton
              onPress={() => {
                router.navigate("whoWeAre");
              }}
              leftIcon="UsersIcon"
              text="Who we are"
              isDarkMode={isDarkMode}
            />
            <IconButton
              onPress={() => {
                router.navigate("unavailabilityFormCategories");
              }}
              leftIcon="InboxArrowDownIcon"
              text="Request an item"
              isDarkMode={isDarkMode}
            />
          </View>
        </View>

        {/* <Legal */}
        <View style={sectionStyle}>
          <View className="px-gutter">
            <Text
              fontSize="text-xs"
              fontWeight="font-semibold"
              tone="dim"
              accessibilityRole="header"
              className="pb-2"
              style={{ letterSpacing: 0.6 }}
            >
              Legal
            </Text>
            <IconButton
              onPress={() => {
                router.navigate("Terms");
              }}
              leftIcon="DocumentTextIcon"
              text="Terms & conditions"
              isDarkMode={isDarkMode}
            />
            <IconButton
              onPress={() => {
                router.navigate("Privacy");
              }}
              leftIcon="LockClosedIcon"
              text="Privacy policy"
              divider={false}
              isDarkMode={isDarkMode}
            />
          </View>
        </View>

        {/* Its own group. Log out is a row like every other row — red is
            reserved for destructive, irreversible actions and signing out is
            neither — but it sat inside "Legal", under a heading that did not
            describe it and with no separator above it. */}
        <View style={{ ...sectionStyle, marginBottom: 64 }}>
          <View className="px-gutter">
            <IconButton
              onPress={handleLogout}
              leftIcon="ArrowRightStartOnRectangleIcon"
              text="Log out"
              divider={false}
              rightIcon={<View />}
            />
          </View>
        </View>

        <CurrencySheet
          bottomSheetModalRef={currencySheetRef}
          isDarkMode={isDarkMode}
        />

        <AppearanceSheet
          bottomSheetModalRef={appearanceSheetRef}
          isDarkMode={isDarkMode}
        />

        <PersonalDetailsSheet
          bottomSheetModalRef={personalDetailsSheetRef}
          isDarkMode={isDarkMode}
        />
      </View>
    </>
  );
};

export default ProfilePostAuth;
